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


BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


def run_observer(question: str, answer: str) -> Dict[str, Any]:
  """
  Extract assumptions, reasoning steps, constraints, trade-offs, and a confidence score.
  """
  client = get_bedrock_client()
  system_prompt = (
    "You are an Observer Agent analyzing a candidate's reasoning. "
    "Extract the structure of their thinking without judging it.\n"
    "Return strictly JSON with fields: assumptions (list of strings), "
    "reasoningSteps (list of strings), constraints (list of strings), "
    "tradeoffs (list of strings), confidence (0-1 float), and summary (string)."
  )
  user_prompt = (
    f"Question:\n{question}\n\n"
    f"Candidate answer:\n{answer}\n\n"
    "Carefully reconstruct the reasoning structure."
  )

  if client is None:
    # Mock behavior when Bedrock is not available.
    return {
      "assumptions": ["Candidate made implicit assumptions that are not fully specified."],
      "reasoningSteps": ["High-level steps reconstructed heuristically from the answer."],
      "constraints": ["Constraints mentioned or implied in the answer."],
      "tradeoffs": ["Trade-offs candidate appears to be considering."],
      "confidence": 0.7,
      "summary": "Observed outline of the candidate's reasoning structure.",
    }

  return invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)


def derive_metrics(observer: Dict[str, Any], critic: Dict[str, Any], response_time_sec: float) -> Dict[str, Any]:
  """
  Combine observer and critic insights into quantitative metrics.
  """
  # When Bedrock is mocked, critic will already produce suggested numeric scores.
  metrics = critic.get("metrics", {})
  metrics["responseTimeSec"] = response_time_sec
  return metrics


def handle_answer(event: Dict[str, Any]) -> Dict[str, Any]:
  path_params = event.get("pathParameters") or {}
  session_id = path_params.get("sessionId")
  if not session_id:
    return build_response(400, {"message": "sessionId is required"})

  body = parse_body(event)
  question_id = body.get("questionId")
  answer = body.get("answer") or ""
  started_at = body.get("startedAtIso")
  ended_at = body.get("endedAtIso")

  if not question_id or not answer or not started_at or not ended_at:
    return build_response(
      400,
      {"message": "questionId, answer, startedAtIso and endedAtIso are required"},
    )

  from datetime import datetime

  start_ts = datetime.fromisoformat(started_at)
  end_ts = datetime.fromisoformat(ended_at)
  response_time_sec = max(1.0, (end_ts - start_ts).total_seconds())

  # Load question text for better prompts.
  questions_table = get_table("QUESTIONS_TABLE")
  question_resp = questions_table.get_item(Key={"sessionId": session_id, "questionId": question_id})
  question = question_resp.get("Item") or {}
  question_text = question.get("text", "")

  observer = run_observer(question_text, answer)
  critic = run_critic(question_text, answer, observer)
  guide = run_guide(question_text, answer, observer, critic)
  metrics = derive_metrics(observer, critic, response_time_sec)

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
  if event.get("httpMethod") == "OPTIONS":
    return build_response(200, {"message": "ok"})
  if event.get("httpMethod") == "POST":
    return handle_answer(event)
  return build_response(405, {"message": "Method not allowed"})