"""
Technical Question Synthesizer
-------------------------------
Generates 5 types of technical questions, each mapped to a fixed assessment slot:

  Q2  → debugging        : Spot the bug in a code snippet
  Q3  → fix_the_code     : Edit broken code in a Monaco editor
  Q4  → code_review      : Review a PR diff and leave feedback
  Q5  → log_detective    : Diagnose root cause from server logs / stack traces
  Q6  → complexity       : Analyse Big-O and suggest optimisation

Each question is role-aware — a DevOps engineer gets Kubernetes logs,
a Data Scientist gets pandas bugs, etc.
"""

from typing import Any, Dict, List, Optional
from common import get_bedrock_client, invoke_bedrock_json, generate_question_id

BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"

# Question slot → type mapping (1-indexed assessment question numbers)
QUESTION_TYPE_MAP = {
    2: "debugging",
    3: "fix_the_code",
    4: "code_review",
    5: "log_detective",
    6: "complexity",
}

# ── Role → language / domain defaults ─────────────────────────────
ROLE_TECH_PROFILE = {
    "data-analyst":           {"lang": "python", "domain": "data analysis, pandas, SQL"},
    "data-scientist":         {"lang": "python", "domain": "machine learning, numpy, pandas"},
    "backend-engineer":       {"lang": "python", "domain": "APIs, databases, distributed systems"},
    "ml-engineer":            {"lang": "python", "domain": "model serving, pipelines, ML ops"},
    "product-manager":        {"lang": "sql",    "domain": "metrics, funnels, A/B testing"},
    "cloud-engineer":         {"lang": "python", "domain": "AWS, infrastructure, IaC"},
    "ai-ml-architect":        {"lang": "python", "domain": "deep learning, model architecture"},
    "cloud-architect":        {"lang": "python", "domain": "cloud architecture, AWS, Azure"},
    "devops-engineer":        {"lang": "bash",   "domain": "CI/CD, Docker, Kubernetes"},
    "cybersecurity-specialist":{"lang":"python", "domain": "security, threat detection, auth"},
    "fullstack-developer":    {"lang": "javascript", "domain": "React, Node.js, REST APIs"},
    "big-data-engineer":      {"lang": "python", "domain": "Spark, Kafka, data pipelines"},
    "iot-architect":          {"lang": "python", "domain": "IoT, MQTT, edge computing"},
    "blockchain-developer":   {"lang": "javascript", "domain": "smart contracts, Web3, Solidity"},
}

# ── Fallback mock questions (used when Bedrock is unavailable) ─────

MOCK_QUESTIONS: Dict[str, Dict[str, Any]] = {
    "debugging": {
        "scenario": "A data pipeline is returning incorrect averages for daily revenue reports.",
        "code": (
            "def calculate_average(nums):\n"
            "    total = 0\n"
            "    for i in range(len(nums)):\n"
            "        total += nums[i]\n"
            "    return total / len(nums - 1)  # line 5\n"
        ),
        "language": "python",
        "task": "Identify the bug and explain why it causes incorrect results.",
        "hint": "Look carefully at the return statement.",
        "expected_issue": "len(nums - 1) is invalid — you can't subtract 1 from a list. Should be len(nums) - 1 or simply len(nums).",
        "options": [
            "A. The loop should use range(1, len(nums)) to skip the first element",
            "B. len(nums - 1) is invalid; it should be len(nums) - 1",
            "C. total should be initialised to None, not 0",
            "D. The function doesn't handle empty lists",
        ],
    },
    "fix_the_code": {
        "scenario": "A recommendation engine returns incorrect similarity scores for negative vectors.",
        "code": (
            "def cosine_similarity(a, b):\n"
            "    dot = sum(x * y for x, y in zip(a, b))\n"
            "    mag_a = sum(x ** 2 for x in a)\n"
            "    mag_b = sum(x ** 2 for x in b)\n"
            "    return dot / (mag_a * mag_b)  # bug here\n"
        ),
        "language": "python",
        "task": "Fix the function so it correctly computes cosine similarity.",
        "hint": "Magnitude requires a square root.",
        "fix": (
            "def cosine_similarity(a, b):\n"
            "    import math\n"
            "    dot = sum(x * y for x, y in zip(a, b))\n"
            "    mag_a = math.sqrt(sum(x ** 2 for x in a))\n"
            "    mag_b = math.sqrt(sum(x ** 2 for x in b))\n"
            "    return dot / (mag_a * mag_b)\n"
        ),
    },
    "code_review": {
        "scenario": "A junior engineer opens a PR to add user authentication to the API.",
        "diff": (
            "+ def login(username, password):\n"
            "+     user = db.query(f'SELECT * FROM users WHERE username={username}')\n"
            "+     if user and user.password == password:\n"
            "+         return {'token': str(uuid.uuid4())}\n"
            "+     return {'error': 'Invalid credentials'}\n"
        ),
        "language": "python",
        "task": "What feedback would you leave on this PR? Identify all issues.",
        "options": [
            "A. SQL injection vulnerability; passwords should be hashed; token should be a signed JWT",
            "B. The function name should be authenticate_user for clarity",
            "C. UUID tokens are fine; the only issue is missing input validation",
            "D. The query should use ORM instead of raw SQL but otherwise looks correct",
        ],
    },
    "log_detective": {
        "scenario": "Your production API has been returning 500 errors for 10% of requests since the last deployment.",
        "logs": (
            "[ERROR] 2024-01-15 14:23:11 - NullPointerException at UserService.java:142\n"
            "[ERROR] 2024-01-15 14:23:11 - Failed to fetch user profile: userId=null\n"
            "[WARN]  2024-01-15 14:23:10 - JWT token missing 'sub' claim\n"
            "[INFO]  2024-01-15 14:23:10 - Auth middleware passed for request /api/profile\n"
            "[ERROR] 2024-01-15 14:23:09 - Redis cache miss for key: user:null\n"
        ),
        "task": "What is the root cause of the 500 errors? What is your immediate fix?",
        "options": [
            "A. JWT tokens are missing the 'sub' claim; userId is null downstream causing NPE",
            "B. Redis cache is down; the service can't fetch user sessions",
            "C. UserService has a null check bug that was introduced in the last deployment",
            "D. The auth middleware is too permissive and letting unauthenticated requests through",
        ],
    },
    "complexity": {
        "scenario": "A search feature is timing out for large datasets in production.",
        "code": (
            "def find_duplicates(arr):\n"
            "    duplicates = []\n"
            "    for i in range(len(arr)):\n"
            "        for j in range(i + 1, len(arr)):\n"
            "            if arr[i] == arr[j]:\n"
            "                duplicates.append(arr[i])\n"
            "    return duplicates\n"
        ),
        "language": "python",
        "task": "What is the time complexity? How would you optimise it?",
        "options": [
            "A. O(n²) — optimise to O(n) using a hash set to track seen elements",
            "B. O(n log n) — optimise by sorting first and scanning linearly",
            "C. O(n²) — optimise to O(n log n) using a binary search tree",
            "D. O(n) — no optimisation needed; the current approach is already efficient",
        ],
    },
}


# ── Prompt templates ───────────────────────────────────────────────

SYSTEM_PROMPTS = {
    "debugging": (
        "You generate a FAANG-style debugging question for an adaptive interview simulator.\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "scenario": "1-2 sentence context",\n'
        '  "code": "buggy code snippet (4-10 lines)",\n'
        '  "language": "python|javascript|sql|bash",\n'
        '  "task": "What to find/explain",\n'
        '  "hint": "subtle hint without giving away the answer",\n'
        '  "expected_issue": "the actual bug explanation",\n'
        '  "options": ["A. ...", "B. ...", "C. ...", "D. ..."]\n'
        "}\n"
        "The bug should be subtle but realistic — the kind found in real code reviews."
    ),
    "fix_the_code": (
        "You generate a fix-the-code challenge for an adaptive interview simulator.\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "scenario": "1-2 sentence production context",\n'
        '  "code": "broken code the user must fix (5-12 lines)",\n'
        '  "language": "python|javascript|sql|bash",\n'
        '  "task": "What to fix",\n'
        '  "hint": "nudge without full solution",\n'
        '  "fix": "the corrected code"\n'
        "}\n"
        "The bug should require genuine understanding, not just syntax recall."
    ),
    "code_review": (
        "You generate a code review PR challenge for an adaptive interview simulator.\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "scenario": "PR context (who wrote it, what it does)",\n'
        '  "diff": "git-style diff or code block with + lines",\n'
        '  "language": "python|javascript|sql",\n'
        '  "task": "What review feedback to provide",\n'
        '  "options": ["A. ...", "B. ...", "C. ...", "D. ..."]\n'
        "}\n"
        "Include at least 2 real issues: security, performance, correctness, or design."
    ),
    "log_detective": (
        "You generate a log/stack-trace diagnosis challenge.\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "scenario": "What system, what symptoms",\n'
        '  "logs": "realistic log lines (6-10 lines with timestamps and levels)",\n'
        '  "task": "Diagnose root cause and suggest immediate fix",\n'
        '  "options": ["A. ...", "B. ...", "C. ...", "D. ..."]\n'
        "}\n"
        "Logs should contain breadcrumbs that lead to one clear root cause."
    ),
    "complexity": (
        "You generate a Big-O complexity analysis challenge.\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "scenario": "Production performance issue context",\n'
        '  "code": "inefficient code (6-15 lines)",\n'
        '  "language": "python|javascript",\n'
        '  "task": "State the complexity and provide an optimised version",\n'
        '  "options": ["A. ...", "B. ...", "C. ...", "D. ..."]\n'
        "}\n"
        "Focus on realistic algorithmic patterns: nested loops, repeated lookups, sorting."
    ),
}


# ── Main synthesizer ───────────────────────────────────────────────

def synthesize_technical_question(
    question_number: int,
    role: str,
    level: str,
    previous_topics: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Generate a technical question for the given assessment slot.
    question_number: 2-6 (maps to a specific question type)
    """
    q_type = QUESTION_TYPE_MAP.get(question_number, "debugging")
    profile = ROLE_TECH_PROFILE.get(role, {"lang": "python", "domain": "software engineering"})
    lang = profile["lang"]
    domain = profile["domain"]
    difficulty = {"beginner": "easy", "intermediate": "medium", "senior": "hard"}.get(level, "medium")

    client = get_bedrock_client()

    if client is None:
        mock = MOCK_QUESTIONS[q_type].copy()
        mock["id"] = generate_question_id()
        mock["type"] = q_type
        mock["competency"] = _competency_for_type(q_type)
        mock["difficulty"] = difficulty
        mock["chainStep"] = None
        mock["complicationText"] = None
        mock["questionId"] = mock["id"]
        mock["order"] = question_number - 1
        return mock

    system_prompt = SYSTEM_PROMPTS[q_type]
    prev = ", ".join(previous_topics[-3:]) if previous_topics else "none"
    user_prompt = (
        f"Role: {role} | Level: {level} | Difficulty: {difficulty}\n"
        f"Primary language/domain: {lang} / {domain}\n"
        f"Previous topics covered (avoid repeating): {prev}\n\n"
        f"Generate a realistic {q_type.replace('_', ' ')} question tailored to this role."
    )

    try:
        data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)
    except Exception as e:
        print(f"[TECH_Q] Bedrock error for {q_type}: {e} — using mock")
        data = {}

    if not isinstance(data, dict):
        data = {}

    # ── Validate that required type-specific fields are present ──
    # If Bedrock returned truncated/empty JSON, fall back to the mock question
    # so the frontend always has real content to display.
    needs_code = q_type in ("debugging", "fix_the_code", "complexity")
    needs_diff = q_type == "code_review"
    needs_logs = q_type == "log_detective"

    def _str(val):
        """Safely convert any Bedrock field to string — handles list/None/str."""
        if val is None:       return ""
        if isinstance(val, list): return "\n".join(str(v) for v in val)
        return str(val)

    # Normalize all fields so downstream code always gets strings
    for field in ("code", "diff", "logs", "scenario", "task", "hint", "language"):
        if field in data:
            data[field] = _str(data[field])
    if "options" in data and not isinstance(data["options"], list):
        data["options"] = []

    bedrock_missing_content = (
        (needs_code and not data.get("code", "").strip()) or
        (needs_diff and not data.get("diff", "").strip()) or
        (needs_logs and not data.get("logs", "").strip()) or
        not data.get("scenario", "").strip()
    )

    if bedrock_missing_content:
        print(f"[TECH_Q] Bedrock response missing required fields for {q_type} — using mock")
        mock = MOCK_QUESTIONS[q_type].copy()
        mock["id"] = generate_question_id()
        mock["questionId"] = mock["id"]
        mock["type"] = q_type
        mock["competency"] = _competency_for_type(q_type)
        mock["difficulty"] = difficulty
        mock["chainStep"] = None
        mock["complicationText"] = None
        mock["order"] = question_number - 1
        return mock

    qid = generate_question_id()
    result = {
        "id": qid,
        "questionId": qid,
        "type": q_type,
        "competency": _competency_for_type(q_type),
        "difficulty": difficulty,
        "chainStep": None,
        "complicationText": None,
        "order": question_number - 1,
        "scenario": data.get("scenario", ""),
        "language": data.get("language", lang),
        "task": data.get("task", ""),
        "hint": data.get("hint", ""),
        "options": data.get("options") or [],
    }

    # Type-specific fields
    if q_type in ("debugging", "fix_the_code", "complexity"):
        result["code"] = data.get("code", "")
    if q_type == "fix_the_code":
        result["fix"] = data.get("fix", "")
    if q_type == "code_review":
        result["diff"] = data.get("diff", "")
    if q_type == "log_detective":
        result["logs"] = data.get("logs", "")
    if q_type == "debugging":
        result["expected_issue"] = data.get("expected_issue", "")

    # Ensure 4 options for MCQ types
    if result["options"] and len(result["options"]) < 4:
        result["options"] = (result["options"] + ["Option A", "Option B", "Option C", "Option D"])[:4]

    return result


def _competency_for_type(q_type: str) -> str:
    return {
        "debugging":     "debugging",
        "fix_the_code":  "code_correctness",
        "code_review":   "code_quality",
        "log_detective": "incident_diagnosis",
        "complexity":    "algorithmic_thinking",
    }.get(q_type, "technical_expertise")


def is_technical_question_slot(question_number: int) -> bool:
    """Returns True for Q2-Q6 (technical slots)."""
    return question_number in QUESTION_TYPE_MAP