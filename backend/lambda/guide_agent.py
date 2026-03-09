"""
Guide Agent

This module implements the Guide Agent used in the assessment pipeline.
Its purpose is to help candidates improve their reasoning by asking
reflective questions rather than giving direct answers.

The Guide Agent receives:
- The original question
- The candidate's answer
- The Observer Agent's reasoning summary
- The Critic Agent's evaluation feedback

Using this information, it generates Socratic prompts that encourage the
candidate to rethink assumptions, consider constraints, and analyze
trade-offs. The goal is to deepen thinking rather than reveal the solution.

The agent communicates with an AI model hosted on AWS Bedrock and expects
a JSON response containing:
- a short guiding prompt
- a list of reflective questions

If the Bedrock client is unavailable (for example during local testing),
the module returns a predefined fallback response.

This agent is part of the multi-agent evaluation pipeline:

Observer → Critic → Guide
"""

from typing import Any, Dict

from common import get_bedrock_client, invoke_bedrock_json


# Bedrock model used to generate Socratic guidance
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


def run_guide(question: str, answer: str, observer: Dict[str, Any], critic: Dict[str, Any]) -> Dict[str, Any]:
  """
  Generate guiding prompts that help the candidate reflect on their answer.

  Instead of providing solutions, the Guide Agent asks questions that push
  the candidate to reconsider assumptions, evaluate trade-offs, and explore
  potential weaknesses in their reasoning.
  """

  # Create Bedrock runtime client
  client = get_bedrock_client()

  # System prompt defines the role and expected output structure
  system_prompt = (
    "You are a Socratic Guide Agent helping a student improve their reasoning. "
    "You must NOT provide the full solution. Instead, ask 2-4 reflective questions "
    "that nudge them to examine assumptions, constraints, edge cases, and trade-offs.\n"
    "Return strictly JSON with fields: prompt (string) and questions (list of strings)."
  )

  # User prompt contains the full context used to generate guidance
  user_prompt = (
    f"Question:\n{question}\n\n"
    f"Candidate answer:\n{answer}\n\n"
    f"Observer summary:\n{observer.get('summary', '')}\n\n"
    f"Critic feedback:\n{critic.get('feedback', '')}\n\n"
    "Write a brief guiding prompt and 2-4 questions that will help them deepen their thinking "
    "without giving away the full answer."
  )

  # If Bedrock client is unavailable, return fallback guidance for testing
  if client is None:
    return {
      "prompt": "Take a moment to stress-test your reasoning before moving on.",
      "questions": [
        "What explicit constraints (latency, cost, data quality, reliability) are you optimizing for?",
        "Where could your approach fail under edge cases or higher scale, and how would you detect that?",
        "Which trade-offs did you intentionally make, and what alternatives did you consider but reject?",
      ],
    }

  # Invoke Bedrock model and return structured JSON guidance
  return invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)


def handler(event, _context):
  """
  Lambda entry point for directly invoking the Guide Agent.

  Extracts request data from the event body, runs the guide agent,
  and returns the generated prompt and reflective questions.
  """

  body = event.get("body") or "{}"
  import json

  # Ensure request body is a dictionary
  if not isinstance(body, dict):
    body = json.loads(body)

  # Extract input parameters
  question = body.get("question", "")
  answer = body.get("answer", "")
  observer = body.get("observer", {})
  critic = body.get("critic", {})

  # Generate guidance
  result = run_guide(question, answer, observer, critic)

  # Return HTTP response
  return {
    "statusCode": 200,
    "body": json.dumps(result),
  }