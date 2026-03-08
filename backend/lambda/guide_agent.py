from typing import Any, Dict

from common import get_bedrock_client, invoke_bedrock_json


BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


def run_guide(question: str, answer: str, observer: Dict[str, Any], critic: Dict[str, Any]) -> Dict[str, Any]:
  """
  Guide Agent provides Socratic prompts to deepen the candidate's thinking,
  without giving direct answers.
  """
  client = get_bedrock_client()
  system_prompt = (
    "You are a Socratic Guide Agent helping a student improve their reasoning. "
    "You must NOT provide the full solution. Instead, ask 2-4 reflective questions "
    "that nudge them to examine assumptions, constraints, edge cases, and trade-offs.\n"
    "Return strictly JSON with fields: prompt (string) and questions (list of strings)."
  )
  user_prompt = (
    f"Question:\n{question}\n\n"
    f"Candidate answer:\n{answer}\n\n"
    f"Observer summary:\n{observer.get('summary', '')}\n\n"
    f"Critic feedback:\n{critic.get('feedback', '')}\n\n"
    "Write a brief guiding prompt and 2-4 questions that will help them deepen their thinking "
    "without giving away the full answer."
  )

  if client is None:
    return {
      "prompt": "Take a moment to stress-test your reasoning before moving on.",
      "questions": [
        "What explicit constraints (latency, cost, data quality, reliability) are you optimizing for?",
        "Where could your approach fail under edge cases or higher scale, and how would you detect that?",
        "Which trade-offs did you intentionally make, and what alternatives did you consider but reject?",
      ],
    }

  return invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)


def handler(event, _context):
  body = event.get("body") or "{}"
  import json

  if not isinstance(body, dict):
    body = json.loads(body)
  question = body.get("question", "")
  answer = body.get("answer", "")
  observer = body.get("observer", {})
  critic = body.get("critic", {})
  result = run_guide(question, answer, observer, critic)
  return {
    "statusCode": 200,
    "body": json.dumps(result),
  }

