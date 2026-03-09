"""
Critic Agent

This module evaluates the quality of a candidate's decision during the
assessment process. It acts as an analytical reviewer that examines the
candidate's response to a scenario-based question and determines how well
the decision demonstrates important professional competencies.

The Critic Agent receives three inputs:
1. The scenario and question presented to the candidate.
2. The candidate's selected decision or answer.
3. The reasoning summary produced by the Observer Agent.

Using these inputs, the agent evaluates the decision and produces structured
feedback along with competency scores. The evaluation focuses on skills such
as analytical thinking, problem solving, communication, ownership,
adaptability, and decision making.

The module sends prompts to an AI model hosted on AWS Bedrock and expects
a strict JSON response containing feedback, identified issues, and numeric
scores for each competency.

If the Bedrock service is unavailable, a fallback evaluation is returned so
the system can still function during local testing or development.

This agent is part of the multi-agent evaluation pipeline used by the
assessment engine:
Observer → Critic → Guide
"""

from typing import Any, Dict

from common import get_bedrock_client, invoke_bedrock_json


# Bedrock model used for evaluation
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


def run_critic(question: str, decision: str, observer: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate the quality of the candidate's decision.

    The Critic Agent analyzes the decision and assigns scores for several
    competencies such as analytical thinking, problem solving, communication,
    ownership, adaptability, and decision making.
    """

    # Create a Bedrock runtime client
    client = get_bedrock_client()

    # System prompt defines the role of the AI and the exact JSON format expected
    system_prompt = (
        "You are a Critic Agent evaluating the quality of a candidate's decision in a "
        "realistic workplace scenario. There is NOT a single correct answer; you are judging "
        "the decision quality and reasoning.\n\n"
        "Return STRICT JSON with fields:\n"
        "{\n"
        '  "feedback": "string",\n'
        '  "issues": ["string", ...],\n'
        '  "metrics": {\n'
        '    "analyticalThinking": 1-5,\n'
        '    "problemSolving": 1-5,\n'
        '    "communication": 1-5,\n'
        '    "ownership": 1-5,\n'
        '    "adaptability": 1-5,\n'
        '    "decisionMaking": 1-5\n'
        "  }\n"
        "}\n"
        "Scores are 1 (very weak) to 5 (excellent)."
    )

    # User prompt contains the scenario, the candidate's decision,
    # and the reasoning inferred by the observer agent
    user_prompt = (
        f"Scenario and question:\n{question}\n\n"
        f"Candidate decision (selected option):\n{decision}\n\n"
        f"Observer reconstruction of their thinking:\n{observer}\n\n"
        "Evaluate the decision quality against the requested competencies. "
        "Highlight both strengths and capability gaps."
    )

    # If the Bedrock client is unavailable, return a mock evaluation
    # This allows local testing without calling the model
    if client is None:
        length = len(decision.split())

        # Simple heuristic based on decision length
        base = 3 if length < 5 else 4

        return {
            "feedback": "Decision shows some structured thinking and reasonable prioritisation. "
            "In a real system you would tailor this feedback to the chosen option.",
            "issues": [
                "Consider stating assumptions and risks explicitly.",
                "Communication to stakeholders could be more structured.",
            ],
            "metrics": {
                "analyticalThinking": base,
                "problemSolving": base,
                "communication": base - 1 if base > 1 else 1,
                "ownership": base,
                "adaptability": base,
                "decisionMaking": base,
            },
        }

    # Call Bedrock model and return structured JSON evaluation
    return invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)


def handler(event, _context):
    """
    Lambda entry point used when invoking the critic agent directly.
    It extracts the request body, runs the critic evaluation,
    and returns the result as a JSON response.
    """

    # Retrieve request body
    body = event.get("body") or "{}"

    import json

    # Ensure body is a dictionary
    if not isinstance(body, dict):
        body = json.loads(body)

    # Extract input values
    question = body.get("question", "")
    decision = body.get("answer", "")
    observer = body.get("observer", {})

    # Run critic evaluation
    result = run_critic(question, decision, observer)

    # Return HTTP response
    return {
        "statusCode": 200,
        "body": json.dumps(result),
    }