"""
Competency Tracker – tracks tested vs remaining competencies and confidence score.
Assessment continues until competency coverage ≥ 80% and confidence score ≥ 0.75.
"""
from typing import Any, Dict, List, Optional, Tuple


# Competency frameworks per role
COMPETENCY_FRAMEWORKS: Dict[str, List[str]] = {
    "data-analyst": [
        "technical_analysis",
        "business_metrics",
        "problem_solving",
        "communication",
        "adaptability",
        "stakeholder_thinking",
    ],
    "data-scientist": [
        "technical_analysis",
        "experimentation",
        "problem_solving",
        "communication",
        "adaptability",
        "stakeholder_thinking",
    ],
    "backend-engineer": [
        "system_design",
        "scalability",
        "debugging",
        "tradeoff_reasoning",
        "communication",
        "ownership",
    ],
    "ml-engineer": [
        "system_design",
        "model_serving",
        "debugging",
        "tradeoff_reasoning",
        "communication",
        "ownership",
    ],
    "product-manager": [
        "product_thinking",
        "business_metrics",
        "prioritization",
        "communication",
        "stakeholder_thinking",
        "adaptability",
    ],
    "cloud-engineer": [
        "system_design",
        "scalability",
        "cost_optimization",
        "tradeoff_reasoning",
        "debugging",
        "ownership",
    ],
}

COVERAGE_THRESHOLD = 0.80
CONFIDENCE_THRESHOLD = 0.75


def get_competency_framework(role: str) -> List[str]:
    """Return the list of competencies for a role."""
    return COMPETENCY_FRAMEWORKS.get(
        role,
        ["technical_expertise", "problem_solving", "communication", "adaptability", "leadership", "decision_making"],
    ).copy()


def init_tracker(role: str) -> Dict[str, Any]:
    """Initialize tracker state with all competencies remaining."""
    competencies = get_competency_framework(role)
    return {
        "tested": [],
        "remaining": competencies.copy(),
        "scores": {},  # competency -> list of scores (0-1)
        "confidence": 0.0,
        "coverage": 0.0,
    }


def _compute_confidence(scores: Dict[str, List[float]]) -> float:
    """
    Compute overall confidence in our assessment (0-1).
    Higher when we have more data points and scores are consistent.
    """
    if not scores:
        return 0.0
    total_obs = sum(len(v) for v in scores.values())
    if total_obs < 2:
        return 0.3
    if total_obs < 4:
        return 0.5
    if total_obs < 6:
        return 0.65
    if total_obs < 8:
        return 0.75
    return min(1.0, 0.75 + (total_obs - 8) * 0.03)


def _compute_coverage(tested: List[str], total: int) -> float:
    """Proportion of competencies that have been evaluated."""
    if total == 0:
        return 1.0
    return len(tested) / total


def update(
    tracker: Dict[str, Any],
    competency: str,
    score: float,
) -> Dict[str, Any]:
    """
    Update tracker after evaluating an answer for a given competency.
    Moves competency from remaining to tested and records the score.
    Returns updated tracker.
    """
    tested = list(tracker.get("tested", []))
    remaining = list(tracker.get("remaining", []))
    scores = dict(tracker.get("scores", {}))

    if competency in remaining:
        remaining.remove(competency)
        tested.append(competency)

    if competency not in scores:
        scores[competency] = []
    scores[competency].append(max(0.0, min(1.0, score)))

    total = len(tested) + len(remaining)
    coverage = _compute_coverage(tested, total)
    confidence = _compute_confidence(scores)

    tracker["tested"] = tested
    tracker["remaining"] = remaining
    tracker["scores"] = scores
    tracker["coverage"] = coverage
    tracker["confidence"] = confidence
    return tracker


def should_continue(tracker: Dict[str, Any], question_count: int = 0) -> bool:
    """Assessment continues until coverage ≥ 80%, confidence ≥ 0.75, or 10 questions answered."""
    MAX_QUESTIONS = 10
    if question_count >= MAX_QUESTIONS:
        return False
    coverage = tracker.get("coverage", 0)
    confidence = tracker.get("confidence", 0)
    remaining = tracker.get("remaining", [])
    if not remaining:
        return False
    if coverage >= COVERAGE_THRESHOLD and confidence >= CONFIDENCE_THRESHOLD:
        return False
    return True


def get_next_competency(tracker: Dict[str, Any]) -> Optional[str]:
    """Pick the next competency to evaluate. Prefers remaining ones not yet tested."""
    remaining = tracker.get("remaining", [])
    if not remaining:
        return None
    return remaining[0]


def get_competency_scores(tracker: Dict[str, Any]) -> Dict[str, float]:
    """Return per-competency average score (0-1)."""
    scores = tracker.get("scores", {})
    return {c: sum(v) / len(v) if v else 0.0 for c, v in scores.items()}