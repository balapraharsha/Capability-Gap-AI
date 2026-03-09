"""
Assessment Engine

This module manages the full lifecycle of an AI-based assessment session.
It is responsible for starting an assessment, processing candidate answers,
evaluating responses using AI agents, and controlling the flow of questions.

The engine follows a structured question sequence consisting of six slots.
The first slot begins with a scenario-based question that may continue as a
multi-step scenario chain. Once the chain is complete, the engine moves
through several technical question types such as debugging, code fixing,
code review, log analysis, and complexity evaluation.

Key responsibilities of this module include:
- Creating and managing assessment sessions.
- Generating the first scenario-based question.
- Handling scenario chains with follow-up complications.
- Processing answers and calculating response time.
- Running evaluation agents (observer, critic, and guide).
- Updating competency tracking and assessment progress.
- Generating technical questions for later slots.
- Completing the assessment and producing the final report.

The engine uses DynamoDB for storing sessions and answers, and relies on
multiple supporting modules for question synthesis, competency tracking,
AI evaluation, and report generation.

This file acts as the central controller that coordinates the entire
assessment workflow.
"""

import json
import traceback
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from common import (
    _iso_now, build_response, decimal_to_native,
    generate_question_id, generate_session_id,
    get_table, parse_body,
)
from competency_tracker import get_next_competency, init_tracker, update as tracker_update
from question_synthesizer import synthesize_next_question
from observer_agent import run_observer
from critic_agent import run_critic
from guide_agent import run_guide
from report_generator import generate_report_for_session
from scenario_chain_synthesizer import advance_chain, init_chain
from technical_question_synthesizer import synthesize_technical_question

# Total number of questions in one assessment session
TOTAL_QUESTIONS = 6

# Mapping between question slot and question type
SLOT_TYPE = {
    1: "scenario",
    2: "debugging",
    3: "fix_the_code",
    4: "code_review",
    5: "log_detective",
    6: "complexity",
}


def _f2d(obj):
    """
    DynamoDB does not accept Python floats directly.
    This helper converts all floats in nested structures into Decimal.
    """
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _f2d(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_f2d(v) for v in obj]
    return obj


def _critic_to_score(critic: Dict) -> float:
    """
    Convert critic metrics into a normalized competency score.
    The score is scaled to a value between 0 and 1.
    """
    m = critic.get("metrics", {})
    keys = [
        "analyticalThinking",
        "problemSolving",
        "communication",
        "ownership",
        "adaptability",
        "decisionMaking",
    ]

    vals = [float(v) for k in keys if (v := m.get(k)) is not None]

    if not vals:
        return 0.5

    return round(max(0.0, min(1.0, sum(vals) / len(vals) / 5.0)), 3)


def _make_technical_q(slot: int, role: str, level: str) -> Dict:
    """
    Generate a technical question for slots 2–6.
    """
    q = synthesize_technical_question(question_number=slot, role=role, level=level)

    q["questionId"] = q.get("questionId") or q.get("id") or generate_question_id()
    q["chainStep"] = None
    q["complicationText"] = None
    q["order"] = slot - 1

    return q


def _chain_is_active_and_incomplete(chain: Optional[Dict]) -> bool:
    """
    Check if the scenario chain is still active and has remaining steps.
    """
    if not chain:
        return False

    depth = int(chain.get("chainDepth", 0))
    active = bool(chain.get("isActive", False))

    return active and depth < 3


def start_assessment(user_id: str, role: str, level: str) -> Dict:
    """
    Initialize a new assessment session.

    The first question is always a scenario-based question that starts
    the scenario chain.
    """
    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    session_id = generate_session_id()

    tracker = init_tracker(role)
    competency = get_next_competency(tracker)

    q = synthesize_next_question(
        role=role,
        level=level,
        target_competency=competency,
        remaining_competencies=tracker["remaining"],
        previous_answers=[],
    )

    q["questionId"] = q.get("id") or generate_question_id()
    q["chainStep"] = 0
    q["complicationText"] = None
    q["order"] = 0

    chain = init_chain(
        root_scenario=q.get("scenario", ""),
        competency=competency,
        question_number=1,
    )

    item = _f2d({
        "sessionId": session_id,
        "userId": user_id,
        "role": role,
        "level": level,
        "status": "in-progress",
        "testedCompetencies": tracker["tested"],
        "remainingCompetencies": tracker["remaining"],
        "confidenceScore": tracker["confidence"],
        "coverage": tracker["coverage"],
        "currentQuestion": q,
        "questionCount": 1,
        "scenarioChain": chain,
        "createdAt": _iso_now(),
    })

    sessions_table.put_item(Item=item)

    return {
        "sessionId": session_id,
        "status": "in-progress",
        "currentQuestion": q,
        "questionCount": 1,
        "confidenceScore": tracker["confidence"],
        "coverage": tracker["coverage"],
        "scenarioChain": chain,
    }


def process_answer(session_id: str, question_id: str, answer: str, started_at: str, ended_at: str) -> Dict:
    """
    Process the user's answer, evaluate it using AI agents,
    update competency tracking, and determine the next question.
    """

    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    answers_table = get_table("ANSWERS_TABLE")

    raw = sessions_table.get_item(Key={"sessionId": session_id})
    session = raw.get("Item")

    if not session:
        return {"error": "Session not found", "statusCode": 404}

    session = decimal_to_native(session)
    current_q = session.get("currentQuestion", {})

    if current_q.get("questionId") != question_id:
        return {"error": "Question mismatch", "statusCode": 400}

    # Construct full question text for evaluation agents
    parts = [
        current_q.get("scenario", ""),
        current_q.get("question", ""),
        current_q.get("task", ""),
    ]

    if current_q.get("code"):
        parts.append(f"Code:\n{current_q['code']}")

    if current_q.get("logs"):
        parts.append(f"Logs:\n{current_q['logs']}")

    if current_q.get("diff"):
        parts.append(f"Diff:\n{current_q['diff']}")

    q_text = "\n".join(p for p in parts if p)
    competency = current_q.get("competency", "problem_solving")

    # Calculate response time
    s_ts = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    e_ts = datetime.fromisoformat(ended_at.replace("Z", "+00:00"))
    resp_sec = max(1.0, (e_ts - s_ts).total_seconds())

    # Run evaluation agents
    observer = run_observer(q_text, f"Answer: {answer}")
    critic = run_critic(q_text, f"Answer: {answer}", observer)
    guide = run_guide(q_text, f"Answer: {answer}", observer, critic)

    comp_score = _critic_to_score(critic)

    evaluation = {
        "observerSummary": observer.get("summary", ""),
        "criticFeedback": critic.get("feedback", ""),
        "guidePrompt": guide.get("prompt", ""),
    }

    # Store answer in the answers table
    answers_table.put_item(Item=_f2d({
        "sessionId": session_id,
        "questionId": question_id,
        "question": current_q,
        "answer": answer,
        "competency": competency,
        "competencyScore": comp_score,
        "observer": observer,
        "critic": critic,
        "guide": guide,
        "responseTimeSec": resp_sec,
        "createdAt": _iso_now(),
    }))

    # Rebuild tracker from session state
    tracker = {
        "tested": session.get("testedCompetencies", []),
        "remaining": session.get("remainingCompetencies", []),
        "scores": {},
        "coverage": float(session.get("coverage", 0)),
        "confidence": float(session.get("confidenceScore", 0)),
    }

    tracker = tracker_update(tracker, competency, comp_score)

    current_slot = int(session.get("questionCount", 1))
    chain = session.get("scenarioChain")
    chain_step = current_q.get("chainStep")

    completed_step = {
        "stepIndex": chain_step if chain_step is not None else 0,
        "type": "initial" if chain_step == 0 else "follow_up",
        "questionId": question_id,
        "questionText": q_text[:200],
        "candidateAnswer": answer[:200],
        "complicationText": current_q.get("complicationText"),
        "criticScore": comp_score,
        "observerSummary": observer.get("summary", ""),
    }

    # Handle scenario chain logic for the first slot
    if current_slot == 1 and _chain_is_active_and_incomplete(chain):

        result = advance_chain(session=session, completed_step=completed_step)
        upd_chain = result["updatedChain"]
        chain_done = result["chainComplete"]

        if not chain_done:

            next_q = result["nextQuestion"]
            compl = result["complicationText"]

            sessions_table.update_item(
                Key={"sessionId": session_id},
                UpdateExpression="SET testedCompetencies=:t, remainingCompetencies=:r, currentQuestion=:q, scenarioChain=:sc",
                ExpressionAttributeValues=_f2d({
                    ":t": tracker["tested"],
                    ":r": tracker["remaining"],
                    ":q": next_q,
                    ":sc": upd_chain,
                }),
            )

            return {
                "status": "in-progress",
                "nextQuestion": next_q,
                "complicationText": compl,
                "chainStep": next_q.get("chainStep"),
                "scenarioChain": upd_chain,
                "testedCompetencies": tracker["tested"],
                "remainingCompetencies": tracker["remaining"],
                "confidenceScore": tracker["confidence"],
                "coverage": tracker["coverage"],
                "questionCount": 1,
                "evaluation": evaluation,
            }

        next_slot = 2
        upd_chain["isActive"] = False

    else:
        next_slot = current_slot + 1
        upd_chain = chain or {}

        if upd_chain:
            upd_chain = {**upd_chain, "isActive": False}

    # If all questions are finished, generate the final report
    if next_slot > TOTAL_QUESTIONS:

        report = generate_report_for_session(session_id)

        sessions_table.update_item(
            Key={"sessionId": session_id},
            UpdateExpression="SET #s=:s",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": "completed"},
        )

        return {
            "status": "completed",
            "evaluation": evaluation,
            "complicationText": None,
            "chainStep": None,
            "testedCompetencies": tracker["tested"],
            "remainingCompetencies": tracker["remaining"],
            "confidenceScore": tracker["confidence"],
            "coverage": tracker["coverage"],
            "questionCount": current_slot,
            "report": report,
        }

    # Generate next technical question
    nq = _make_technical_q(next_slot, session["role"], session["level"])

    progress = (next_slot - 1) / TOTAL_QUESTIONS
    conf = min(1.0, progress + 0.1)

    sessions_table.update_item(
        Key={"sessionId": session_id},
        UpdateExpression=(
            "SET testedCompetencies=:t, remainingCompetencies=:r, "
            "currentQuestion=:q, questionCount=:qc, "
            "scenarioChain=:sc, coverage=:cov, confidenceScore=:conf"
        ),
        ExpressionAttributeValues=_f2d({
            ":t": tracker["tested"],
            ":r": tracker["remaining"],
            ":q": nq,
            ":qc": next_slot,
            ":sc": upd_chain,
            ":cov": progress,
            ":conf": conf,
        }),
    )

    return {
        "status": "in-progress",
        "nextQuestion": nq,
        "complicationText": None,
        "chainStep": None,
        "scenarioChain": upd_chain,
        "testedCompetencies": tracker["tested"],
        "remainingCompetencies": tracker["remaining"],
        "confidenceScore": conf,
        "coverage": progress,
        "questionCount": next_slot,
        "evaluation": evaluation,
    }


def lambda_handler(event, context):
    """
    AWS Lambda entry point that routes API requests.
    """
    try:
        method = event.get("requestContext", {}).get("http", {}).get("method", "")
        path = event.get("rawPath", "")
        params = event.get("pathParameters") or {}

        if method == "OPTIONS":
            return build_response(200, {"message": "ok"})

        if method == "POST" and "/assessment/start" in path:
            body = parse_body(event)
            return build_response(
                200,
                start_assessment(body.get("userId"), body.get("role"), body.get("level"))
            )

        if method == "POST" and "/answer" in path:
            body = parse_body(event)
            sid = params.get("sessionId")
            qid = body.get("questionId")

            if not sid or not qid:
                return build_response(400, {"message": "Missing sessionId or questionId"})

            result = process_answer(
                sid,
                qid,
                body.get("answer"),
                body.get("startedAtIso"),
                body.get("endedAtIso"),
            )

            return build_response(200, result)

        if method == "GET" and "/report" in path:
            sid = params.get("sessionId")

            if not sid:
                return build_response(400, {"message": "sessionId required"})

            return build_response(200, generate_report_for_session(sid))

        if method == "GET" and "/users/" in path and "/assessments" in path:

            parts = path.strip("/").split("/")

            try:
                uid = parts[parts.index("users") + 1]
            except:
                uid = None

            if not uid:
                return build_response(400, {"message": "userId required"})

            tbl = get_table("ASSESSMENT_SESSIONS_TABLE")

            resp = tbl.scan(
                FilterExpression="userId = :uid",
                ExpressionAttributeValues={":uid": uid},
            )

            return build_response(
                200,
                [decimal_to_native(i) for i in resp.get("Items", [])],
            )

        return build_response(405, {"message": "Method not allowed"})

    except Exception as e:
        traceback.print_exc()
        return build_response(500, {"message": str(e)})