"""
Assessment Engine – Adaptive AI Interview Simulator
Generates questions dynamically until competency coverage ≥ 80%
"""

import json
from datetime import datetime
from typing import Any, Dict, List
from decimal import Decimal

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
    init_tracker,
    should_continue,
    get_next_competency,
    update as tracker_update,
)

from question_synthesizer import synthesize_next_question
from observer_agent import run_observer
from critic_agent import run_critic
from guide_agent import run_guide
from report_generator import generate_report_for_session


# ---------------------------------------------------
# Helpers
# ---------------------------------------------------

def convert_floats(obj):
    """Recursively convert floats to Decimal for DynamoDB"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: convert_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_floats(v) for v in obj]
    return obj


def derive_competency_score(critic: Dict[str, Any]) -> float:
    """Calculate normalized competency score"""
    metrics = critic.get("metrics", {})

    keys = [
        "analyticalThinking",
        "problemSolving",
        "communication",
        "ownership",
        "adaptability",
        "decisionMaking",
    ]

    vals = []

    for k in keys:
        v = metrics.get(k)
        if v is not None:
            vals.append(float(v))

    if not vals:
        return 0.5

    avg = sum(vals) / len(vals)
    return max(0.0, min(1.0, avg / 5.0))


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

    # DynamoDB returns numbers as Decimal — convert before use
    session = decimal_to_native(session)

    current_q = session.get("currentQuestion")

    if current_q.get("questionId") != question_id:
        return {"error": "Question mismatch", "statusCode": 400}

    # ---------------------------------------------------
    # Build Question Context
    # ---------------------------------------------------

    scenario = current_q.get("scenario", "")
    question = current_q.get("question", "")
    text = current_q.get("text", "")
    options = current_q.get("options", [])

    question_text = f"{scenario}\n{question}\n{text}\nOptions: {options}"

    competency = current_q.get("competency", "problem_solving")

    start_ts = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    end_ts = datetime.fromisoformat(ended_at.replace("Z", "+00:00"))

    response_time_sec = max(1.0, (end_ts - start_ts).total_seconds())

    # ---------------------------------------------------
    # Decision description
    # ---------------------------------------------------

    selected_text = answer

    if options and answer:

        # If answer is a single letter like A/B/C/D
        if len(answer) == 1 and answer.upper() in ["A", "B", "C", "D"]:

            idx = ord(answer.upper()) - 65

            if 0 <= idx < len(options):
                selected_text = options[idx]

        # Otherwise treat it as free-text response
        else:
            selected_text = answer


    decision_desc = f"Candidate response: {selected_text}"

    # ---------------------------------------------------
    # AI Agents
    # ---------------------------------------------------

    observer = run_observer(question_text, decision_desc)

    critic = run_critic(question_text, decision_desc, observer)

    guide = run_guide(question_text, decision_desc, observer, critic)

    competency_score = derive_competency_score(critic)

    metrics = critic.get("metrics", {})

    metrics["responseTimeSec"] = response_time_sec

    metrics = convert_floats(metrics)

    # ---------------------------------------------------
    # Store Answer
    # ---------------------------------------------------

    # Use the detailed item you already created
    answer_item = convert_floats({
        "sessionId": session_id,
        "questionId": question_id,
        "question": current_q,
        "answer": answer, # Use the argument 'answer'
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

    # ---------------------------------------------------
    # Update Tracker
    # ---------------------------------------------------

    # Rebuild tracker WITH scores from previous answers so confidence is accurate
    tracker = {
        "tested": session.get("testedCompetencies", []),
        "remaining": session.get("remainingCompetencies", []),
        "scores": {},
        "coverage": float(session.get("coverage", 0)),
        "confidence": float(session.get("confidenceScore", 0)),
    }

    tracker = tracker_update(tracker, competency, competency_score)

    question_count = len(tracker["tested"])  # actual number of competencies tested

    print(f"DEBUG tracker: tested={tracker['tested']}, remaining={tracker['remaining']}, coverage={tracker['coverage']}, confidence={tracker['confidence']}, question_count={question_count}")

    # ---------------------------------------------------
    # Continue Assessment
    # ---------------------------------------------------

    continue_flag = should_continue(tracker, question_count)
    print(f"DEBUG should_continue={continue_flag}")

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

        sessions_table.update_item(
            Key={"sessionId": session_id},
            UpdateExpression="SET testedCompetencies=:t, remainingCompetencies=:r, currentQuestion=:q, questionCount=:c",
            ExpressionAttributeValues={
                ":t": tracker["tested"],
                ":r": tracker["remaining"],
                ":q": next_q,
                ":c": question_count,
            },
        )

        return {
            "status": "in-progress",
            "nextQuestion": next_q,
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

    # ---------------------------------------------------
    # Finish Assessment
    # ---------------------------------------------------

    report = generate_report_for_session(session_id)

    sessions_table.update_item(
        Key={"sessionId": session_id},
        UpdateExpression="SET #s=:s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "completed"},
    )

    return {
        "status": "completed",
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
            "questionText": topic
        })

    return out


# ---------------------------------------------------
# Lambda Handler
# ---------------------------------------------------
import json
import traceback

def lambda_handler(event, context):
    try:
        # Log the incoming event for debugging in CloudWatch
        print("EVENT:", json.dumps(event))

        # Extract Request Metadata
        method = event.get("requestContext", {}).get("http", {}).get("method")
        path = event.get("rawPath", "")
        path_params = event.get("pathParameters") or {}

        # Handle CORS preflight (Crucial for React/Frontend)
        if method == "OPTIONS":
            return build_response(200, {"message": "ok"})

        # --- START ASSESSMENT ---
        if method == "POST" and "/assessment/start" in path:
            body = parse_body(event)
            result = start_assessment(
                body.get("userId"),
                body.get("role"),
                body.get("level"),
            )
            return build_response(200, result)

        # --- SUBMIT ANSWER (Fix for the 500 error) ---
        if method == "POST" and "/answer" in path:
            body = parse_body(event)
            
            # Extract sessionId from pathParameters {sessionId}
            session_id = path_params.get("sessionId")
            
            # Extract questionId from body (REQUIRED for DynamoDB Sort Key)
            question_id = body.get("questionId")

            # Validation: Return 400 instead of 500 if data is missing
            if not session_id or not question_id:
                return build_response(400, {
                    "message": "Missing sessionId or questionId",
                    "received": {"sessionId": session_id, "questionId": question_id}
                })

            result = process_answer(
                session_id,
                question_id,
                body.get("answer"),
                body.get("startedAtIso"),
                body.get("endedAtIso"),
            )
            return build_response(200, result)

        # --- REPORT ---
        if method == "GET" and "/report" in path:
            session_id = path_params.get("sessionId")
            if not session_id:
                return build_response(400, {"message": "sessionId is required"})
            report = generate_report_for_session(session_id)
            return build_response(200, report)

        # --- USER ASSESSMENTS ---
        if method == "GET" and "/users/" in path and "/assessments" in path:
            # Extract userId from path: /prod/users/{userId}/assessments
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
        traceback.print_exc() # Logs the exact line number to CloudWatch
        return build_response(500, {"message": str(e)})