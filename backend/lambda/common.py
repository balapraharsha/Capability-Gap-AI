import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import boto3


def _iso_now() -> str:
  return datetime.now(timezone.utc).isoformat()


def _get_env(name: str) -> str:
  value = os.getenv(name)
  if not value:
    raise RuntimeError(f"Missing required environment variable: {name}")
  return value


def get_dynamodb():
  return boto3.resource("dynamodb")


def get_table(name_env: str):
  table_name = _get_env(name_env)
  return get_dynamodb().Table(table_name)


def generate_session_id() -> str:
  return str(uuid.uuid4())


def generate_question_id() -> str:
  return str(uuid.uuid4())


import json

def parse_body(event):
    body = event.get("body")

    if body is None:
        return {}

    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {}

    return body

import json
from decimal import Decimal

# Custom encoder to handle DynamoDB Decimals
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert decimal to float or int
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def decimal_to_native(obj):
    """Recursively convert Decimal objects from DynamoDB reads to int/float."""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    return obj

def build_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", # Ensure CORS works
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        # Sanitize Decimals before serializing (handles nested DynamoDB reads)
        "body": json.dumps(decimal_to_native(body))
    }

def get_bedrock_client():
  # Force Bedrock to use a region where the models are active
  bedrock_runtime = boto3.client(
      service_name='bedrock-runtime',
      region_name='us-east-1'
  )
  return bedrock_runtime  # FIX: was missing return statement

def invoke_bedrock_json(client, model_id, system_prompt, user_prompt):

    response = client.converse(
        modelId=model_id,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "text": f"{system_prompt}\n\n{user_prompt}"
                    }
                ],
            }
        ],
        inferenceConfig={
            "maxTokens": 1024,
            "temperature": 0.3,
        },
    )

    import json
    import re

    text = response["output"]["message"]["content"][0]["text"]

    # Extract first JSON block
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        raise RuntimeError(f"Model response did not contain JSON: {text}")

    json_text = match.group(0)

    import json

    try:
        return json.loads(json_text)
    except json.JSONDecodeError:
        # Attempt to clean formatting issues
        cleaned = json_text.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Final fallback: return structured wrapper
            return {
                "id": "fallback_question",
                "type": "case_study",
                "competency": "problem_solving",
                "text": cleaned
            }

def average(nums: List[float]) -> float:
  return sum(nums) / len(nums) if nums else 0.0


def compute_readiness_from_metrics(
  per_question: List[Dict[str, Any]]
) -> Tuple[Dict[str, float], float]:
  """
  Aggregate per-question metrics into category scores and an overall readiness score.
  """
  tech: List[float] = []
  system: List[float] = []
  comm: List[float] = []
  tradeoffs: List[float] = []

  for m in per_question:
    tech.append(float(m.get("technicalReasoning", 0)))
    system.append(float(m.get("systemThinking", 0)))
    comm.append(float(m.get("communication", 0)))
    tradeoffs.append(float(m.get("decisionTradeoffs", 0)))

  scores = {
    "technicalReasoning": average(tech),
    "systemThinking": average(system),
    "communication": average(comm),
    "decisionTradeoffs": average(tradeoffs),
  }
  overall = average(list(scores.values()))
  return scores, overall


__all__ = [
  "_iso_now",
  "get_table",
  "generate_session_id",
  "generate_question_id",
  "parse_body",
  "build_response",
  "decimal_to_native",
  "get_bedrock_client",
  "invoke_bedrock_json",
  "compute_readiness_from_metrics",
]