"""
Answer Evaluation Pipeline

This module processes a candidate's submitted answer during an assessment.
It coordinates multiple AI agents that analyze and evaluate the response.

The evaluation pipeline works as follows:

1. Observer Agent
   - Reconstructs the reasoning structure behind the candidate's answer.
   - Identifies assumptions, reasoning steps, constraints, and trade-offs.

2. Critic Agent
   - Evaluates the quality of the decision or reasoning.
   - Assigns competency scores such as analytical thinking,
     problem solving, communication, ownership, adaptability,
     and decision making.

3. Guide Agent
   - Generates Socratic prompts to help the candidate reflect
     on their reasoning without revealing the solution.

After evaluation, the results are stored in DynamoDB and returned
to the frontend as structured feedback.

This module acts as the core answer-processing stage in the
assessment workflow.
"""

from typing import Any, Dict, List

from common import (
  _iso_now,
  build_response,
  compute_readiness_from_metrics,
  get_bedrock_client,
  get_table,
  invoke_bedrock_json,
  parse_body,
)
from critic_agent import run_critic
from guide_agent import run_guide


# Bedrock model used for reasoning extraction
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


def run_observer(question: str, answer: str) -> Dict[str, Any]:
  """
  Observer Agent analyzes the candidate's answer and reconstructs
  the reasoning structure behind it.
  """

  # Create Bedrock runtime client
  client = get_bedrock_client()

  # System prompt defines the Observer agent's role and output format
  system_prompt = (
    "You are an Observer Agent analyzing a candidate's reasoning. "
    "Extract the structure of their thinking without judging it.\n"
    "Return strictly JSON with fields: assumptions (list of strings), "
    "reasoningSteps (list of strings), constraints (list of strings), "
    "tradeoffs (list of strings), confidence (0-1 float), and summary (string)."
  )

  # User prompt contains the question and the candidate's answer
  user_prompt = (
    f"Question:\n{question}\n\n"
    f"Candidate answer:\n{answer}\n\n"
    "Carefully reconstruct the reasoning structure."
  )

  # If Bedrock is unavailable (local development), return a mock response
  if client is None:
    return {
      "assumptions": ["Candidate made implicit assumptions that are not fully specified."],
      "reasoningSteps": ["High-level steps reconstructed heuristically from the answer."],
      "constraints": ["Constraints mentioned or implied in the answer."],
      "tradeoffs": ["Trade-offs candidate appears to be considering."],
      "confidence": 0.7,
      "summary": "Observed outline of the candidate's reasoning structure.",
    }

  # Invoke Bedrock model and return structured JSON
  return invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)


def derive_metrics(observer: Dict[str, Any], critic: Dict[str, Any], response_time_sec: float) -> Dict[str, Any]:
  """
  Combine observer and critic insights to produce quantitative metrics.
  """
  # Critic agent already generates competency scores
  metrics = critic.get("metrics", {})

  # Add response time as an additional metric
  metrics["responseTimeSec"] = response_time_sec

  return metrics


def handle_answer(event: Dict[str, Any]) -> Dict[str, Any]:
  """
  Process a submitted answer and run it through the evaluation pipeline.
  """

  # Extract session ID from the request path
  path_params = event.get("pathParameters") or {}
  session_id = path_params.get("sessionId")

  if not session_id:
    return build_response(400, {"message": "sessionId is required"})

  # Parse request body
  body = parse_body(event)

  question_id = body.get("questionId")
  answer = body.get("answer") or ""
  started_at = body.get("startedAtIso")
  ended_at = body.get("endedAtIso")

  # Validate required fields
  if not question_id or not answer or not started_at or not ended_at:
    return build_response(
      400,
      {"message": "questionId, answer, startedAtIso and endedAtIso are required"},
    )

  # Calculate response time
  from datetime import datetime

  start_ts = datetime.fromisoformat(started_at)
  end_ts = datetime.fromisoformat(ended_at)

  response_time_sec = max(1.0, (end_ts - start_ts).total_seconds())

  # Load the original question from DynamoDB
  questions_table = get_table("QUESTIONS_TABLE")

  question_resp = questions_table.get_item(
    Key={"sessionId": session_id, "questionId": question_id}
  )

  question = question_resp.get("Item") or {}
  question_text = question.get("text", "")

  # Run evaluation agents
  observer = run_observer(question_text, answer)
  critic = run_critic(question_text, answer, observer)
  guide = run_guide(question_text, answer, observer, critic)

  # Generate final metrics
  metrics = derive_metrics(observer, critic, response_time_sec)

  # Store evaluation results in DynamoDB
  evaluations_table = get_table("EVALUATION_RESULTS_TABLE")

  evaluations_table.put_item(
    Item={
      "sessionId": session_id,
      "questionId": question_id,
      "answer": answer,
      "observer": observer,
      "critic": critic,
      "guide": guide,
      "metrics": metrics,
      "createdAt": _iso_now(),
    }
  )

  # Build response payload for frontend
  payload = {
    "sessionId": session_id,
    "questionId": question_id,
    "answer": answer,
    "observerSummary": observer.get("summary", ""),
    "criticFeedback": critic.get("feedback", ""),
    "guidePrompt": guide.get("prompt", ""),
    "metrics": metrics,
  }

  return build_response(200, payload)


def handler(event, _context):
  """
  Lambda entry point for answer processing.
  Routes HTTP requests to the correct handler.
  """

  if event.get("httpMethod") == "OPTIONS":
    return build_response(200, {"message": "ok"})

  if event.get("httpMethod") == "POST":
    return handle_answer(event)

  return build_response(405, {"message": "Method not allowed"})