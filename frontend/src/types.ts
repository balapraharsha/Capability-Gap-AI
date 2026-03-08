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

export type ExperienceLevel = 'beginner' | 'intermediate' | 'senior';

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

export interface ScenarioChain {
  rootScenario: string;
  chainCompetency: string;
  steps: ScenarioStep[];
  chainDepth: number;
  isActive: boolean;
  lastComplication?: string | null;
  questionNumber?: number;
}

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

export interface EvaluationFeedback {
  observerSummary: string;
  criticFeedback: string;
  guidePrompt: string;
  guideQuestions?: string[];
  metrics?: Record<string, number>;
}

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
  // Legacy
  competencyScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  weakAreas?: string[];
  timeAnalysis?: { averageResponseTimeMinutes: number };
  learningRecommendations: string[];
  recommendedLearning?: string[];
}

export const QUESTION_TYPE_META: Record<string, { label: string; description: string }> = {
  scenario_mcq:   { label: 'Scenario Decision',      description: 'Real workplace scenario with decision trade-offs' },
  debugging:      { label: 'Debug the Code',          description: 'Identify the bug in a code snippet' },
  fix_the_code:   { label: 'Fix the Code',            description: 'Edit and correct broken code' },
  code_review:    { label: 'Code Review',             description: 'Review a PR diff and leave feedback' },
  log_detective:  { label: 'Log Detective',           description: 'Diagnose root cause from logs and stack traces' },
  complexity:     { label: 'Complexity Analysis',     description: 'Analyse Big-O and suggest optimisation' },
};
