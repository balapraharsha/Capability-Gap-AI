from typing import Any, Dict

from common import get_bedrock_client, invoke_bedrock_json


BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


def run_critic(question: str, decision: str, observer: Dict[str, Any]) -> Dict[str, Any]:
    """
    Critic Agent evaluates decision quality for a scenario-based MCQ.
    It focuses on analytical thinking, problem solving, communication, ownership, and decision making.

    Expected JSON shape:
    {
      "feedback": "text",
      "issues": ["..."],
      "metrics": {
        "analyticalThinking": 1-5,
        "problemSolving": 1-5,
        "communication": 1-5,
        "ownership": 1-5,
        "adaptability": 1-5,
        "decisionMaking": 1-5
      }
    }
    """
    client = get_bedrock_client()
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
    user_prompt = (
        f"Scenario and question:\n{question}\n\n"
        f"Candidate decision (selected option):\n{decision}\n\n"
        f"Observer reconstruction of their thinking:\n{observer}\n\n"
        "Evaluate the decision quality against the requested competencies. "
        "Highlight both strengths and capability gaps."
    )

    if client is None:
        # Mock behaviour: assign reasonable mid–high scores based on decision text length.
        length = len(decision.split())
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

    return invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)


def handler(event, _context):
    # Optional direct invocation wrapper.
    body = event.get("body") or "{}"
    import json

    if not isinstance(body, dict):
        body = json.loads(body)
    question = body.get("question", "")
    decision = body.get("answer", "")
    observer = body.get("observer", {})
    result = run_critic(question, decision, observer)
    return {
        "statusCode": 200,
        "body": json.dumps(result),
    }