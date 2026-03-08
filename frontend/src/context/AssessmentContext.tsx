import React, { createContext, useContext, useState } from 'react';
import type {
  AssessmentSession,
  CapabilityReport,
  ExperienceLevel,
  EvaluationFeedback,
  Question,
  Role
} from '../types';

interface AssessmentState {
  currentSession?: AssessmentSession;
  currentQuestion: Question | null;
  lastEvaluation?: EvaluationFeedback;
  report?: CapabilityReport;
  setSession: (session?: AssessmentSession) => void;
  setCurrentQuestion: (q: Question | null) => void;
  setLastEvaluation: (e: EvaluationFeedback | undefined) => void;
  setReport: (report: CapabilityReport) => void;
}

const AssessmentContext = createContext<AssessmentState | undefined>(undefined);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [currentSession, setCurrentSession] = useState<AssessmentSession | undefined>();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationFeedback | undefined>();
  const [report, setReport] = useState<CapabilityReport | undefined>();

  const value: AssessmentState = {
    currentSession,
    currentQuestion,
    lastEvaluation,
    report,
    setSession: (session) => {
      setCurrentSession(session);
      setCurrentQuestion(session?.currentQuestion ?? null);
      setLastEvaluation(undefined);
      setReport(undefined);
    },
    setCurrentQuestion,
    setLastEvaluation,
    setReport
  };

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error('useAssessment must be used within AssessmentProvider');
  return ctx;
}

export function formatRole(role: Role): string {
  const map: Record<Role, string> = {
    'data-analyst': 'Data Analyst',
    'data-scientist': 'Data Scientist',
    'backend-engineer': 'Backend Engineer',
    'ml-engineer': 'ML Engineer',
    'product-manager': 'Product Manager',
    'cloud-engineer': 'Cloud Engineer',
    'ai-ml-architect': 'AI/ML Architect',
    'cloud-architect': 'Cloud Architect',
    'devops-engineer': 'DevOps Engineer',
    'cybersecurity-specialist': 'Cybersecurity Specialist',
    'fullstack-developer': 'Full Stack Developer',
    'big-data-engineer': 'Big Data Engineer',
    'iot-architect': 'IoT Solutions Architect',
    'blockchain-developer': 'Blockchain Developer',
  };
  return map[role] ?? role;
}

export function formatLevel(level: ExperienceLevel): string {
  switch (level) {
    case 'beginner': return 'Beginner';
    case 'intermediate': return 'Intermediate';
    case 'senior': return 'Senior';
    default: return level;
  }
}

export function formatQuestionType(type: string): string {
  const map: Record<string, string> = {
    scenario_mcq: 'Scenario Decision',
    quiz: 'Quiz',
    case_study: 'Case Study',
    situation: 'Situation Based',
    communication_task: 'Communication Task',
    leadership_scenario: 'Leadership Scenario',
    technical_reasoning: 'Technical Reasoning'
  };
  return map[type] || type;
}

export function formatCompetency(c: string): string {
  return c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
