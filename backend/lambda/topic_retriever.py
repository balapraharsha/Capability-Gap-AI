"""
Topic Retriever

This module provides access to competency frameworks used in the
assessment system. A competency framework defines the set of skills
that should be evaluated for a particular role.

For example:
- A backend engineer might be evaluated on system design, debugging,
  and scalability.
- A data scientist might be evaluated on experimentation, technical
  analysis, and problem solving.

The module retrieves these competency lists from the central
`competency_tracker` module and exposes simple helper functions
to access them.

It also includes a Lambda handler so external services (such as the
frontend or API gateway) can request the competency framework
for a specific role.
"""

from typing import Dict, List

from competency_tracker import COMPETENCY_FRAMEWORKS, get_competency_framework


def get_competency_framework_for_role(role: str) -> List[str]:
    """
    Return the list of competencies that should be evaluated
    for the given role.
    """
    return get_competency_framework(role)


def get_all_frameworks() -> Dict[str, List[str]]:
    """
    Return all competency frameworks for every supported role.
    """
    return dict(COMPETENCY_FRAMEWORKS)


def handler(event, _context):
    """
    Lambda entry point used to retrieve competencies for a role.
    The role can be provided either directly in the event or
    through API path parameters.
    """

    import json

    # Extract role from request
    role = event.get("role") or (event.get("pathParameters") or {}).get("role")

    if not role:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "role is required"}),
        }

    # Retrieve competency framework for the role
    competencies = get_competency_framework_for_role(role)

    # Return the competencies as a JSON response
    return {
        "statusCode": 200,
        "body": json.dumps({"competencies": competencies}),
    }