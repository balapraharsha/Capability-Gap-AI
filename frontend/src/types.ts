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
