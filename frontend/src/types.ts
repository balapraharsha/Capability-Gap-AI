export type Role =
  | 'data-analyst'
  | 'data-scientist'
  | 'backend-engineer'
  | 'ml-engineer'
  | 'product-manager'
  | 'cloud-engineer';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'senior';

export type QuestionType =
  | 'scenario_mcq'
  | 'quiz'
  | 'case_study'
  | 'situation'
  | 'communication_task'
  | 'leadership_scenario'
  | 'technical_reasoning';

export interface Question {
  questionId: string;
  id?: string;
  type: QuestionType;
  competency: string;
  scenario: string;
  question: string;
  options: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  order: number;
  /** Which step in the progressive scenario chain (0 = initial, 1 = follow-up, null = standalone) */
  chainStep?: number | null;
  /** The complication twist text shown to the user before this question */
  complicationText?: string | null;
}

/** One completed step in a scenario chain, stored on the session */
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

/** The full chain state stored on the session */
export interface ScenarioChain {
  rootScenario: string;
  chainCompetency: string;
  steps: ScenarioStep[];
  chainDepth: number;
  isActive: boolean;
  lastComplication?: string | null;
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
  sessionId: string;
  status: 'in-progress' | 'completed';
  evaluation: EvaluationFeedback;
  nextQuestion: Question | null;
  testedCompetencies: string[];
  remainingCompetencies: string[];
  confidenceScore: number;
  coverage: number;
  report?: CapabilityReport;
  /** Complication twist narrative, present when a chain step was just triggered */
  complicationText?: string | null;
  /** Which chain step the NEXT question is at */
  chainStep?: number | null;
  scenarioChain?: ScenarioChain | null;
}

export interface CapabilityReport {
  sessionId: string;
  role: Role;
  level: ExperienceLevel;
  overallReadiness: number;
  competencyScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  weakAreas?: string[];
  timeAnalysis?: {
    averageResponseTimeMinutes: number;
  };
  learningRecommendations: string[];
  recommendedLearning?: string[];
  suggestedPracticeTopics?: string[];
}
