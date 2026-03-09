"""
Technical Question Synthesizer

This module generates the technical questions used in the later part of
the assessment (questions 2–6). Each slot corresponds to a specific
technical skill type.

Question slot mapping:

Q2 → Debugging
     Candidate identifies a bug in a short code snippet.

Q3 → Fix the Code
     Candidate edits broken code and produces a corrected implementation.

Q4 → Code Review
     Candidate reviews a pull request diff and identifies issues.

Q5 → Log Detective
     Candidate diagnoses the root cause of a system issue from logs.

Q6 → Complexity
     Candidate analyses algorithmic complexity and proposes optimisation.

Questions are role-aware. The synthesizer adjusts language, domain,
and context depending on the candidate's role (e.g., DevOps, Data
Scientist, Backend Engineer).

The system supports two generation modes:
1. AI generation using AWS Bedrock.
2. Fallback mock questions when Bedrock is unavailable.

This ensures the assessment system works both online and in offline
development environments.
"""

from typing import Any, Dict, List, Optional
from common import get_bedrock_client, invoke_bedrock_json, generate_question_id

# Bedrock model used for generating questions
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"


# Maps assessment question numbers to technical question types
QUESTION_TYPE_MAP = {
    2: "debugging",
    3: "fix_the_code",
    4: "code_review",
    5: "log_detective",
    6: "complexity",
}


# Default language and technical domain per role
ROLE_TECH_PROFILE = {
    "data-analyst": {"lang": "python", "domain": "data analysis, pandas, SQL"},
    "data-scientist": {"lang": "python", "domain": "machine learning, numpy, pandas"},
    "backend-engineer": {"lang": "python", "domain": "APIs, databases, distributed systems"},
    "ml-engineer": {"lang": "python", "domain": "model serving, pipelines, ML ops"},
    "product-manager": {"lang": "sql", "domain": "metrics, funnels, A/B testing"},
    "cloud-engineer": {"lang": "python", "domain": "AWS, infrastructure, IaC"},
    "ai-ml-architect": {"lang": "python", "domain": "deep learning, model architecture"},
    "cloud-architect": {"lang": "python", "domain": "cloud architecture, AWS, Azure"},
    "devops-engineer": {"lang": "bash", "domain": "CI/CD, Docker, Kubernetes"},
    "cybersecurity-specialist": {"lang": "python", "domain": "security, threat detection"},
    "fullstack-developer": {"lang": "javascript", "domain": "React, Node.js, REST APIs"},
    "big-data-engineer": {"lang": "python", "domain": "Spark, Kafka, data pipelines"},
    "iot-architect": {"lang": "python", "domain": "IoT, MQTT, edge computing"},
    "blockchain-developer": {"lang": "javascript", "domain": "smart contracts, Web3"},
}


# Mock questions used when Bedrock is unavailable
MOCK_QUESTIONS: Dict[str, Dict[str, Any]] = {
    # Example debugging challenge
    "debugging": {
        "scenario": "A data pipeline is returning incorrect averages for revenue reports.",
        "code": (
            "def calculate_average(nums):\n"
            "    total = 0\n"
            "    for i in range(len(nums)):\n"
            "        total += nums[i]\n"
            "    return total / len(nums - 1)\n"
        ),
        "language": "python",
        "task": "Identify the bug and explain why it causes incorrect results.",
        "hint": "Look carefully at the return statement.",
        "expected_issue": "len(nums - 1) is invalid.",
        "options": [
            "A. The loop should start at index 1",
            "B. len(nums - 1) is invalid; it should be len(nums) - 1",
            "C. total should start as None",
            "D. The function should return a list",
        ],
    },

    # Fix-the-code challenge
    "fix_the_code": {
        "scenario": "A recommendation engine returns incorrect similarity scores.",
        "code": (
            "def cosine_similarity(a, b):\n"
            "    dot = sum(x * y for x, y in zip(a, b))\n"
            "    mag_a = sum(x ** 2 for x in a)\n"
            "    mag_b = sum(x ** 2 for x in b)\n"
            "    return dot / (mag_a * mag_b)\n"
        ),
        "language": "python",
        "task": "Fix the function so it correctly computes cosine similarity.",
        "hint": "Magnitude requires square root.",
        "fix": "Correct implementation with sqrt for magnitudes",
    },

    # Code review challenge
    "code_review": {
        "scenario": "A junior engineer submits a PR implementing authentication.",
        "diff": (
            "+ def login(username, password):\n"
            "+     user = db.query(f'SELECT * FROM users WHERE username={username}')\n"
            "+     if user and user.password == password:\n"
            "+         return {'token': str(uuid.uuid4())}\n"
        ),
        "language": "python",
        "task": "What issues should you highlight in this PR?",
        "options": [
            "A. SQL injection vulnerability",
            "B. Naming conventions",
            "C. Missing comments",
            "D. No issues present",
        ],
    },

    # Log analysis challenge
    "log_detective": {
        "scenario": "Your production API is returning 500 errors.",
        "logs": (
            "[ERROR] NullPointerException at UserService.java:142\n"
            "[WARN] JWT token missing 'sub' claim\n"
        ),
        "task": "Identify the root cause of the error.",
        "options": [
            "A. Missing JWT subject claim causing null userId",
            "B. Redis cache failure",
            "C. Database outage",
            "D. Network timeout",
        ],
    },

    # Algorithm complexity challenge
    "complexity": {
        "scenario": "A search function is timing out for large datasets.",
        "code": (
            "for i in range(len(arr)):\n"
            "  for j in range(i + 1, len(arr)):\n"
            "    if arr[i] == arr[j]:\n"
            "      duplicates.append(arr[i])"
        ),
        "language": "python",
        "task": "Identify the time complexity and suggest an optimisation.",
        "options": [
            "A. O(n²), optimise using a hash set",
            "B. O(n log n), sort first",
            "C. O(n²), use binary search tree",
            "D. O(n), already optimal",
        ],
    },
}


def synthesize_technical_question(
    question_number: int,
    role: str,
    level: str,
    previous_topics: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Generate a technical question for a given assessment slot.
    """

    # Determine which question type should be generated
    q_type = QUESTION_TYPE_MAP.get(question_number, "debugging")

    # Determine language/domain profile for the role
    profile = ROLE_TECH_PROFILE.get(role, {"lang": "python", "domain": "software engineering"})
    lang = profile["lang"]
    domain = profile["domain"]

    # Map experience level to difficulty
    difficulty = {"beginner": "easy", "intermediate": "medium", "senior": "hard"}.get(level, "medium")

    client = get_bedrock_client()

    # If Bedrock is unavailable, return a mock question
    if client is None:
        mock = MOCK_QUESTIONS[q_type].copy()
        mock["id"] = generate_question_id()
        mock["type"] = q_type
        mock["competency"] = _competency_for_type(q_type)
        mock["difficulty"] = difficulty
        mock["questionId"] = mock["id"]
        mock["order"] = question_number - 1
        return mock

    # Construct prompts for Bedrock generation
    prev = ", ".join(previous_topics[-3:]) if previous_topics else "none"

    system_prompt = SYSTEM_PROMPTS[q_type]

    user_prompt = (
        f"Role: {role} | Level: {level} | Difficulty: {difficulty}\n"
        f"Primary language/domain: {lang} / {domain}\n"
        f"Previous topics covered: {prev}\n\n"
        f"Generate a realistic {q_type.replace('_',' ')} challenge."
    )

    try:
        data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)
    except Exception:
        data = {}

    if not isinstance(data, dict):
        data = {}

    # Always generate a new ID for the question
    qid = generate_question_id()

    result = {
        "id": qid,
        "questionId": qid,
        "type": q_type,
        "competency": _competency_for_type(q_type),
        "difficulty": difficulty,
        "order": question_number - 1,
        "scenario": data.get("scenario", ""),
        "language": data.get("language", lang),
        "task": data.get("task", ""),
        "options": data.get("options") or [],
    }

    # Add type-specific fields
    if q_type in ("debugging", "fix_the_code", "complexity"):
        result["code"] = data.get("code", "")

    if q_type == "code_review":
        result["diff"] = data.get("diff", "")

    if q_type == "log_detective":
        result["logs"] = data.get("logs", "")

    return result


def _competency_for_type(q_type: str) -> str:
    """Map technical question type to competency."""
    return {
        "debugging": "debugging",
        "fix_the_code": "code_correctness",
        "code_review": "code_quality",
        "log_detective": "incident_diagnosis",
        "complexity": "algorithmic_thinking",
    }.get(q_type, "technical_expertise")


def is_technical_question_slot(question_number: int) -> bool:
    """Return True if the question slot is one of the technical question slots."""
    return question_number in QUESTION_TYPE_MAP