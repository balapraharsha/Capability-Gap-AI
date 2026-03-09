"""
Common Utility Module for the Assessment Engine

This file contains shared helper functions used across the backend services
of the AI assessment system. The goal of this module is to centralize
common infrastructure logic so that other components of the system can
reuse it without duplicating code.

Main responsibilities of this file:

1. AWS Service Helpers
   - Create and manage DynamoDB connections.
   - Retrieve DynamoDB tables using environment variables.
   - Create a Bedrock runtime client for invoking foundation models.

2. ID and Timestamp Utilities
   - Generate unique session IDs and question IDs using UUID.
   - Provide a standardized UTC timestamp function for database records.

3. API Gateway Utilities
   - Safely parse incoming HTTP request bodies.
   - Build standardized API responses with proper CORS headers.

4. DynamoDB Data Handling
   - Convert DynamoDB Decimal values into native Python types
     so they can be safely serialized to JSON.
   - Provide a custom encoder for JSON serialization when needed.

5. Bedrock Model Invocation
   - Send prompts to AWS Bedrock models.
   - Extract JSON responses from the model output.
   - Handle cases where the model response is not perfectly formatted.

6. Evaluation Aggregation
   - Aggregate per-question evaluation metrics.
   - Compute category scores and an overall readiness score for
     the assessment report.

This module is imported by multiple parts of the backend such as:
- assessment engine
- question generators
- report generation
- AI evaluation agents

By keeping these shared utilities in one place, the system remains
easier to maintain, extend, and debug.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from decimal import Decimal

import boto3


def _iso_now() -> str:
    """Return the current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def _get_env(name: str) -> str:
    """
    Fetch a required environment variable.
    Raises an error if the variable is missing.
    """
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_dynamodb():
    """Create a DynamoDB resource using boto3."""
    return boto3.resource("dynamodb")


def get_table(name_env: str):
    """
    Retrieve a DynamoDB table using the table name
    stored in an environment variable.
    """
    table_name = _get_env(name_env)
    return get_dynamodb().Table(table_name)


def generate_session_id() -> str:
    """Generate a unique session ID."""
    return str(uuid.uuid4())


def generate_question_id() -> str:
    """Generate a unique question ID."""
    return str(uuid.uuid4())


def parse_body(event):
    """
    Safely parse the request body from an API Gateway event.
    Handles cases where the body may already be a dict or a JSON string.
    """
    body = event.get("body")

    if body is None:
        return {}

    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {}

    return body


class DecimalEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that converts DynamoDB Decimal objects
    into native Python numbers.
    """
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super().default(obj)


def decimal_to_native(obj):
    """
    Recursively convert DynamoDB Decimal objects
    into Python int or float types.
    """
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)

    if isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]

    return obj


def build_response(status_code: int, body: dict) -> dict:
    """
    Build a standard API Gateway response with CORS headers.
    Decimal values are converted before JSON serialization.
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
        "body": json.dumps(decimal_to_native(body)),
    }


def get_bedrock_client():
    """
    Create a Bedrock runtime client.
    The region is explicitly set because Bedrock models
    may only be available in certain regions.
    """
    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime",
        region_name="us-east-1",
    )
    return bedrock_runtime


def invoke_bedrock_json(client, model_id, system_prompt, user_prompt):
    """
    Send a prompt to a Bedrock model and extract the JSON
    response from the model output.
    """
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
            "maxTokens": 2048,
            "temperature": 0.3,
        },
    )

    import re

    text = response["output"]["message"]["content"][0]["text"]

    # Extract the first JSON block returned by the model
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        raise RuntimeError(f"Model response did not contain JSON: {text}")

    json_text = match.group(0)

    try:
        return json.loads(json_text)

    except json.JSONDecodeError:
        # Attempt to recover if the JSON formatting is slightly incorrect
        cleaned = json_text.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Fallback structure if parsing still fails
            return {
                "id": "fallback_question",
                "type": "case_study",
                "competency": "problem_solving",
                "text": cleaned,
            }


def average(nums: List[float]) -> float:
    """Compute the average of a list of numbers."""
    return sum(nums) / len(nums) if nums else 0.0


def compute_readiness_from_metrics(
    per_question: List[Dict[str, Any]]
) -> Tuple[Dict[str, float], float]:
    """
    Aggregate per-question evaluation metrics into category scores
    and compute an overall readiness score.
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