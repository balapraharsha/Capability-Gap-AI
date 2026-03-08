"""
Scenario Chain Synthesizer
--------------------------
Generates a branching, progressive scenario arc for a FAANG-style interview.

Flow per chain:
  Step 0 – Initial scenario + Decision 1   (question_synthesizer already handles this)
  Step 1 – Complication twist               (new: based on candidate's last answer)
  Step 2 – New decision under pressure      (new: harder follow-up question)
  Step 3 – Final evaluation prompt          (generated at report time)

A "chain" is stored on the DynamoDB session as:
  scenarioChain: {
    rootScenario: str,           # the opening scenario text
    steps: [ScenarioStep],       # ordered list of steps completed so far
    chainCompetency: str,        # the single competency this arc tests deeply
    chainDepth: int,             # how many steps completed (0-indexed)
    isActive: bool               # True while the chain is mid-flight
  }

ScenarioStep shape (stored):
  {
    stepIndex: int,
    type: "initial" | "complication" | "follow_up",
    questionId: str,
    questionText: str,
    candidateAnswer: str,
    complicationText: str | None,   # the "twist" text shown to user before next question
    criticScore: float,
    observerSummary: str
  }
"""

from typing import Any, Dict, List, Optional
from common import get_bedrock_client, invoke_bedrock_json, generate_question_id

BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"

# ------------------------------------------------------------------
# How deep a chain goes before returning to normal competency flow
# ------------------------------------------------------------------
CHAIN_DEPTH = 2          # 0 = initial question, 1 = complication, 2 = follow-up
CHAIN_TRIGGER_STEP = 0   # After answering step 0, start the chain


# ------------------------------------------------------------------
# Decide whether to start a new chain for this question
# ------------------------------------------------------------------

def should_start_chain(question_count: int, existing_chain: Optional[Dict]) -> bool:
    """
    Start a scenario chain on the 1st question of the session if none exists yet.
    Only one chain is run per session (keeps runtime cost predictable).
    """
    if existing_chain and existing_chain.get("isActive"):
        return False
    if existing_chain and existing_chain.get("chainDepth", 0) >= CHAIN_DEPTH:
        return False
    # Trigger on the very first question answer
    return question_count == 1


def is_chain_active(session: Dict) -> bool:
    chain = session.get("scenarioChain")
    return bool(chain and chain.get("isActive", False))


def chain_is_complete(chain: Dict) -> bool:
    return chain.get("chainDepth", 0) >= CHAIN_DEPTH


# ------------------------------------------------------------------
# Generate the complication twist text
# ------------------------------------------------------------------

def synthesize_complication(
    root_scenario: str,
    competency: str,
    role: str,
    level: str,
    steps_so_far: List[Dict],
) -> str:
    """
    Generate a 2-3 sentence 'twist' that builds on the root scenario
    and the candidate's most recent decision, raising the stakes.
    Returns a plain string (shown as narrative, not a question).
    """
    client = get_bedrock_client()

    last_step = steps_so_far[-1] if steps_so_far else {}
    last_answer = last_step.get("candidateAnswer", "")
    last_question = last_step.get("questionText", "")

    system_prompt = (
        "You are a scenario writer for a FAANG-style interview simulator. "
        "Your job is to introduce a realistic COMPLICATION that escalates the original scenario. "
        "The complication must:\n"
        "  1. Follow naturally from the candidate's last decision.\n"
        "  2. Raise the stakes (e.g. the CEO is now watching, the incident is spreading, "
        "     data is corrupt, or a stakeholder escalates).\n"
        "  3. Be 2-3 sentences. No questions. Pure narrative.\n"
        "Return ONLY the complication text. No JSON, no extra commentary."
    )

    user_prompt = (
        f"Role: {role} | Level: {level} | Competency under test: {competency}\n\n"
        f"Original scenario:\n{root_scenario}\n\n"
        f"Previous question asked:\n{last_question}\n\n"
        f"Candidate's decision:\n{last_answer}\n\n"
        "Write the complication twist that follows from this decision."
    )

    if client is None:
        return (
            "While you were investigating, the situation escalated: the VP of Engineering "
            "has seen a spike in error alerts and has called an emergency Slack huddle. "
            "Three more services are now reporting downstream failures linked to the same root cause."
        )

    try:
        response = client.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            inferenceConfig={"maxTokens": 256, "temperature": 0.7},
        )
        return response["output"]["message"]["content"][0]["text"].strip()
    except Exception:
        return (
            "The situation has escalated: a second system failure has been detected, "
            "and the on-call manager is requesting an immediate status update. "
            "Your initial response is being reviewed by the team."
        )


# ------------------------------------------------------------------
# Generate the follow-up question after the complication
# ------------------------------------------------------------------

def synthesize_chain_followup(
    root_scenario: str,
    complication_text: str,
    competency: str,
    role: str,
    level: str,
    steps_so_far: List[Dict],
) -> Dict[str, Any]:
    """
    Generate a harder MCQ that builds on the complication.
    Tests adaptability, communication-under-pressure, or escalation judgment.
    """
    client = get_bedrock_client()

    system_prompt = (
        "You are an AI interview scenario generator for an adaptive role-readiness simulator.\n\n"
        "You are generating a FOLLOW-UP question that appears AFTER a complication has been "
        "introduced into an ongoing scenario. The question must:\n"
        "  1. Reference the complication explicitly.\n"
        "  2. Be harder and more pressured than the initial question.\n"
        "  3. Test adaptability, stakeholder communication, or escalation judgment.\n\n"
        "Return ONLY valid JSON with this exact shape:\n"
        "{\n"
        '  "id": "chain_followup_1",\n'
        '  "type": "scenario_mcq",\n'
        '  "competency": "string",\n'
        '  "scenario": "string (2-3 sentences recapping where we are now)",\n'
        '  "question": "string (the decision question)",\n'
        '  "options": ["option A", "option B", "option C", "option D"],\n'
        '  "difficulty": "hard"\n'
        "}\n\n"
        "There is NO correctAnswer field. Evaluate decision quality and judgment under pressure."
    )

    prev_summary = ""
    for s in steps_so_far[-2:]:
        prev_summary += f"- Step {s.get('stepIndex', 0)}: {s.get('candidateAnswer', '')[:80]}\n"

    user_prompt = (
        f"Role: {role} | Level: {level} | Core competency: {competency}\n\n"
        f"Original scenario:\n{root_scenario}\n\n"
        f"Complication just revealed to the candidate:\n{complication_text}\n\n"
        f"Candidate's decisions so far:\n{prev_summary}\n\n"
        "Generate a harder follow-up question that puts the candidate under more pressure "
        "and forces a difficult trade-off."
    )

    if client is None:
        return {
            "id": generate_question_id(),
            "type": "scenario_mcq",
            "competency": competency,
            "scenario": (
                f"{root_scenario} Now, following the complication, you must act quickly "
                "while the team waits for direction."
            ),
            "question": "Given the escalation, what is your immediate next action?",
            "options": [
                "Immediately escalate to the VP and wait for approval before acting",
                "Implement a quick hotfix autonomously and communicate the plan in parallel",
                "Pause all work and run a full post-mortem before touching anything",
                "Delegate entirely to a team member and focus on stakeholder updates",
            ],
            "difficulty": "hard",
        }

    data = invoke_bedrock_json(client, BEDROCK_MODEL_ID, system_prompt, user_prompt)
    if not isinstance(data, dict):
        data = {}

    qid = generate_question_id()
    options = data.get("options") or []
    if len(options) < 4:
        options = (options + ["Option A", "Option B", "Option C", "Option D"])[:4]

    return {
        "id": qid,
        "type": "scenario_mcq",
        "competency": data.get("competency", competency),
        "scenario": data.get("scenario", root_scenario),
        "question": data.get("question", "What is your next action?"),
        "options": options,
        "difficulty": "hard",
    }


# ------------------------------------------------------------------
# Build the next chain step (complication text + follow-up question)
# ------------------------------------------------------------------

def advance_chain(
    session: Dict,
    completed_step: Dict,  # the step that was just answered
) -> Dict[str, Any]:
    """
    Called after a chain step is answered.
    Returns:
      {
        "complicationText": str,   # show this to the user before next question
        "nextQuestion": dict,      # the follow-up MCQ
        "updatedChain": dict       # the updated scenarioChain to persist
      }
    """
    chain = session["scenarioChain"]
    steps = chain.get("steps", [])
    steps.append(completed_step)

    root_scenario = chain["rootScenario"]
    competency = chain["chainCompetency"]
    role = session["role"]
    level = session["level"]
    depth = chain.get("chainDepth", 0) + 1

    complication = synthesize_complication(
        root_scenario=root_scenario,
        competency=competency,
        role=role,
        level=level,
        steps_so_far=steps,
    )

    follow_up = synthesize_chain_followup(
        root_scenario=root_scenario,
        complication_text=complication,
        competency=competency,
        role=role,
        level=level,
        steps_so_far=steps,
    )

    follow_up["questionId"] = follow_up["id"]
    follow_up["order"] = session.get("questionCount", 1)
    follow_up["chainStep"] = depth
    follow_up["complicationText"] = complication   # <-- frontend reads this

    updated_chain = {
        **chain,
        "steps": steps,
        "chainDepth": depth,
        "isActive": depth < CHAIN_DEPTH,
        "lastComplication": complication,
    }

    return {
        "complicationText": complication,
        "nextQuestion": follow_up,
        "updatedChain": updated_chain,
    }


# ------------------------------------------------------------------
# Initialise a new chain when session starts (called from assessment_engine)
# ------------------------------------------------------------------

def init_chain(root_scenario: str, competency: str) -> Dict[str, Any]:
    return {
        "rootScenario": root_scenario,
        "chainCompetency": competency,
        "steps": [],
        "chainDepth": 0,
        "isActive": True,
        "lastComplication": None,
    }
