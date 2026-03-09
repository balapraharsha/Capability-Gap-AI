"""
Report Generator

This module produces the final capability report for an assessment session.

The report evaluates the candidate across nine core skill dimensions that
represent different aspects of engineering and decision-making ability.
These dimensions combine results from scenario questions, technical tasks,
observer analysis, critic scoring, and response timing.

Nine evaluated skill dimensions:

1. Decision Making
   Performance in scenario-based decision questions and trade-off reasoning.

2. Debugging Ability
   Ability to identify and reason about bugs in code.

3. Code Correctness
   Skill at writing or fixing code that behaves correctly across cases.

4. Code Quality
   Awareness of maintainability, security, and best practices during reviews.

5. Incident Diagnosis
   Ability to interpret logs and trace production issues.

6. Algorithmic Thinking
   Understanding of algorithm complexity and optimisation trade-offs.

7. Communication Clarity
   Ability to clearly explain reasoning and thought process.

8. Adaptability Under Pressure
   Performance when unexpected complications are introduced.

9. Technical Depth
   Overall technical capability inferred from critic scoring.

The report generator aggregates scores from all questions, calculates
overall readiness, identifies strengths and capability gaps, and optionally
uses an AI model to produce a narrative summary and learning recommendations.
"""

from typing import Any, Dict, List
from common import _iso_now, build_response, decimal_to_native, get_bedrock_client, get_table, invoke_bedrock_json

# Bedrock model used to generate narrative feedback
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


# Map raw competencies from questions to the standardized nine skill dimensions
COMPETENCY_TO_SKILL = {
    "decision_making":       "decision_making",
    "problem_solving":       "decision_making",
    "prioritization":        "decision_making",
    "adaptability":          "adaptability_under_pressure",
    "leadership":            "decision_making",

    "debugging":             "debugging_ability",
    "code_correctness":      "code_correctness",
    "code_quality":          "code_quality",
    "incident_diagnosis":    "incident_diagnosis",
    "algorithmic_thinking":  "algorithmic_thinking",

    "communication":         "communication_clarity",
    "stakeholder_thinking":  "communication_clarity",

    "ownership":             "technical_depth",
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


# The nine standardized skills used for final reporting
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


# Metadata describing each skill dimension
SKILL_META = {
    "decision_making": {"label": "Decision Making", "description": "Ability to make sound decisions under constraints and ambiguity"},
    "debugging_ability": {"label": "Debugging Ability", "description": "Skill at identifying bugs and reasoning about code correctness"},
    "code_correctness": {"label": "Code Correctness", "description": "Ability to write and fix code that handles all cases correctly"},
    "code_quality": {"label": "Code Quality", "description": "Awareness of best practices, security, and maintainability in code reviews"},
    "incident_diagnosis": {"label": "Incident Diagnosis", "description": "Ability to trace root causes from logs and stack traces"},
    "algorithmic_thinking": {"label": "Algorithmic Thinking", "description": "Understanding of complexity and algorithm trade-offs"},
    "communication_clarity": {"label": "Communication Clarity", "description": "Ability to articulate reasoning clearly"},
    "adaptability_under_pressure": {"label": "Adaptability Under Pressure", "description": "Performance when complications arise"},
    "technical_depth": {"label": "Technical Depth", "description": "Breadth and depth of technical knowledge"},
}


# Score ranges mapped to performance labels
SCORE_LABELS = {
    (0.0, 0.4): ("Needs Work", "Critical gaps identified in this area"),
    (0.4, 0.6): ("Developing", "Some foundational skills present but inconsistent"),
    (0.6, 0.75): ("Competent", "Solid understanding with room to grow"),
    (0.75, 0.88): ("Proficient", "Strong performance with minor gaps"),
    (0.88, 1.01): ("Expert", "Exceptional capability demonstrated"),
}


def get_score_label(score: float):
    """Return a performance label based on a normalized score."""
    for (lo, hi), (label, desc) in SCORE_LABELS.items():
        if lo <= score < hi:
            return label, desc
    return "Competent", ""


def _map_answers_to_nine_skills(answers: List[Dict[str, Any]]) -> Dict[str, List[float]]:
    """
    Convert answer-level competency scores into skill buckets
    corresponding to the nine skill dimensions.
    """
    buckets: Dict[str, List[float]] = {skill: [] for skill in NINE_SKILLS}

    for a in answers:
        comp = a.get("competency", "")
        score = float(a.get("competencyScore", 0.5))

        skill = COMPETENCY_TO_SKILL.get(comp, "technical_depth")
        buckets[skill].append(score)

        # If a scenario complication occurred, treat it as adaptability pressure
        q = a.get("question", {})
        if q.get("complicationText") or q.get("chainStep") is not None:
            buckets["adaptability_under_pressure"].append(score)

        # Observer score approximates communication clarity
        obs = a.get("observer", {})
        obs_score = obs.get("score")
        if obs_score is not None:
            buckets["communication_clarity"].append(float(obs_score) / 5.0)

    return buckets


def _compute_nine_skills(buckets: Dict[str, List[float]]) -> Dict[str, float]:
    """
    Compute the average score for each skill dimension.
    Skills with no data default to a neutral score of 0.5.
    """
    result = {}
    for skill in NINE_SKILLS:
        vals = buckets.get(skill, [])
        result[skill] = round(sum(vals) / len(vals), 3) if vals else 0.5
    return result


def generate_report_for_session(session_id: str) -> Dict[str, Any]:
    """
    Build the final capability report for a completed assessment session.
    """

    sessions_table = get_table("ASSESSMENT_SESSIONS_TABLE")
    answers_table = get_table("ANSWERS_TABLE")

    # Load session information
    session_resp = sessions_table.get_item(Key={"sessionId": session_id})
    session = session_resp.get("Item")
    if not session:
        raise ValueError("Session not found")

    session = decimal_to_native(session)

    # Load all answers associated with this session
    answers_resp = answers_table.query(
        KeyConditionExpression="sessionId = :sid",
        ExpressionAttributeValues={":sid": session_id},
    )

    answers: List[Dict[str, Any]] = [
        decimal_to_native(a) for a in answers_resp.get("Items", [])
    ]

    # Compute skill scores
    buckets = _map_answers_to_nine_skills(answers)
    nine_skill_scores = _compute_nine_skills(buckets)

    # Calculate overall readiness score
    overall = sum(nine_skill_scores.values()) / len(nine_skill_scores)
    overall_pct = round(overall * 100)

    # Calculate average response time
    avg_response_time_sec = sum(
        float(a.get("responseTimeSec") or 0) for a in answers
    ) / max(len(answers), 1)

    # Identify strengths and weaknesses
    weak_skills = [s for s, v in nine_skill_scores.items() if v < 0.65]
    strong_skills = [s for s, v in nine_skill_scores.items() if v >= 0.75]

    # Generate narrative summary using Bedrock (optional)
    client = get_bedrock_client()

    if client is None:
        strengths = [SKILL_META[s]["label"] for s in strong_skills] or ["Demonstrated structured reasoning"]
        weaknesses = [SKILL_META[s]["label"] for s in weak_skills] or ["Needs further assessment"]
        learning_recs = [f"Practice {SKILL_META[s]['label'].lower()}" for s in weak_skills]
        narrative_summary = f"Assessment complete. Overall readiness: {overall_pct}%."

    else:
        system_prompt = (
            "You generate a precise capability gap report for a technical interview platform. "
            "Return ONLY valid JSON with strengths, weaknesses, learningRecommendations, and narrativeSummary."
        )

        user_prompt = (
            f"Role: {session['role']}, Level: {session['level']}\n"
            f"9 Skill scores: {nine_skill_scores}\n"
            f"Weak skills: {[SKILL_META[s]['label'] for s in weak_skills]}\n"
            f"Strong skills: {[SKILL_META[s]['label'] for s in strong_skills]}\n"
            f"Overall readiness: {overall_pct}%"
        )

        data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)

        strengths = data.get("strengths", [])
        weaknesses = data.get("weaknesses", [])
        learning_recs = data.get("learningRecommendations", [])
        narrative_summary = data.get("narrativeSummary", "")

    # Build enriched skill objects
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
        "nineSkills": enriched_skills,
        "nineSkillScores": nine_skill_scores,
        "weakSkills": weak_skills,
        "strongSkills": strong_skills,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "learningRecommendations": learning_recs,
        "timeAnalysis": {
            "averageResponseTimeMinutes": round(avg_response_time_sec / 60.0, 1),
        },
        "generatedAt": _iso_now(),
    }

    return report