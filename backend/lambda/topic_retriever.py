"""
Topic Retriever – loads competency frameworks for roles.
Competency frameworks define which competencies each role evaluates.
"""
from typing import Dict, List

from competency_tracker import COMPETENCY_FRAMEWORKS, get_competency_framework


def get_competency_framework_for_role(role: str) -> List[str]:
    """Return the competency framework for a given role."""
    return get_competency_framework(role)


def get_all_frameworks() -> Dict[str, List[str]]:
    """Return all role-to-competency mappings."""
    return dict(COMPETENCY_FRAMEWORKS)


def handler(event, _context):
    """Lambda handler for topic/competency retrieval."""
    import json
    role = event.get("role") or (event.get("pathParameters") or {}).get("role")
    if not role:
        return {"statusCode": 400, "body": json.dumps({"message": "role is required"})}
    competencies = get_competency_framework_for_role(role)
    return {"statusCode": 200, "body": json.dumps({"competencies": competencies})}
