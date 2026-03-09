"""
Scenario Chain Synthesizer

This module manages the multi-step scenario chains used in the early
questions of the assessment. Instead of a single standalone question,
a scenario chain creates a mini narrative arc that unfolds over multiple
decision points.

Each chain simulates a real workplace situation that escalates over time.
The candidate must repeatedly reassess their decisions as new complications
appear.

Structure of a scenario chain:

Decision 1 (initial MCQ generated normally)
   ↓
Complication 1 (AI introduces new twist)
   ↓
Decision 2 (follow-up question)
   ↓
Complication 2 (stakes escalate further)
   ↓
Final Decision (hardest synthesis question)

This creates a realistic problem-solving flow where the candidate must
adapt to changing circumstances.

Two questions in the assessment (Q1 and Q2) use scenario chains.
Later questions (Q3–Q6) are standalone technical tasks.

Chain state is stored in the session object under `scenarioChain`,
allowing the engine to track progress through the scenario.
"""

from typing import Any, Dict, List, Optional
from common import get_bedrock_client, invoke_bedrock_json, generate_question_id

# Bedrock model used for generating scenario twists and follow-up questions
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"

# Number of decision points in a chain (initial + follow-ups)
DECISIONS_PER_CHAIN = 3

# Only the first two questions in the assessment use scenario chains
CHAINED_QUESTION_NUMBERS = {1, 2}


# ------------------------------------------------------------------
# Chain lifecycle helpers
# ------------------------------------------------------------------

def should_start_chain(question_number: int, existing_chain: Optional[Dict]) -> bool:
    """
    Determine whether a new scenario chain should begin for this question.
    """
    if question_number not in CHAINED_QUESTION_NUMBERS:
        return False

    if existing_chain and existing_chain.get("isActive"):
        return False

    # Prevent running multiple chains for the same question
    if existing_chain and existing_chain.get("questionNumber") == question_number:
        return False

    return True


def is_chain_active(session: Dict) -> bool:
    """Check whether the current session has an active scenario chain."""
    chain = session.get("scenarioChain")
    return bool(chain and chain.get("isActive", False))


def chain_is_complete(chain: Dict) -> bool:
    """A chain completes after all decision steps are finished."""
    return chain.get("chainDepth", 0) >= DECISIONS_PER_CHAIN


def init_chain(root_scenario: str, competency: str, question_number: int) -> Dict[str, Any]:
    """
    Initialize a new scenario chain for the given question.
    """
    return {
        "rootScenario": root_scenario,
        "chainCompetency": competency,
        "steps": [],
        "chainDepth": 0,
        "isActive": True,
        "lastComplication": None,
        "questionNumber": question_number,
    }


# ------------------------------------------------------------------
# Generate complication twist
# ------------------------------------------------------------------

def synthesize_complication(
    root_scenario: str,
    competency: str,
    role: str,
    level: str,
    steps_so_far: List[Dict],
    depth: int,
) -> str:
    """
    Generate an escalating complication that follows the candidate's decision.

    depth=1 → moderate escalation
    depth=2 → high-stakes escalation
    """

    client = get_bedrock_client()

    # Retrieve context from the most recent decision
    last_step = steps_so_far[-1] if steps_so_far else {}
    last_answer = last_step.get("candidateAnswer", "")
    last_question = last_step.get("questionText", "")

    # Escalate stakes depending on depth
    stake_level = (
        "moderate — a manager is asking for an update"
        if depth == 1
        else "critical — the CEO and leadership team are now watching the issue"
    )

    system_prompt = (
        "You are a scenario writer for a FAANG-style interview simulator. "
        "Introduce a realistic complication that escalates the scenario.\n"
        "The complication must follow naturally from the candidate's last decision "
        f"and raise the stakes to: {stake_level}.\n"
        "Write 2–3 narrative sentences only."
    )

    user_prompt = (
        f"Role: {role} | Level: {level} | Competency: {competency}\n\n"
        f"Original scenario:\n{root_scenario}\n\n"
        f"Previous question:\n{last_question}\n\n"
        f"Candidate decision:\n{last_answer}\n\n"
        "Write the complication twist."
    )

    # Fallback complications used during offline development
    if client is None:
        complications = [
            "While you were investigating, the VP of Engineering noticed error spikes and opened an emergency incident channel.",
            "The situation escalates further: the CEO demands a live update while a major customer threatens escalation.",
        ]
        return complications[min(depth - 1, len(complications) - 1)]

    try:
        response = client.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            inferenceConfig={"maxTokens": 256, "temperature": 0.7},
        )

        return response["output"]["message"]["content"][0]["text"].strip()

    except Exception:
        return (
            "The situation has escalated: a second failure has been detected "
            "and the on-call manager is requesting an immediate update."
        )


# ------------------------------------------------------------------
# Generate follow-up decision question
# ------------------------------------------------------------------

def synthesize_chain_followup(
    root_scenario: str,
    complication_text: str,
    competency: str,
    role: str,
    level: str,
    steps_so_far: List[Dict],
    depth: int,
) -> Dict[str, Any]:
    """
    Generate the next decision question in the scenario chain.

    depth=1 → harder follow-up
    depth=2 → final synthesis decision
    """

    client = get_bedrock_client()

    is_final = depth >= DECISIONS_PER_CHAIN - 1
    difficulty = "hard"

    tone = (
        "a harder follow-up that tests adaptability under pressure"
        if not is_final
        else "a FINAL synthesis decision requiring strategic judgement"
    )

    # System prompt defines the expected JSON structure
    system_prompt = (
        "You are an AI interview scenario generator.\n"
        f"Generate {tone}.\n"
        "Return ONLY valid JSON with fields id, type, competency, scenario, question, options, difficulty."
    )

    # Summarize recent decisions to maintain narrative continuity
    prev_summary = ""
    for s in steps_so_far[-3:]:
        prev_summary += f"- Step {s.get('stepIndex', 0)}: {s.get('candidateAnswer', '')[:80]}\n"

    user_prompt = (
        f"Role: {role} | Level: {level} | Competency: {competency}\n\n"
        f"Original scenario:\n{root_scenario}\n\n"
        f"Latest complication:\n{complication_text}\n\n"
        f"Candidate decisions so far:\n{prev_summary}\n"
    )

    # Offline fallback question generation
    if client is None:
        return {
            "id": generate_question_id(),
            "type": "scenario_mcq",
            "competency": competency,
            "scenario": f"{root_scenario} {complication_text}",
            "question": "Given the escalation, what is your most critical next action?",
            "options": [
                "Implement a quick fix while updating stakeholders",
                "Escalate and wait for leadership direction",
                "Roll back recent changes immediately",
                "Pause and perform deeper root cause analysis",
            ],
            "difficulty": difficulty,
        }

    data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)

    if not isinstance(data, dict):
        data = {}

    options = data.get("options") or []
    if len(options) < 4:
        options = (options + ["Option A", "Option B", "Option C", "Option D"])[:4]

    return {
        "id": generate_question_id(),
        "type": "scenario_mcq",
        "competency": data.get("competency", competency),
        "scenario": data.get("scenario", root_scenario),
        "question": data.get("question", "What is your next action?"),
        "options": options,
        "difficulty": data.get("difficulty", difficulty),
    }


# ------------------------------------------------------------------
# Advance the chain after each decision
# ------------------------------------------------------------------

def advance_chain(session: Dict, completed_step: Dict) -> Dict[str, Any]:
    """
    Progress the scenario chain after a decision is completed.

    Returns:
        complicationText
        nextQuestion
        updatedChain
        chainComplete
    """

    chain = session["scenarioChain"]

    # Append completed step to chain history
    steps = list(chain.get("steps", []))
    steps.append(completed_step)

    root_scenario = chain["rootScenario"]
    competency = chain["chainCompetency"]
    role = session["role"]
    level = session["level"]

    depth = chain.get("chainDepth", 0) + 1
    chain_complete = depth >= DECISIONS_PER_CHAIN

    # If all decisions are finished, deactivate the chain
    if chain_complete:
        updated_chain = {
            **chain,
            "steps": steps,
            "chainDepth": depth,
            "isActive": False,
        }

        return {
            "complicationText": None,
            "nextQuestion": None,
            "updatedChain": updated_chain,
            "chainComplete": True,
        }

    # Otherwise generate next complication and follow-up question
    complication = synthesize_complication(
        root_scenario,
        competency,
        role,
        level,
        steps,
        depth,
    )

    follow_up = synthesize_chain_followup(
        root_scenario,
        complication,
        competency,
        role,
        level,
        steps,
        depth,
    )

    follow_up["questionId"] = follow_up["id"]
    follow_up["order"] = session.get("questionCount", 1)
    follow_up["chainStep"] = depth
    follow_up["complicationText"] = complication

    updated_chain = {
        **chain,
        "steps": steps,
        "chainDepth": depth,
        "isActive": True,
        "lastComplication": complication,
    }

    return {
        "complicationText": complication,
        "nextQuestion": follow_up,
        "updatedChain": updated_chain,
        "chainComplete": False,
    }