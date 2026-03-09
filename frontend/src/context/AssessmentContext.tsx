/*
Assessment Context

This file implements the global state management for the assessment flow
using the React Context API.

It stores and provides access to key assessment data across the application,
so components like question screens, dashboards, and evaluation views can
share the same state without passing props through multiple layers.

Main responsibilities:
1. Track the current assessment session.
2. Track the currently active question.
3. Store the latest evaluation feedback returned by the backend.
4. Store the final capability report after the assessment completes.

This file contains:
- AssessmentProvider: wraps the application and provides the assessment state.
- useAssessment: a custom hook for accessing the assessment state.
- Helper formatting functions for roles, experience levels, question types,
  and competencies so they can be displayed in a user-friendly format.
*/

import React, { createContext, useContext, useState } from 'react';
import type {
  AssessmentSession,
  CapabilityReport,
  ExperienceLevel,
  EvaluationFeedback,
  Question,
  Role
} from '../types';

/*
Defines the shape of the global assessment state.
It includes both stored values and setter functions used to update them.
*/
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

/*
React context used to share assessment state across components.
The default value is undefined so we can detect misuse outside the provider.
*/
const AssessmentContext = createContext<AssessmentState | undefined>(undefined);

/*
AssessmentProvider

Wraps the application and provides the assessment state through context.
All components that need assessment data must be inside this provider.
*/
export function AssessmentProvider({ children }: { children: React.ReactNode }) {

  // Current active assessment session
  const [currentSession, setCurrentSession] = useState<AssessmentSession | undefined>();

  // Currently displayed question
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Latest evaluation feedback returned after answering a question
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationFeedback | undefined>();

  // Final capability report generated after assessment completion
  const [report, setReport] = useState<CapabilityReport | undefined>();

  /*
  Context value containing both state and update functions.
  setSession resets other state values when a new session begins.
  */
  const value: AssessmentState = {
    currentSession,
    currentQuestion,
    lastEvaluation,
    report,

    setSession: (session) => {
      setCurrentSession(session);

      // Initialize the first question when a session starts
      setCurrentQuestion(session?.currentQuestion ?? null);

      // Reset evaluation and report when starting a new session
      setLastEvaluation(undefined);
      setReport(undefined);
    },

    setCurrentQuestion,
    setLastEvaluation,
    setReport
  };

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
}

/*
Custom hook for accessing the assessment context.

Ensures that the hook is used only inside the AssessmentProvider.
*/
export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error('useAssessment must be used within AssessmentProvider');
  return ctx;
}

/*
Formats internal role identifiers into readable titles
for display in the UI.
*/
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

/*
Formats experience level values into readable text.
*/
export function formatLevel(level: ExperienceLevel): string {
  switch (level) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'senior':
      return 'Senior';
    default:
      return level;
  }
}

/*
Formats backend question type identifiers into UI-friendly labels.
*/
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

/*
Converts competency identifiers like:
"problem_solving" → "Problem Solving"
*/
export function formatCompetency(c: string): string {
  return c
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}