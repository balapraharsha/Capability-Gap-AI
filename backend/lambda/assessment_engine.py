"""
Assessment Engine – Adaptive AI Interview Simulator  v2
-------------------------------------------------------
Q1 and Q2 each run a full 3-decision chain:
  D1 → Complication → D2 → Complication → Final Decision

Q3-Q6 are normal standalone competency questions.
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
    CHAINED_QUESTION_NUMBERS,
)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def convert_floats(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: convert_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_floats(v) for v in obj]
    return obj


def derive_competency_score(critic: Dict[str, Any]) -> float:
    metrics = critic.get("metrics", {})
    keys = ["analyticalThinking", "problemSolving", "communication",
            "ownership", "adaptability", "decisionMaking"]
    vals = [float(v) for k in keys if (v := metrics.get(k)) is not None]
    if not vals:
        return 0.5
    return max(0.0, min(1.0, sum(vals) / len(vals) / 5.0))


# ------------------------------------------------------------------
# Start Assessment
# ------------------------------------------------------------------

def start_assessment(user_id: str, role: str, level: str):
    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    session_id = generate_session_id()
    tracker = init_tracker(role)
    next_comp = get_next_competency(tracker)

    question = synthesize_next_question(
        role=role, level=level,
        target_competency=next_comp,
        remaining_competencies=tracker["remaining"],
        previous_answers=[],
    )

    question_id = question.get("id") or generate_question_id()
    question["questionId"] = question_id
    question["order"] = 0
    question["chainStep"] = 0        # Q1 is always step 0 of its chain
    question["complicationText"] = None

    # Q1 always starts with a chain
    scenario_chain = init_chain(
        root_scenario=question.get("scenario", ""),
        competency=next_comp,
        question_number=1,
    )

    session_item = convert_floats({
        "sessionId": session_id,
        "userId": user_id,
        "role": role,
        "level": level,
        "status": "in-progress",
        "testedCompetencies": tracker["tested"],
        "remainingCompetencies": tracker["remaining"],
        "confidenceScore": tracker["confidence"],
        "coverage": tracker["coverage"],
        "currentQuestion": question,
        "questionCount": 1,
        "completedChainQuestions": 0,   # how many chained questions fully finished
        "scenarioChain": scenario_chain,
        "createdAt": _iso_now(),
    })

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


# ------------------------------------------------------------------
# Process Answer
# ------------------------------------------------------------------

def process_answer(session_id, question_id, answer, started_at, ended_at):
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

    # Build question text
    scenario = current_q.get("scenario", "")
    question = current_q.get("question", "")
    options = current_q.get("options", [])
    question_text = f"{scenario}\n{question}\nOptions: {options}"
    competency = current_q.get("competency", "problem_solving")

    start_ts = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    end_ts = datetime.fromisoformat(ended_at.replace("Z", "+00:00"))
    response_time_sec = max(1.0, (end_ts - start_ts).total_seconds())

    selected_text = answer
    if options and answer:
        if len(answer) == 1 and answer.upper() in ["A", "B", "C", "D"]:
            idx = ord(answer.upper()) - 65
            if 0 <= idx < len(options):
                selected_text = options[idx]

    decision_desc = f"Candidate response: {selected_text}"

    # AI agents
    observer = run_observer(question_text, decision_desc)
    critic = run_critic(question_text, decision_desc, observer)
    guide = run_guide(question_text, decision_desc, observer, critic)
    competency_score = derive_competency_score(critic)
    metrics = convert_floats({**critic.get("metrics", {}), "responseTimeSec": response_time_sec})

    # Store answer
    answers_table.put_item(Item=convert_floats({
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
    }))

    # Update tracker
    tracker = {
        "tested": session.get("testedCompetencies", []),
        "remaining": session.get("remainingCompetencies", []),
        "scores": {},
        "coverage": float(session.get("coverage", 0)),
        "confidence": float(session.get("confidenceScore", 0)),
    }
    tracker = tracker_update(tracker, competency, competency_score)
    question_count = len(tracker["tested"])

    current_chain_step = current_q.get("chainStep")
    chain = session.get("scenarioChain")
    completed_chain_questions = int(session.get("completedChainQuestions", 0))

    evaluation = {
        "observerSummary": observer.get("summary"),
        "criticFeedback": critic.get("feedback"),
        "guidePrompt": guide.get("prompt"),
    }

    # Build completed step record
    completed_step = {
        "stepIndex": current_chain_step if current_chain_step is not None else 0,
        "type": "initial" if current_chain_step == 0 else "follow_up",
        "questionId": question_id,
        "questionText": question_text[:200],
        "candidateAnswer": selected_text[:200],
        "complicationText": current_q.get("complicationText"),
        "criticScore": competency_score,
        "observerSummary": observer.get("summary", ""),
    }

    # --------------------------------------------------
    # CHAIN LOGIC — are we mid-chain?
    # --------------------------------------------------
    if chain and is_chain_active(session):
        print(f"DEBUG chain active: depth={chain.get('chainDepth')}, step={current_chain_step}")

        chain_result = advance_chain(session=session, completed_step=completed_step)
        updated_chain = chain_result["updatedChain"]
        chain_complete = chain_result["chainComplete"]

        if not chain_complete:
            # More steps remain in this chain
            next_q = chain_result["nextQuestion"]
            complication_text = chain_result["complicationText"]

            sessions_table.update_item(
                Key={"sessionId": session_id},
                UpdateExpression=(
                    "SET testedCompetencies=:t, remainingCompetencies=:r, "
                    "currentQuestion=:q, questionCount=:c, scenarioChain=:sc"
                ),
                ExpressionAttributeValues={
                    ":t": tracker["tested"],
                    ":r": tracker["remaining"],
                    ":q": convert_floats(next_q),
                    ":c": question_count,
                    ":sc": convert_floats(updated_chain),
                },
            )

            return {
                "status": "in-progress",
                "nextQuestion": next_q,
                "complicationText": complication_text,
                "chainStep": next_q.get("chainStep"),
                "scenarioChain": updated_chain,
                "testedCompetencies": tracker["tested"],
                "remainingCompetencies": tracker["remaining"],
                "confidenceScore": tracker["confidence"],
                "coverage": tracker["coverage"],
                "evaluation": evaluation,
            }

        # Chain finished — fall through to start next question or new chain
        completed_chain_questions += 1
        print(f"DEBUG chain complete. completedChainQuestions={completed_chain_questions}")

    # --------------------------------------------------
    # BETWEEN CHAINS OR NORMAL FLOW
    # --------------------------------------------------
    continue_flag = should_continue(tracker, question_count)
    print(f"DEBUG should_continue={continue_flag}")

    if not continue_flag:
        # Assessment complete
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
            "evaluation": evaluation,
            "report": report,
        }

    # Get next competency question
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

    # Determine if the NEXT question should start a new chain
    next_question_number = completed_chain_questions + 1
    new_chain = None

    if next_question_number in CHAINED_QUESTION_NUMBERS:
        # Start a fresh chain for this question
        next_q["chainStep"] = 0
        next_q["complicationText"] = None
        new_chain = init_chain(
            root_scenario=next_q.get("scenario", ""),
            competency=next_comp,
            question_number=next_question_number,
        )
        print(f"DEBUG starting new chain for question_number={next_question_number}")
    else:
        # Normal standalone question
        next_q["chainStep"] = None
        next_q["complicationText"] = None
        new_chain = {**(chain or {}), "isActive": False}

    update_expr = (
        "SET testedCompetencies=:t, remainingCompetencies=:r, "
        "currentQuestion=:q, questionCount=:c, "
        "completedChainQuestions=:cq, scenarioChain=:sc"
    )
    sessions_table.update_item(
        Key={"sessionId": session_id},
        UpdateExpression=update_expr,
        ExpressionAttributeValues={
            ":t": tracker["tested"],
            ":r": tracker["remaining"],
            ":q": convert_floats(next_q),
            ":c": question_count,
            ":cq": completed_chain_questions,
            ":sc": convert_floats(new_chain),
        },
    )

    return {
        "status": "in-progress",
        "nextQuestion": next_q,
        "complicationText": None,
        "chainStep": next_q.get("chainStep"),
        "scenarioChain": new_chain,
        "testedCompetencies": tracker["tested"],
        "remainingCompetencies": tracker["remaining"],
        "confidenceScore": tracker["confidence"],
        "coverage": tracker["coverage"],
        "evaluation": evaluation,
    }


# ------------------------------------------------------------------
# Load Previous Answers
# ------------------------------------------------------------------

def load_prev_answers(answers_table, session_id):
    resp = answers_table.query(
        KeyConditionExpression="sessionId = :sid",
        ExpressionAttributeValues={":sid": session_id},
    )
    out = []
    for item in resp.get("Items", []):
        q = item.get("question", {})
        topic = q.get("scenario") or q.get("question") or q.get("text", "")
        out.append({"competency": item.get("competency"), "questionText": topic})
    return out


# ------------------------------------------------------------------
# Lambda Handler
# ------------------------------------------------------------------

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
            result = start_assessment(body.get("userId"), body.get("role"), body.get("level"))
            return build_response(200, result)

        if method == "POST" and "/answer" in path:
            body = parse_body(event)
            session_id = path_params.get("sessionId")
            question_id = body.get("questionId")
            if not session_id or not question_id:
                return build_response(400, {"message": "Missing sessionId or questionId"})
            result = process_answer(
                session_id, question_id,
                body.get("answer"),
                body.get("startedAtIso"),
                body.get("endedAtIso"),
            )
            return build_response(200, result)

        if method == "GET" and "/report" in path:
            session_id = path_params.get("sessionId")
            if not session_id:
                return build_response(400, {"message": "sessionId is required"})
            return build_response(200, generate_report_for_session(session_id))

        if method == "GET" and "/users/" in path and "/assessments" in path:
            path_parts = path.strip("/").split("/")
            try:
                user_id = path_parts[path_parts.index("users") + 1]
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
