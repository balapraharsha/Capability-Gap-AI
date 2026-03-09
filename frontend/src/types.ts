/*
types.ts

This file defines all shared TypeScript types used across the frontend
application. These types ensure consistent data structures between the
frontend, API responses, and internal application state.

It includes:
- Role and experience level definitions
- Question structures used in assessments
- Scenario chain tracking for multi-step questions
- Evaluation feedback returned by the AI system
- Capability report structure used in the final results page
*/


/*
List of supported roles that a user can select when starting
an assessment. Each role corresponds to a different competency
framework on the backend.
*/
export type Role =
  | 'data-analyst'
  | 'data-scientist'
  | 'backend-engineer'
  | 'ml-engineer'
  | 'product-manager'
  | 'cloud-engineer'
  | 'ai-ml-architect'
  | 'cloud-architect'
  | 'devops-engineer'
  | 'cybersecurity-specialist'
  | 'fullstack-developer'
  | 'big-data-engineer'
  | 'iot-architect'
  | 'blockchain-developer';


/*
Experience level chosen by the user before starting the assessment.
The backend may adjust question difficulty based on this level.
*/
export type ExperienceLevel = 'beginner' | 'intermediate' | 'senior';


/*
All possible question types supported by the system.

The first set are scenario and reasoning questions.
The latter types represent technical tasks such as debugging,
code fixes, log analysis, and algorithmic complexity evaluation.
*/
export type QuestionType =
  | 'scenario_mcq'
  | 'quiz'
  | 'case_study'
  | 'situation'
  | 'communication_task'
  | 'leadership_scenario'
  | 'technical_reasoning'
  | 'debugging'
  | 'fix_the_code'
  | 'code_review'
  | 'log_detective'
  | 'complexity';


/*
Structure of a single assessment question.

Different fields are used depending on the question type.
For example:
- scenario_mcq uses "scenario" + "options"
- debugging uses "code"
- code_review may use "diff"
- log_detective uses "logs"
*/
export interface Question {
  questionId: string;
  id?: string;

  type: QuestionType;
  competency: string;

  scenario: string;
  question?: string;
  task?: string;

  options?: string[];

  difficulty?: 'easy' | 'medium' | 'hard';
  order: number;

  chainStep?: number | null;
  complicationText?: string | null;

  language?: string;
  code?: string;
  diff?: string;
  logs?: string;

  hint?: string;
  fix?: string;
  expected_issue?: string;
}


/*
Represents a single step in a scenario chain.

Scenario chains simulate real-world decision sequences:
Decision → Complication → Follow-up decision
*/
export interface ScenarioStep {
  stepIndex: number;

  type: 'initial' | 'complication' | 'follow_up';

  questionId: string;
  questionText: string;

  candidateAnswer: string;

  complicationText?: string | null;

  criticScore: number;
  observerSummary: string;
}


/*
Tracks the full scenario chain state during an assessment.

This allows the system to build progressive scenarios where
each answer affects the next situation.
*/
export interface ScenarioChain {
  rootScenario: string;

  chainCompetency: string;

  steps: ScenarioStep[];

  chainDepth: number;

  isActive: boolean;

  lastComplication?: string | null;

  questionNumber?: number;
}


/*
Represents the full state of an assessment session.

This object is stored in the frontend context and updated
as the user progresses through questions.
*/
export interface AssessmentSession {
  sessionId: string;

  userId: string;

  role: Role;
  level: ExperienceLevel;

  status: 'in-progress' | 'completed';

  currentQuestion?: Question | null;

  questions?: Question[];

  testedCompetencies: string[];
  remainingCompetencies: string[];

  confidenceScore: number;
  coverage: number;

  questionCount: number;
  answeredCount?: number;

  createdAt?: string;
  completedAt?: string;

  scenarioChain?: ScenarioChain | null;
}


/*
Evaluation feedback returned by the backend AI agents.

Three agents evaluate every answer:
- Observer: summarizes reasoning
- Critic: evaluates quality and correctness
- Guide: suggests improvement or deeper thinking
*/
export interface EvaluationFeedback {
  observerSummary: string;
  criticFeedback: string;
  guidePrompt: string;

  guideQuestions?: string[];

  metrics?: Record<string, number>;
}


/*
Response returned by the backend after submitting an answer.

Includes:
- evaluation feedback
- next question
- updated session progress
*/
export interface AnswerResponse {
  sessionId?: string;

  status: 'in-progress' | 'completed';

  evaluation: EvaluationFeedback;

  nextQuestion: Question | null;

  testedCompetencies: string[];
  remainingCompetencies: string[];

  confidenceScore: number;
  coverage: number;

  questionCount?: number;

  report?: CapabilityReport;

  complicationText?: string | null;

  chainStep?: number | null;

  scenarioChain?: ScenarioChain | null;
}


/*
Detailed representation of a single skill dimension
in the capability report.
*/
export interface SkillDimension {
  score: number;
  pct: number;

  label: string;
  description: string;

  performanceLabel: string;
  performanceDesc: string;

  isWeak: boolean;
  isStrong: boolean;
}


/*
Final report returned after completing an assessment.

Includes:
- overall readiness score
- detailed 9-skill breakdown
- strengths and weaknesses
- personalized learning recommendations
*/
export interface CapabilityReport {
  sessionId: string;

  role: Role;
  level: ExperienceLevel;

  overallReadiness: number;

  narrativeSummary?: string;

  // 9-skill breakdown
  nineSkills: Record<string, SkillDimension>;
  nineSkillScores: Record<string, number>;

  weakSkills: string[];
  strongSkills: string[];

  // Legacy compatibility fields
  competencyScores: Record<string, number>;

  strengths: string[];
  weaknesses: string[];

  weakAreas?: string[];

  timeAnalysis?: {
    averageResponseTimeMinutes: number;
  };

  learningRecommendations: string[];

  recommendedLearning?: string[];
}


/*
Metadata describing each technical question type.

Used in the UI to show a readable label and description
for the question format currently being displayed.
*/
export const QUESTION_TYPE_META: Record<
  string,
  { label: string; description: string }
> = {
  scenario_mcq: {
    label: 'Scenario Decision',
    description: 'Real workplace scenario with decision trade-offs'
  },

  debugging: {
    label: 'Debug the Code',
    description: 'Identify the bug in a code snippet'
  },

  fix_the_code: {
    label: 'Fix the Code',
    description: 'Edit and correct broken code'
  },

  code_review: {
    label: 'Code Review',
    description: 'Review a PR diff and leave feedback'
  },

  log_detective: {
    label: 'Log Detective',
    description: 'Diagnose root cause from logs and stack traces'
  },

  complexity: {
    label: 'Complexity Analysis',
    description: 'Analyse Big-O and suggest optimisation'
  },
};