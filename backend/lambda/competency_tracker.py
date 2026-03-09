"""
Competency Tracker

This module manages competency tracking during an assessment session.
It keeps track of which competencies have been tested, which ones are
still remaining, and calculates overall coverage and confidence scores.

Each role in the system has a predefined competency framework that
defines the skills the assessment should evaluate. As the candidate
answers questions, their responses are scored and recorded for the
relevant competency.

Main responsibilities of this module:

1. Role Competency Frameworks
   - Defines competency sets for all supported roles.
   - Ensures each role is evaluated on relevant technical and
     decision-making skills.

2. Tracker Initialization
   - Creates the initial tracker state when an assessment starts.
   - All competencies are marked as remaining at the beginning.

3. Tracker Updates
   - Updates tested competencies after each question.
   - Stores score history for each competency.

4. Coverage Calculation
   - Measures how many competencies have been tested compared
     to the total required for the role.

5. Confidence Calculation
   - Estimates how reliable the assessment results are based on
     the number of observations (answers) collected.

6. Assessment Progress Control
   - Determines whether the assessment should continue or stop
     based on coverage and confidence thresholds.

This module is used by the assessment engine to dynamically decide
which competency should be evaluated next and when the assessment
has gathered enough evidence to generate a final report.
"""

from typing import Any, Dict, List, Optional, Tuple

# Competency frameworks define which skills are evaluated for each role.
# Each role has a list of competencies that the assessment engine will test.
COMPETENCY_FRAMEWORKS: Dict[str, List[str]] = {
    "data-analyst": [
        "technical_analysis", "business_metrics", "problem_solving",
        "communication", "adaptability", "stakeholder_thinking",
    ],
    "data-scientist": [
        "technical_analysis", "experimentation", "problem_solving",
        "communication", "adaptability", "stakeholder_thinking",
    ],
    "backend-engineer": [
        "system_design", "scalability", "debugging",
        "tradeoff_reasoning", "communication", "ownership",
    ],
    "ml-engineer": [
        "system_design", "model_serving", "debugging",
        "tradeoff_reasoning", "communication", "ownership",
    ],
    "product-manager": [
        "product_thinking", "business_metrics", "prioritization",
        "communication", "stakeholder_thinking", "adaptability",
    ],
    "cloud-engineer": [
        "system_design", "scalability", "cost_optimization",
        "tradeoff_reasoning", "debugging", "ownership",
    ],
    "ai-ml-architect": [
        "system_design", "model_serving", "technical_analysis",
        "tradeoff_reasoning", "scalability", "ownership",
    ],
    "cloud-architect": [
        "system_design", "scalability", "cost_optimization",
        "tradeoff_reasoning", "communication", "ownership",
    ],
    "devops-engineer": [
        "system_design", "debugging", "scalability",
        "cost_optimization", "tradeoff_reasoning", "ownership",
    ],
    "cybersecurity-specialist": [
        "technical_analysis", "problem_solving", "system_design",
        "tradeoff_reasoning", "communication", "adaptability",
    ],
    "fullstack-developer": [
        "system_design", "debugging", "technical_analysis",
        "tradeoff_reasoning", "communication", "ownership",
    ],
    "big-data-engineer": [
        "system_design", "scalability", "technical_analysis",
        "tradeoff_reasoning", "debugging", "ownership",
    ],
    "iot-architect": [
        "system_design", "scalability", "technical_analysis",
        "tradeoff_reasoning", "debugging", "communication",
    ],
    "blockchain-developer": [
        "system_design", "technical_analysis", "debugging",
        "tradeoff_reasoning", "communication", "ownership",
    ],
}

# Minimum thresholds required before the assessment can stop
COVERAGE_THRESHOLD = 0.80
CONFIDENCE_THRESHOLD = 0.75


def get_competency_framework(role: str) -> List[str]:
    """
    Return the list of competencies associated with a role.
    If the role is not found, a default competency framework is used.
    """
    return COMPETENCY_FRAMEWORKS.get(
        role,
        ["technical_expertise", "problem_solving", "communication",
         "adaptability", "leadership", "decision_making"],
    ).copy()


def init_tracker(role: str) -> Dict[str, Any]:
    """
    Initialize the competency tracker when an assessment session starts.

    - tested: competencies that have already been evaluated
    - remaining: competencies that still need to be tested
    - scores: history of scores for each competency
    - confidence: reliability of the evaluation so far
    - coverage: percentage of competencies already tested
    """
    competencies = get_competency_framework(role)

    return {
        "tested": [],
        "remaining": competencies.copy(),
        "scores": {},
        "confidence": 0.0,
        "coverage": 0.0,
    }


def _compute_confidence(scores: Dict[str, List[float]]) -> float:
    """
    Estimate confidence based on the number of observations collected.
    More evaluated answers increase confidence in the assessment result.
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

    # After enough observations confidence increases gradually
    return min(1.0, 0.75 + (total_obs - 8) * 0.03)


def _compute_coverage(tested: List[str], total: int) -> float:
    """
    Calculate what percentage of competencies have been tested.
    """
    if total == 0:
        return 1.0

    return len(tested) / total


def update(tracker: Dict[str, Any], competency: str, score: float) -> Dict[str, Any]:
    """
    Update the tracker after evaluating an answer.

    Steps:
    1. Mark competency as tested
    2. Record the score for that competency
    3. Recalculate coverage and confidence
    """
    tested = list(tracker.get("tested", []))
    remaining = list(tracker.get("remaining", []))
    scores = dict(tracker.get("scores", {}))

    # Move competency from remaining -> tested
    if competency in remaining:
        remaining.remove(competency)
        tested.append(competency)

    # Store score history for this competency
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
    """
    Decide whether the assessment should continue.

    The assessment stops when:
    - Maximum number of questions is reached
    - All competencies are tested
    - Coverage and confidence thresholds are satisfied
    """
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
    """
    Return the next competency that should be tested.
    Currently selects the first remaining competency.
    """
    remaining = tracker.get("remaining", [])

    if not remaining:
        return None

    return remaining[0]


def get_competency_scores(tracker: Dict[str, Any]) -> Dict[str, float]:
    """
    Compute the average score for each competency.
    """
    scores = tracker.get("scores", {})

    return {c: sum(v) / len(v) if v else 0.0 for c, v in scores.items()}