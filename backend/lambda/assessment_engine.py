"""
Assessment Engine v4  —  Clean fixed flow
==========================================

Slot  questionCount  type
----  -------------  ----
Q1         1         scenario_chain  (3 decisions + 2 complications)
Q2         2         debugging
Q3         3         fix_the_code
Q4         4         code_review
Q5         5         log_detective
Q6         6         complexity
→ Report

Key fix: use `questionCount` (display number, 1-6) as the single source of
truth for "which slot are we on".  No more answeredCount confusion.
"""

import json
import traceback
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

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
from scenario_chain_synthesizer import (
    advance_chain, chain_is_complete, init_chain, is_chain_active,
)
from technical_question_synthesizer import synthesize_technical_question

TOTAL_QUESTIONS = 6

# Which display slot → question type
SLOT_TYPE = {
    1: "scenario",      # handled by question_synthesizer + chain
    2: "debugging",
    3: "fix_the_code",
    4: "code_review",
    5: "log_detective",
    6: "complexity",
}


# ── helpers ──────────────────────────────────────────────────────

def _f2d(obj):
    """Recursively convert floats to Decimal for DynamoDB."""
    if isinstance(obj, float):   return Decimal(str(obj))
    if isinstance(obj, dict):    return {k: _f2d(v) for k, v in obj.items()}
    if isinstance(obj, list):    return [_f2d(v) for v in obj]
    return obj


def _critic_to_score(critic: Dict) -> float:
    m = critic.get("metrics", {})
    keys = ["analyticalThinking","problemSolving","communication","ownership","adaptability","decisionMaking"]
    vals = [float(v) for k in keys if (v := m.get(k)) is not None]
    return round(max(0.0, min(1.0, sum(vals)/len(vals)/5.0)), 3) if vals else 0.5


def _make_technical_q(slot: int, role: str, level: str) -> Dict:
    q = synthesize_technical_question(question_number=slot, role=role, level=level)
    q["questionId"] = q.get("questionId") or q.get("id") or generate_question_id()
    q["chainStep"]  = None
    q["complicationText"] = None
    q["order"] = slot - 1
    return q


# ── start_assessment ─────────────────────────────────────────────

def start_assessment(user_id: str, role: str, level: str) -> Dict:
    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    session_id = generate_session_id()
    tracker = init_tracker(role)
    competency = get_next_competency(tracker)

    # Q1: scenario question
    q = synthesize_next_question(
        role=role, level=level,
        target_competency=competency,
        remaining_competencies=tracker["remaining"],
        previous_answers=[],
    )
    q["questionId"]       = q.get("id") or generate_question_id()
    q["chainStep"]        = 0
    q["complicationText"] = None
    q["order"]            = 0

    chain = init_chain(root_scenario=q.get("scenario",""), competency=competency, question_number=1)

    item = _f2d({
        "sessionId":              session_id,
        "userId":                 user_id,
        "role":                   role,
        "level":                  level,
        "status":                 "in-progress",
        "testedCompetencies":     tracker["tested"],
        "remainingCompetencies":  tracker["remaining"],
        "confidenceScore":        tracker["confidence"],
        "coverage":               tracker["coverage"],
        "currentQuestion":        q,
        "questionCount":          1,   # current display number (1-6)
        "scenarioChain":          chain,
        "createdAt":              _iso_now(),
    })
    sessions_table.put_item(Item=item)

    return {
        "sessionId":    session_id,
        "status":       "in-progress",
        "currentQuestion": q,
        "questionCount": 1,
        "confidenceScore": tracker["confidence"],
        "coverage":     tracker["coverage"],
        "scenarioChain": chain,
    }


# ── process_answer ───────────────────────────────────────────────

def process_answer(session_id: str, question_id: str, answer: str,
                   started_at: str, ended_at: str) -> Dict:

    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    answers_table  = get_table("ANSWERS_TABLE")

    raw = sessions_table.get_item(Key={"sessionId": session_id})
    session = raw.get("Item")
    if not session:
        return {"error": "Session not found", "statusCode": 404}
    session = decimal_to_native(session)

    current_q = session.get("currentQuestion", {})
    if current_q.get("questionId") != question_id:
        return {"error": "Question mismatch", "statusCode": 400}

    # Build question text for agents
    parts = [current_q.get("scenario",""), current_q.get("question",""),
             current_q.get("task","")]
    if current_q.get("code"):  parts.append(f"Code:\n{current_q['code']}")
    if current_q.get("logs"):  parts.append(f"Logs:\n{current_q['logs']}")
    if current_q.get("diff"):  parts.append(f"Diff:\n{current_q['diff']}")
    q_text = "\n".join(p for p in parts if p)
    competency = current_q.get("competency", "problem_solving")

    # Timing
    s_ts = datetime.fromisoformat(started_at.replace("Z","+00:00"))
    e_ts = datetime.fromisoformat(ended_at.replace("Z","+00:00"))
    resp_sec = max(1.0, (e_ts - s_ts).total_seconds())

    # AI evaluation
    observer = run_observer(q_text, f"Answer: {answer}")
    critic   = run_critic(q_text, f"Answer: {answer}", observer)
    guide    = run_guide(q_text, f"Answer: {answer}", observer, critic)
    comp_score = _critic_to_score(critic)

    evaluation = {
        "observerSummary": observer.get("summary",""),
        "criticFeedback":  critic.get("feedback",""),
        "guidePrompt":     guide.get("prompt",""),
    }

    # Store answer
    answers_table.put_item(Item=_f2d({
        "sessionId":       session_id,
        "questionId":      question_id,
        "question":        current_q,
        "answer":          answer,
        "competency":      competency,
        "competencyScore": comp_score,
        "observer":        observer,
        "critic":          critic,
        "guide":           guide,
        "responseTimeSec": resp_sec,
        "createdAt":       _iso_now(),
    }))

    # Update competency tracker
    tracker = {
        "tested":    session.get("testedCompetencies", []),
        "remaining": session.get("remainingCompetencies", []),
        "scores":    {},
        "coverage":  float(session.get("coverage", 0)),
        "confidence":float(session.get("confidenceScore", 0)),
    }
    tracker = tracker_update(tracker, competency, comp_score)

    # ── CURRENT SLOT ─────────────────────────────────────────────
    current_slot = int(session.get("questionCount", 1))   # 1-6
    chain        = session.get("scenarioChain")
    chain_step   = current_q.get("chainStep")

    completed_step = {
        "stepIndex":       chain_step if chain_step is not None else 0,
        "type":            "initial" if chain_step == 0 else "follow_up",
        "questionId":      question_id,
        "questionText":    q_text[:200],
        "candidateAnswer": answer[:200],
        "complicationText":current_q.get("complicationText"),
        "criticScore":     comp_score,
        "observerSummary": observer.get("summary",""),
    }

    # ── MID-CHAIN (still inside Q1 arc) ──────────────────────────
    chain_already_done = chain_is_complete(chain) if chain else True
    if current_slot == 1 and chain and is_chain_active(session) and not chain_already_done:
        result   = advance_chain(session=session, completed_step=completed_step)
        upd_chain = result["updatedChain"]
        chain_done = result["chainComplete"]

        if not chain_done:
            # More chain steps — stay on slot 1
            next_q   = result["nextQuestion"]
            compl    = result["complicationText"]
            sessions_table.update_item(
                Key={"sessionId": session_id},
                UpdateExpression="SET testedCompetencies=:t, remainingCompetencies=:r, currentQuestion=:q, scenarioChain=:sc",
                ExpressionAttributeValues=_f2d({
                    ":t": tracker["tested"], ":r": tracker["remaining"],
                    ":q": next_q, ":sc": upd_chain,
                }),
            )
            return {
                "status":       "in-progress",
                "nextQuestion": next_q,
                "complicationText": compl,
                "chainStep":    next_q.get("chainStep"),
                "scenarioChain": upd_chain,
                "testedCompetencies":  tracker["tested"],
                "remainingCompetencies": tracker["remaining"],
                "confidenceScore": tracker["confidence"],
                "coverage":     tracker["coverage"],
                "questionCount": 1,
                "evaluation":   evaluation,
            }

        # Chain finished → advance to slot 2
        next_slot = 2
        upd_chain["isActive"] = False

    else:
        # Standalone question done → advance slot
        next_slot = current_slot + 1
        upd_chain = chain or {}
        if upd_chain:
            upd_chain = {**upd_chain, "isActive": False}

    # ── ASSESSMENT COMPLETE ───────────────────────────────────────
    if next_slot > TOTAL_QUESTIONS:
        report = generate_report_for_session(session_id)
        sessions_table.update_item(
            Key={"sessionId": session_id},
            UpdateExpression="SET #s=:s",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": "completed"},
        )
        return {
            "status":    "completed",
            "evaluation": evaluation,
            "complicationText": None,
            "chainStep": None,
            "testedCompetencies":  tracker["tested"],
            "remainingCompetencies": tracker["remaining"],
            "confidenceScore": tracker["confidence"],
            "coverage":  tracker["coverage"],
            "questionCount": current_slot,
            "report":    report,
        }

    # ── GENERATE NEXT QUESTION ────────────────────────────────────
    slot_type = SLOT_TYPE.get(next_slot, "debugging")
    print(f"[ENGINE] slot {current_slot} done → generating slot {next_slot} ({slot_type})")

    if slot_type == "scenario":
        # Shouldn't happen (Q1 is always first), but handle gracefully
        comp = get_next_competency(tracker)
        nq = synthesize_next_question(
            role=session["role"], level=session["level"],
            target_competency=comp,
            remaining_competencies=tracker["remaining"],
            previous_answers=[],
        )
        nq["questionId"]       = nq.get("id") or generate_question_id()
        nq["chainStep"]        = None
        nq["complicationText"] = None
        nq["order"]            = next_slot - 1
    else:
        nq = _make_technical_q(next_slot, session["role"], session["level"])

    # Progress for coverage bar
    progress   = (next_slot - 1) / TOTAL_QUESTIONS
    conf       = min(1.0, progress + 0.1)

    sessions_table.update_item(
        Key={"sessionId": session_id},
        UpdateExpression=(
            "SET testedCompetencies=:t, remainingCompetencies=:r, "
            "currentQuestion=:q, questionCount=:qc, "
            "scenarioChain=:sc, coverage=:cov, confidenceScore=:conf"
        ),
        ExpressionAttributeValues=_f2d({
            ":t":    tracker["tested"],
            ":r":    tracker["remaining"],
            ":q":    nq,
            ":qc":   next_slot,
            ":sc":   upd_chain,
            ":cov":  progress,
            ":conf": conf,
        }),
    )

    return {
        "status":       "in-progress",
        "nextQuestion": nq,
        "complicationText": None,
        "chainStep":    nq.get("chainStep"),
        "scenarioChain": upd_chain,
        "testedCompetencies":  tracker["tested"],
        "remainingCompetencies": tracker["remaining"],
        "confidenceScore": conf,
        "coverage":     progress,
        "questionCount": next_slot,
        "evaluation":   evaluation,
    }


# ── Lambda handler ────────────────────────────────────────────────

def lambda_handler(event, context):
    try:
        print("EVENT:", json.dumps(event)[:500])
        method = event.get("requestContext", {}).get("http", {}).get("method", "")
        path   = event.get("rawPath", "")
        params = event.get("pathParameters") or {}

        if method == "OPTIONS":
            return build_response(200, {"message": "ok"})

        if method == "POST" and "/assessment/start" in path:
            body = parse_body(event)
            return build_response(200, start_assessment(body.get("userId"), body.get("role"), body.get("level")))

        if method == "POST" and "/answer" in path:
            body = parse_body(event)
            sid  = params.get("sessionId")
            qid  = body.get("questionId")
            if not sid or not qid:
                return build_response(400, {"message": "Missing sessionId or questionId"})
            result = process_answer(sid, qid, body.get("answer"), body.get("startedAtIso"), body.get("endedAtIso"))
            return build_response(200, result)

        if method == "GET" and "/report" in path:
            sid = params.get("sessionId")
            if not sid:
                return build_response(400, {"message": "sessionId required"})
            return build_response(200, generate_report_for_session(sid))

        if method == "GET" and "/users/" in path and "/assessments" in path:
            parts = path.strip("/").split("/")
            try:   uid = parts[parts.index("users") + 1]
            except: uid = None
            if not uid:
                return build_response(400, {"message": "userId required"})
            tbl  = get_table("ASSESSMENT_SESSIONS_TABLE")
            resp = tbl.scan(FilterExpression="userId = :uid", ExpressionAttributeValues={":uid": uid})
            return build_response(200, [decimal_to_native(i) for i in resp.get("Items", [])])

        return build_response(405, {"message": "Method not allowed"})

    except Exception as e:
        traceback.print_exc()
        return build_response(500, {"message": str(e)})
