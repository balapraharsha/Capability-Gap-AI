"""
Assessment Engine – Adaptive AI Interview Simulator
Generates questions dynamically until competency coverage >= 80%

CHANGE LOG (progressive scenario chains):
  - start_assessment: initialises a scenarioChain on the session using
    the first question's scenario text and competency.
  - process_answer: detects whether the current answer is part of an
    active chain; if so, calls scenario_chain_synthesizer.advance_chain()
    to produce a complication twist + harder follow-up instead of jumping
    straight to the next competency question.
  - AnswerResponse now includes `complicationText` and `chainStep` fields
    so the frontend can render the progressive scenario arc.
"""

import json
import traceback
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List

from common import (
    _iso_now,
    build_response,
    decimal_to_native,
    generate_question_id,
    generate_session_id,
    get_table,
    parse_body,
)
from competency_tracker import (
    get_next_competency,
    init_tracker,
    should_continue,
    update as tracker_update,
)
from question_synthesizer import synthesize_next_question
from observer_agent import run_observer
from critic_agent import run_critic
from guide_agent import run_guide
from report_generator import generate_report_for_session
from scenario_chain_synthesizer import (
    advance_chain,
    chain_is_complete,
    init_chain,
    is_chain_active,
    should_start_chain,
)


# ---------------------------------------------------
# Helpers
# ---------------------------------------------------

def convert_floats(obj):
    """Recursively convert floats to Decimal for DynamoDB."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: convert_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_floats(v) for v in obj]
    return obj


def derive_competency_score(critic: Dict[str, Any]) -> float:
    metrics = critic.get("metrics", {})
    keys = [
        "analyticalThinking", "problemSolving", "communication",
        "ownership", "adaptability", "decisionMaking",
    ]
    vals = [float(v) for k in keys if (v := metrics.get(k)) is not None]
    if not vals:
        return 0.5
    return max(0.0, min(1.0, sum(vals) / len(vals) / 5.0))


# ---------------------------------------------------
# Start Assessment
# ---------------------------------------------------

def start_assessment(user_id: str, role: str, level: str):
    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    session_id = generate_session_id()
    tracker = init_tracker(role)
    next_comp = get_next_competency(tracker)

    question = synthesize_next_question(
        role=role,
        level=level,
        target_competency=next_comp,
        remaining_competencies=tracker["remaining"],
        previous_answers=[],
    )

    question_id = question.get("id") or generate_question_id()
    question["questionId"] = question_id
    question["order"] = 0
    question["chainStep"] = 0  # first step of potential chain

    # Initialise the scenario chain anchored to this first question
    scenario_chain = init_chain(
        root_scenario=question.get("scenario", ""),
        competency=next_comp,
    )

    session_item = {
        "sessionId": session_id,
        "userId": user_id,
        "role": role,
        "level": level,
        "status": "in-progress",
        "testedCompetencies": tracker["tested"],
        "remainingCompetencies": tracker["remaining"],
        "confidenceScore": Decimal(str(tracker["confidence"])),
        "coverage": Decimal(str(tracker["coverage"])),
        "currentQuestion": question,
        "questionCount": 1,
        "scenarioChain": scenario_chain,
        "createdAt": _iso_now(),
    }

    sessions_table.put_item(Item=session_item)

    return {
        "sessionId": session_id,
        "status": "in-progress",
        "currentQuestion": question,
        "questionCount": 1,
        "confidenceScore": tracker["confidence"],
        "coverage": tracker["coverage"],
        "scenarioChain": scenario_chain,
    }


# ---------------------------------------------------
# Process Answer
# ---------------------------------------------------

def process_answer(
    session_id: str,
    question_id: str,
    answer: str,
    started_at: str,
    ended_at: str,
):
    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    answers_table = get_table("ANSWERS_TABLE")

    session_resp = sessions_table.get_item(Key={"sessionId": session_id})
    session = session_resp.get("Item")

    if not session:
        return {"error": "Session not found", "statusCode": 404}

    session = decimal_to_native(session)
    current_q = session.get("currentQuestion")

    if current_q.get("questionId") != question_id:
        return {"error": "Question mismatch", "statusCode": 400}

    # --------------------------------------------------
    # Build question context
    # --------------------------------------------------
    scenario = current_q.get("scenario", "")
    question = current_q.get("question", "")
    text = current_q.get("text", "")
    options = current_q.get("options", [])
    question_text = f"{scenario}\n{question}\n{text}\nOptions: {options}"
    competency = current_q.get("competency", "problem_solving")

    start_ts = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    end_ts = datetime.fromisoformat(ended_at.replace("Z", "+00:00"))
    response_time_sec = max(1.0, (end_ts - start_ts).total_seconds())

    # Resolve selected text
    selected_text = answer
    if options and answer:
        if len(answer) == 1 and answer.upper() in ["A", "B", "C", "D"]:
            idx = ord(answer.upper()) - 65
            if 0 <= idx < len(options):
                selected_text = options[idx]

    decision_desc = f"Candidate response: {selected_text}"

    # --------------------------------------------------
    # AI Agents
    # --------------------------------------------------
    observer = run_observer(question_text, decision_desc)
    critic = run_critic(question_text, decision_desc, observer)
    guide = run_guide(question_text, decision_desc, observer, critic)
    competency_score = derive_competency_score(critic)
    metrics = critic.get("metrics", {})
    metrics["responseTimeSec"] = response_time_sec
    metrics = convert_floats(metrics)

    # --------------------------------------------------
    # Store Answer
    # --------------------------------------------------
    answer_item = convert_floats({
        "sessionId": session_id,
        "questionId": question_id,
        "question": current_q,
        "answer": answer,
        "competency": competency,
        "competencyScore": competency_score,
        "observer": observer,
        "critic": critic,
        "guide": guide,
        "metrics": metrics,
        "responseTimeSec": response_time_sec,
        "createdAt": _iso_now(),
    })

    print("Saving answer item to DynamoDB")
    answers_table.put_item(Item=answer_item)

    # --------------------------------------------------
    # Update competency tracker
    # --------------------------------------------------
    tracker = {
        "tested": session.get("testedCompetencies", []),
        "remaining": session.get("remainingCompetencies", []),
        "scores": {},
        "coverage": float(session.get("coverage", 0)),
        "confidence": float(session.get("confidenceScore", 0)),
    }
    tracker = tracker_update(tracker, competency, competency_score)
    question_count = len(tracker["tested"])

    print(f"DEBUG tracker: tested={tracker['tested']}, remaining={tracker['remaining']}, "
          f"coverage={tracker['coverage']}, confidence={tracker['confidence']}, "
          f"question_count={question_count}")

    # --------------------------------------------------
    # SCENARIO CHAIN LOGIC
    # --------------------------------------------------
    chain = session.get("scenarioChain")
    current_chain_step = current_q.get("chainStep", 0)

    # Build the completed step record for the chain
    completed_step = {
        "stepIndex": current_chain_step,
        "type": "initial" if current_chain_step == 0 else "follow_up",
        "questionId": question_id,
        "questionText": question_text[:200],
        "candidateAnswer": selected_text[:200],
        "complicationText": current_q.get("complicationText"),
        "criticScore": competency_score,
        "observerSummary": observer.get("summary", ""),
    }

    # Check if we should continue the chain for this answer
    if chain and is_chain_active(session) and not chain_is_complete(chain):
        print(f"DEBUG chain active: depth={chain.get('chainDepth')}, step={current_chain_step}")

        # Temporarily attach the chain to session for advance_chain
        session["scenarioChain"] = chain

        chain_result = advance_chain(session=session, completed_step=completed_step)
        complication_text = chain_result["complicationText"]
        next_q = chain_result["nextQuestion"]
        updated_chain = chain_result["updatedChain"]

        sessions_table.update_item(
            Key={"sessionId": session_id},
            UpdateExpression=(
                "SET testedCompetencies=:t, remainingCompetencies=:r, "
                "currentQuestion=:q, questionCount=:c, scenarioChain=:sc"
            ),
            ExpressionAttributeValues={
                ":t": tracker["tested"],
                ":r": tracker["remaining"],
                ":q": next_q,
                ":c": question_count,
                ":sc": updated_chain,
            },
        )

        return {
            "status": "in-progress",
            "nextQuestion": next_q,
            "complicationText": complication_text,   # <-- NEW for frontend
            "chainStep": next_q.get("chainStep", 1),  # <-- NEW for frontend
            "scenarioChain": updated_chain,
            "testedCompetencies": tracker["tested"],
            "remainingCompetencies": tracker["remaining"],
            "confidenceScore": tracker["confidence"],
            "coverage": tracker["coverage"],
            "evaluation": {
                "observerSummary": observer.get("summary"),
                "criticFeedback": critic.get("feedback"),
                "guidePrompt": guide.get("prompt"),
            },
        }

    # --------------------------------------------------
    # NORMAL FLOW (no active chain or chain complete)
    # --------------------------------------------------
    continue_flag = should_continue(tracker, question_count)
    print(f"DEBUG should_continue={continue_flag}")

    # Mark chain inactive if it just finished
    updated_chain = {**(chain or {}), "isActive": False} if chain else None

    if continue_flag:
        next_comp = get_next_competency(tracker)
        prev_answers = load_prev_answers(answers_table, session_id)

        next_q = synthesize_next_question(
            role=session["role"],
            level=session["level"],
            target_competency=next_comp,
            remaining_competencies=tracker["remaining"],
            previous_answers=prev_answers,
        )

        qid = next_q.get("id") or generate_question_id()
        next_q["questionId"] = qid
        next_q["order"] = question_count - 1
        next_q["chainStep"] = None  # not part of chain

        update_expr = (
            "SET testedCompetencies=:t, remainingCompetencies=:r, "
            "currentQuestion=:q, questionCount=:c"
        )
        expr_vals = {
            ":t": tracker["tested"],
            ":r": tracker["remaining"],
            ":q": next_q,
            ":c": question_count,
        }

        if updated_chain:
            update_expr += ", scenarioChain=:sc"
            expr_vals[":sc"] = updated_chain

        sessions_table.update_item(
            Key={"sessionId": session_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_vals,
        )

        return {
            "status": "in-progress",
            "nextQuestion": next_q,
            "complicationText": None,
            "chainStep": None,
            "testedCompetencies": tracker["tested"],
            "remainingCompetencies": tracker["remaining"],
            "confidenceScore": tracker["confidence"],
            "coverage": tracker["coverage"],
            "evaluation": {
                "observerSummary": observer.get("summary"),
                "criticFeedback": critic.get("feedback"),
                "guidePrompt": guide.get("prompt"),
            },
        }

    # --------------------------------------------------
    # Finish Assessment
    # --------------------------------------------------
    report = generate_report_for_session(session_id)

    sessions_table.update_item(
        Key={"sessionId": session_id},
        UpdateExpression="SET #s=:s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "completed"},
    )

    return {
        "status": "completed",
        "complicationText": None,
        "chainStep": None,
        "testedCompetencies": tracker["tested"],
        "remainingCompetencies": tracker["remaining"],
        "confidenceScore": tracker["confidence"],
        "coverage": tracker["coverage"],
        "evaluation": {
            "observerSummary": observer.get("summary"),
            "criticFeedback": critic.get("feedback"),
            "guidePrompt": guide.get("prompt"),
        },
        "report": report,
    }


# ---------------------------------------------------
# Load Previous Answers
# ---------------------------------------------------

def load_prev_answers(answers_table, session_id):
    resp = answers_table.query(
        KeyConditionExpression="sessionId = :sid",
        ExpressionAttributeValues={":sid": session_id},
    )
    out = []
    for item in resp.get("Items", []):
        q = item.get("question", {})
        topic = q.get("scenario") or q.get("question") or q.get("text", "")
        out.append({
            "competency": item.get("competency"),
            "questionText": topic,
        })
    return out


# ---------------------------------------------------
# Lambda Handler
# ---------------------------------------------------

def lambda_handler(event, context):
    try:
        print("EVENT:", json.dumps(event))

        method = event.get("requestContext", {}).get("http", {}).get("method")
        path = event.get("rawPath", "")
        path_params = event.get("pathParameters") or {}

        if method == "OPTIONS":
            return build_response(200, {"message": "ok"})

        if method == "POST" and "/assessment/start" in path:
            body = parse_body(event)
            result = start_assessment(
                body.get("userId"),
                body.get("role"),
                body.get("level"),
            )
            return build_response(200, result)

        if method == "POST" and "/answer" in path:
            body = parse_body(event)
            session_id = path_params.get("sessionId")
            question_id = body.get("questionId")

            if not session_id or not question_id:
                return build_response(400, {
                    "message": "Missing sessionId or questionId",
                    "received": {"sessionId": session_id, "questionId": question_id},
                })

            result = process_answer(
                session_id,
                question_id,
                body.get("answer"),
                body.get("startedAtIso"),
                body.get("endedAtIso"),
            )
            return build_response(200, result)

        if method == "GET" and "/report" in path:
            session_id = path_params.get("sessionId")
            if not session_id:
                return build_response(400, {"message": "sessionId is required"})
            report = generate_report_for_session(session_id)
            return build_response(200, report)

        if method == "GET" and "/users/" in path and "/assessments" in path:
            path_parts = path.strip("/").split("/")
            try:
                users_idx = path_parts.index("users")
                user_id = path_parts[users_idx + 1]
            except (ValueError, IndexError):
                user_id = None
            if not user_id:
                return build_response(400, {"message": "userId is required"})
            sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
            resp = sessions_table.scan(
                FilterExpression="userId = :uid",
                ExpressionAttributeValues={":uid": user_id},
            )
            items = [decimal_to_native(item) for item in resp.get("Items", [])]
            return build_response(200, items)

        return build_response(405, {"message": "Method not allowed"})

    except Exception as e:
        print("CRITICAL ERROR:", str(e))
        traceback.print_exc()
        return build_response(500, {"message": str(e)})
