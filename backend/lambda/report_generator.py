"""
Report Generator v3
---------------------
Produces a final capability report with 9 distinct skill dimensions:

  1. Decision Making          – scenario chain performance
  2. Debugging Ability        – Q2 debugging question
  3. Code Correctness         – Q3 fix-the-code question
  4. Code Quality             – Q4 code review question
  5. Incident Diagnosis       – Q5 log detective question
  6. Algorithmic Thinking     – Q6 complexity question
  7. Communication Clarity    – observer summaries across all questions
  8. Adaptability Under Pressure – time pressure + complication handling
  9. Technical Depth          – critic scores aggregated across all questions
"""

from typing import Any, Dict, List
from common import _iso_now, build_response, decimal_to_native, get_bedrock_client, get_table, invoke_bedrock_json

BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"

# Maps competency names to the 9 canonical skill dimensions
COMPETENCY_TO_SKILL = {
    # Decision making (scenario chain)
    "decision_making":       "decision_making",
    "problem_solving":       "decision_making",
    "prioritization":        "decision_making",
    "adaptability":          "adaptability_under_pressure",
    "leadership":            "decision_making",
    # Technical skills
    "debugging":             "debugging_ability",
    "code_correctness":      "code_correctness",
    "code_quality":          "code_quality",
    "incident_diagnosis":    "incident_diagnosis",
    "algorithmic_thinking":  "algorithmic_thinking",
    # Soft skills
    "communication":         "communication_clarity",
    "stakeholder_thinking":  "communication_clarity",
    "ownership":             "technical_depth",
    # Catch-all technical
    "technical_analysis":    "technical_depth",
    "technical_expertise":   "technical_depth",
    "system_design":         "technical_depth",
    "scalability":           "technical_depth",
    "tradeoff_reasoning":    "algorithmic_thinking",
    "model_serving":         "technical_depth",
    "business_metrics":      "communication_clarity",
    "experimentation":       "algorithmic_thinking",
    "product_thinking":      "decision_making",
    "cost_optimization":     "algorithmic_thinking",
}

NINE_SKILLS = [
    "decision_making",
    "debugging_ability",
    "code_correctness",
    "code_quality",
    "incident_diagnosis",
    "algorithmic_thinking",
    "communication_clarity",
    "adaptability_under_pressure",
    "technical_depth",
]

SKILL_META = {
    "decision_making":            {"label": "Decision Making",           "description": "Ability to make sound decisions under constraints and ambiguity"},
    "debugging_ability":          {"label": "Debugging Ability",         "description": "Skill at identifying bugs and reasoning about code correctness"},
    "code_correctness":           {"label": "Code Correctness",          "description": "Ability to write and fix code that handles all cases correctly"},
    "code_quality":               {"label": "Code Quality",              "description": "Awareness of best practices, security, and maintainability in code reviews"},
    "incident_diagnosis":         {"label": "Incident Diagnosis",        "description": "Ability to trace root causes from logs, errors, and stack traces"},
    "algorithmic_thinking":       {"label": "Algorithmic Thinking",      "description": "Understanding of complexity, optimisation, and algorithmic trade-offs"},
    "communication_clarity":      {"label": "Communication Clarity",     "description": "Ability to articulate reasoning clearly and concisely"},
    "adaptability_under_pressure":{"label": "Adaptability Under Pressure","description": "Performance when conditions change or complications are introduced"},
    "technical_depth":            {"label": "Technical Depth",           "description": "Breadth and depth of domain-specific technical knowledge"},
}

SCORE_LABELS = {
    (0.0, 0.4):  ("Needs Work",   "Critical gaps identified in this area"),
    (0.4, 0.6):  ("Developing",   "Some foundational skills present but inconsistent"),
    (0.6, 0.75): ("Competent",    "Solid understanding with room to grow"),
    (0.75, 0.88):("Proficient",   "Strong performance with minor gaps"),
    (0.88, 1.01):("Expert",       "Exceptional capability demonstrated"),
}

def get_score_label(score: float):
    for (lo, hi), (label, desc) in SCORE_LABELS.items():
        if lo <= score < hi:
            return label, desc
    return "Competent", ""


def _map_answers_to_nine_skills(answers: List[Dict[str, Any]]) -> Dict[str, List[float]]:
    """Aggregate answer scores into the 9 skill buckets."""
    buckets: Dict[str, List[float]] = {skill: [] for skill in NINE_SKILLS}

    for a in answers:
        comp = a.get("competency", "")
        score = float(a.get("competencyScore", 0.5))
        skill = COMPETENCY_TO_SKILL.get(comp, "technical_depth")
        buckets[skill].append(score)

        # Adaptability bonus: if the question had a complication, measure response time penalty
        q = a.get("question", {})
        if q.get("complicationText") or q.get("chainStep") is not None:
            buckets["adaptability_under_pressure"].append(score)

        # Communication: use observer quality as proxy
        obs = a.get("observer", {})
        obs_score = obs.get("score")
        if obs_score is not None:
            buckets["communication_clarity"].append(float(obs_score) / 5.0)

    return buckets


def _compute_nine_skills(buckets: Dict[str, List[float]]) -> Dict[str, float]:
    """Average each bucket. Unscored skills default to 0.5 (neutral)."""
    result = {}
    for skill in NINE_SKILLS:
        vals = buckets.get(skill, [])
        result[skill] = round(sum(vals) / len(vals), 3) if vals else 0.5
    return result


def generate_report_for_session(session_id: str) -> Dict[str, Any]:
    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    answers_table = get_table("ANSWERS_TABLE")

    session_resp = sessions_table.get_item(Key={"sessionId": session_id})
    session = session_resp.get("Item")
    if not session:
        raise ValueError("Session not found")
    session = decimal_to_native(session)

    answers_resp = answers_table.query(
        KeyConditionExpression="sessionId = :sid",
        ExpressionAttributeValues={":sid": session_id},
    )
    answers: List[Dict[str, Any]] = [decimal_to_native(a) for a in answers_resp.get("Items", [])]

    # ── 9-skill scoring ──────────────────────────────
    buckets = _map_answers_to_nine_skills(answers)
    nine_skill_scores = _compute_nine_skills(buckets)

    # Also keep legacy competency scores for backwards compat
    legacy_scores: Dict[str, List[float]] = {}
    for a in answers:
        comp = a.get("competency")
        sc = float(a.get("competencyScore", 0))
        if comp:
            legacy_scores.setdefault(comp, []).append(sc)
    competency_scores = {c: sum(v) / len(v) for c, v in legacy_scores.items()}

    overall = sum(nine_skill_scores.values()) / len(nine_skill_scores)
    overall_pct = round(overall * 100)

    avg_response_time_sec = sum(float(a.get("responseTimeSec") or 0) for a in answers) / max(len(answers), 1)

    # Weak areas: skills below 0.65
    weak_skills = [s for s, v in nine_skill_scores.items() if v < 0.65]
    strong_skills = [s for s, v in nine_skill_scores.items() if v >= 0.75]

    # ── AI-generated narrative ───────────────────────
    client = get_bedrock_client()
    if client is None:
        strengths = [SKILL_META[s]["label"] for s in strong_skills] or ["Demonstrated structured reasoning"]
        weaknesses = [SKILL_META[s]["label"] for s in weak_skills] or ["Needs further assessment"]
        learning_recs = [f"Practice {SKILL_META[s]['label'].lower()}" for s in weak_skills] or ["Continue practising role-specific scenarios"]
        narrative_summary = f"Assessment complete. Overall readiness: {overall_pct}%."
    else:
        system_prompt = (
            "You generate a precise capability gap report for a technical interview platform. "
            "Return ONLY valid JSON with keys: "
            "strengths (list of 2-3 strings), "
            "weaknesses (list of 2-3 strings), "
            "learningRecommendations (list of 3-4 specific resource/action strings), "
            "narrativeSummary (1-2 sentence executive summary of the candidate's profile)."
        )
        user_prompt = (
            f"Role: {session['role']}, Level: {session['level']}\n"
            f"9 Skill scores (0-1): {nine_skill_scores}\n"
            f"Weak skills (< 0.65): {[SKILL_META[s]['label'] for s in weak_skills]}\n"
            f"Strong skills (>= 0.75): {[SKILL_META[s]['label'] for s in strong_skills]}\n"
            f"Overall readiness: {overall_pct}%\n"
            "Generate strengths, weaknesses, learning recommendations, and a narrative summary."
        )
        data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)
        strengths = data.get("strengths") or [SKILL_META[s]["label"] for s in strong_skills] or ["Demonstrated structured reasoning"]
        weaknesses = data.get("weaknesses") or [SKILL_META[s]["label"] for s in weak_skills] or ["Needs further assessment"]
        learning_recs = data.get("learningRecommendations") or [f"Practice {SKILL_META[s]['label'].lower()}" for s in weak_skills]
        narrative_summary = data.get("narrativeSummary") or f"Assessment complete. Overall readiness: {overall_pct}%."

    # ── Enrich skill scores with labels ─────────────
    enriched_skills = {}
    for skill, score in nine_skill_scores.items():
        label, desc = get_score_label(score)
        meta = SKILL_META.get(skill, {})
        enriched_skills[skill] = {
            "score": score,
            "pct": round(score * 100),
            "label": meta.get("label", skill),
            "description": meta.get("description", ""),
            "performanceLabel": label,
            "performanceDesc": desc,
            "isWeak": score < 0.65,
            "isStrong": score >= 0.75,
        }

    report = {
        "sessionId": session_id,
        "role": session["role"],
        "level": session["level"],
        "overallReadiness": overall_pct,
        "narrativeSummary": narrative_summary,
        # New 9-skill breakdown
        "nineSkills": enriched_skills,
        "nineSkillScores": nine_skill_scores,
        "weakSkills": weak_skills,
        "strongSkills": strong_skills,
        # Legacy fields for backwards compat
        "competencyScores": competency_scores,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "weakAreas": weak_skills,
        "learningRecommendations": learning_recs,
        "recommendedLearning": learning_recs,
        "timeAnalysis": {
            "averageResponseTimeMinutes": round(avg_response_time_sec / 60.0, 1),
        },
        "generatedAt": _iso_now(),
    }

    # Optionally persist
    import os
    scores_table_name = os.getenv("COMPETENCY_SCORES_TABLE")
    if scores_table_name:
        try:
            from decimal import Decimal
            def _f2d(obj):
                if isinstance(obj, float): return Decimal(str(obj))
                if isinstance(obj, dict): return {k: _f2d(v) for k, v in obj.items()}
                if isinstance(obj, list): return [_f2d(v) for v in obj]
                return obj
            scores_table = get_table("COMPETENCY_SCORES_TABLE")
            scores_table.put_item(Item=_f2d({
                "sessionId": session_id,
                "competency": "overall",
                "scores": nine_skill_scores,
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
            return build_response(200, generate_report_for_session(session_id))
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
        return build_response(200, resp.get("Items", []))

    return build_response(405, {"message": "Method not allowed"})
