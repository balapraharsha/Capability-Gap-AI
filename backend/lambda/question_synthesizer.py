"""
Question Synthesizer

This module generates scenario-based multiple-choice questions used in the
assessment system. Each question is designed to evaluate a specific competency
for a given role and experience level.

The synthesizer can operate in two modes:

1. AI Generation Mode
   - Uses an AWS Bedrock model to generate realistic workplace scenarios.
   - Scenarios resemble situations commonly seen in large tech companies
     (e.g., production incidents, scaling issues, A/B tests, data problems).

2. Mock Mode (Offline / Local Development)
   - If Bedrock is unavailable, the module falls back to predefined scenarios.
   - This allows the system to run without external AI services.

Each generated question contains:
- a scenario describing a workplace situation
- a decision-based question
- four answer options
- the competency being evaluated
- the estimated difficulty level

These questions are used by the assessment engine to dynamically evaluate
candidate decision-making and reasoning rather than testing memorized facts.
"""

from typing import Any, Dict, List, Optional

from common import get_bedrock_client, invoke_bedrock_json, generate_question_id


# Bedrock model used for generating scenario-based questions
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


# Predefined mock scenarios used when the Bedrock client is unavailable
# These allow local testing without requiring AI generation.
MOCK_MCQS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "data-analyst": {
        "problem_solving": {
            "scenario": "You notice that a revenue dashboard used by executives shows numbers that do not match the raw transactions table.",
            "question": "What should you do first?",
            "options": [
                "Ignore the issue because dashboards sometimes lag behind",
                "Immediately send an email to all executives warning them",
                "Investigate the data pipeline and validate the data sources",
                "Rebuild the entire dashboard from scratch",
            ],
        },
        "technical_analysis": {
            "scenario": "A product team asks whether a recent feature launch improved user engagement.",
            "question": "What is the most appropriate first step?",
            "options": [
                "Share a few positive anecdotes from power users",
                "Pull a quick chart of total sessions before and after launch",
                "Define success metrics and design an experiment or quasi-experiment",
                "Wait a few months before looking at any data",
            ],
        },
    },
    "backend-engineer": {
        "system_design": {
            "scenario": "Your team needs to design a service to handle a 10x increase in traffic for a new campaign.",
            "question": "What is the best initial focus?",
            "options": [
                "Optimize only the frontend bundle size",
                "Add more logs to existing endpoints",
                "Identify bottlenecks and plan a scalable architecture (caching, queues, databases)",
                "Hope current capacity will be enough and do nothing",
            ],
        },
        "debugging": {
            "scenario": "A critical API endpoint suddenly starts returning 500 errors in production.",
            "question": "What should you do first?",
            "options": [
                "Restart all servers immediately",
                "Roll back the most recent deployment and check logs/metrics",
                "Disable authentication on the endpoint",
                "Tell stakeholders you will investigate next week",
            ],
        },
    },
}


def _difficulty_for_level(level: str) -> str:
    """
    Map candidate experience level to question difficulty.
    """
    level = (level or "").lower()

    if level == "beginner":
        return "easy"

    if level == "senior":
        return "hard"

    return "medium"


def synthesize_next_question(
    role: str,
    level: str,
    target_competency: str,
    remaining_competencies: List[str],
    previous_answers: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Generate a scenario-based MCQ targeting a specific competency.

    The question generation uses role, experience level, and previously
    asked questions to avoid repetition and maintain coverage.
    """

    # Create Bedrock client for AI generation
    client = get_bedrock_client()

    previous_answers = previous_answers or []

    # System prompt defines the format and rules for the AI-generated question
    system_prompt = """
You are an AI interview scenario generator for an adaptive role-readiness simulator.

Generate ONE realistic workplace scenario-based multiple-choice question.

Return ONLY valid JSON with this exact shape (no comments, no extra fields):
{
  "id": "scenario_1",
  "type": "scenario_mcq",
  "competency": "string",
  "scenario": "string",
  "question": "string",
  "options": ["option A", "option B", "option C", "option D"],
  "difficulty": "easy" | "medium" | "hard"
}

There is NO correctAnswer field. The goal is to evaluate decision quality, not trivia.
Scenarios should resemble real issues at large tech companies (production incidents, data quality issues,
engagement drops, A/B tests, stakeholder communication, etc.).
"""

    # User prompt provides context for question generation
    user_prompt = f"""
Role: {role}
Experience level: {level}

Target competency to evaluate: {target_competency}
Remaining competencies not yet fully evaluated: {remaining_competencies}
"""

    # Add context from recent questions to reduce repetition
    if previous_answers:
        user_prompt += "Recent question topics (avoid repetition):\n"
        for pa in previous_answers[-3:]:
            user_prompt += f"- {pa.get('competency', '')}: {pa.get('questionText', '')[:80]}...\n"

    user_prompt += (
        "\nGenerate a FAANG-style scenario and decision question that reveals how the candidate thinks. "
        "Focus on realistic trade-offs and decision points, not rote definitions."
    )

    # If Bedrock is unavailable, return a predefined mock scenario
    if client is None:

        role_key = role.lower()
        comp_key = target_competency

        base = (
            MOCK_MCQS.get(role_key, {}).get(comp_key)
            or MOCK_MCQS.get("data-analyst", {}).get("problem_solving")
        )

        scenario = base["scenario"]
        question = base["question"]
        options = base["options"]

        return {
            "id": generate_question_id(),
            "type": "scenario_mcq",
            "competency": target_competency,
            "scenario": scenario,
            "question": question,
            "options": options,
            "difficulty": _difficulty_for_level(level),
        }

    # Invoke Bedrock model to generate a new question
    data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)

    if not isinstance(data, dict):
        data = {}

    # Generate a unique ID because the model may return a fixed ID
    qid = generate_question_id()

    options = data.get("options") or []

    # Ensure there are always at least four options for the UI
    if len(options) < 4:
        options = options + ["Option A", "Option B", "Option C", "Option D"]
        options = options[:4]

    difficulty = data.get("difficulty") or _difficulty_for_level(level)

    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = _difficulty_for_level(level)

    return {
        "id": qid,
        "type": "scenario_mcq",
        "competency": data.get("competency", target_competency),
        "scenario": data.get("scenario", ""),
        "question": data.get("question", ""),
        "options": options,
        "difficulty": difficulty,
    }


def handler(event, _context):
    """
    Lambda entry point used for direct question generation requests.
    """

    import json

    body = event.get("body") or "{}"

    # Ensure request body is parsed correctly
    if isinstance(body, str):
        body = json.loads(body) if body else {}

    role = body.get("role")
    level = body.get("level")
    target_competency = body.get("targetCompetency")
    remaining = body.get("remainingCompetencies") or []
    previous = body.get("previousAnswers") or []

    # Validate required inputs
    if not role or not level or not target_competency:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "role, level, targetCompetency required"}),
        }

    # Generate the next question
    question = synthesize_next_question(role, level, target_competency, remaining, previous)

    return {"statusCode": 200, "body": json.dumps(question)}