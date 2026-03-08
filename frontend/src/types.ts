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
  | 'blockchain-developer'
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
  chainStep?: number | null;
  complicationText?: string | null;
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
  /** Which question number (1-indexed) this chain belongs to */
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
  complicationText?: string | null;
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
