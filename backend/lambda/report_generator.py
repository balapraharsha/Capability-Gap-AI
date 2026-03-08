"""
Report Generator – produces final capability report from adaptive assessment.
Includes per-competency scores, weak areas, and recommended learning.
"""
from typing import Any, Dict, List

from common import _iso_now, build_response, decimal_to_native, get_bedrock_client, get_table, invoke_bedrock_json


BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


def _aggregate_competency_scores(answers: List[Dict[str, Any]]) -> Dict[str, float]:
    """Aggregate per-competency scores (0-1) from answers."""
    by_comp: Dict[str, List[float]] = {}
    for a in answers:
        comp = a.get("competency")
        sc = a.get("competencyScore", 0)
        if comp:
            if comp not in by_comp:
                by_comp[comp] = []
            by_comp[comp].append(float(sc))
    return {c: sum(v) / len(v) if v else 0.0 for c, v in by_comp.items()}


def generate_report_for_session(session_id: str) -> Dict[str, Any]:
    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    answers_table = get_table("ANSWERS_TABLE")
    # NOTE: No REPORTS_TABLE - we return the report directly without persisting it

    session_resp = sessions_table.get_item(Key={"sessionId": session_id})
    session = session_resp.get("Item")
    if not session:
        raise ValueError("Session not found")

    # Convert DynamoDB Decimals before processing
    session = decimal_to_native(session)

    answers_resp = answers_table.query(
        KeyConditionExpression="sessionId = :sid",
        ExpressionAttributeValues={":sid": session_id},
    )
    answers: List[Dict[str, Any]] = [decimal_to_native(a) for a in answers_resp.get("Items", [])]

    competency_scores = _aggregate_competency_scores(answers)
    overall = sum(competency_scores.values()) / len(competency_scores) if competency_scores else 0.0
    overall_pct = round(overall * 100)

    avg_response_time_sec = sum(float(a.get("responseTimeSec") or 0) for a in answers) / max(len(answers), 1)

    client = get_bedrock_client()
    critic_issues: List[str] = []
    for a in answers:
        critic = (a.get("critic") or {})
        critic_issues.extend(critic.get("issues", []))

    weak_areas: List[str] = [c for c, s in competency_scores.items() if s < 0.7]

    if client is None:
        strengths = ["logical reasoning", "structured investigation approach"]
        weaknesses = ["missing hypothesis design", "weak metric definition", "limited experiment reasoning"]
        learning_recs = [
            "hypothesis-driven analysis",
            "business metric design",
            "experiment design fundamentals",
        ]
    else:
        system_prompt = (
            "You generate a concise capability gap report. "
            "Return strictly JSON: strengths (list), weaknesses (list), learningRecommendations (list)."
        )
        user_prompt = (
            f"Role: {session['role']}, Level: {session['level']}\n"
            f"Competency scores (0-1): {competency_scores}\n"
            f"Weak areas (score < 0.7): {weak_areas}\n"
            f"Critic issues: {critic_issues}\n"
            "Produce strengths, weaknesses, and learning recommendations."
        )
        data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)
        strengths = data.get("strengths") or [f"Strong performance in {c}" for c in competency_scores if competency_scores[c] >= 0.7] or ["Demonstrated reasonable decision-making"]
        weaknesses = data.get("weaknesses") or weak_areas or ["Needs further assessment"]
        learning_recs = data.get("learningRecommendations") or [f"Practice {c.replace('_', ' ')}" for c in weak_areas] or ["Continue practicing role-specific scenarios"]

    report = {
        "sessionId": session_id,
        "role": session["role"],
        "level": session["level"],
        "overallReadiness": overall_pct,
        "competencyScores": competency_scores,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "weakAreas": weak_areas,
        "learningRecommendations": learning_recs,
        "recommendedLearning": learning_recs,
        "timeAnalysis": {
            "averageResponseTimeMinutes": round(avg_response_time_sec / 60.0, 1),
        },
        "generatedAt": _iso_now(),
    }

    # Try to persist to CompetencyScores table if env var is set (optional)
    import os
    scores_table_name = os.getenv("COMPETENCY_SCORES_TABLE")
    if scores_table_name:
        try:
            from decimal import Decimal
            def _floats_to_decimal(obj):
                if isinstance(obj, float):
                    return Decimal(str(obj))
                if isinstance(obj, dict):
                    return {k: _floats_to_decimal(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [_floats_to_decimal(v) for v in obj]
                return obj
            scores_table = get_table("COMPETENCY_SCORES_TABLE")
            scores_table.put_item(Item=_floats_to_decimal({
                "sessionId": session_id,
                "competency": "overall",
                "scores": competency_scores,
                "overallReadiness": overall_pct,
                "generatedAt": _iso_now(),
            }))
        except Exception as e:
            print(f"Warning: Could not save to scores table: {e}")

    return report




def handler(event, _context):
    if event.get("httpMethod") == "OPTIONS":
        return build_response(200, {"message": "ok"})

    http_method = event.get("httpMethod")
    path = event.get("resource") or ""
    path_params = event.get("pathParameters") or {}

    if http_method == "GET" and "report" in path:
        session_id = path_params.get("sessionId")
        if not session_id:
            return build_response(400, {"message": "sessionId is required"})
        try:
            report = generate_report_for_session(session_id)
            return build_response(200, report)
        except ValueError as e:
            return build_response(404, {"message": str(e)})

    if http_method == "GET" and "assessments" in path:
        user_id = path_params.get("userId")
        if not user_id:
            return build_response(400, {"message": "userId is required"})
        sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
        resp = sessions_table.scan(
            FilterExpression="userId = :uid",
            ExpressionAttributeValues={":uid": user_id},
        )
        items = resp.get("Items", [])
        return build_response(200, items)

    return build_response(405, {"message": "Method not allowed"})