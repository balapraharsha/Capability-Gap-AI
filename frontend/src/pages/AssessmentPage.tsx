/*
AssessmentPage

This is the main page that runs the interactive assessment experience.

Responsibilities of this component:
1. Display the current question to the user.
2. Track the time spent on each question.
3. Submit answers to the backend API.
4. Handle scenario chains (multi-step decision arcs).
5. Show AI evaluation feedback after answers.
6. Display technical questions using the TechnicalQuestionCard component.
7. Manage transitions between:
   - Question phase
   - Evaluation phase
   - Scenario complications
8. Update the global assessment state stored in AssessmentContext.

Key UI sections included in this file:
- Progress bar (6 assessment steps)
- Scenario arc visualization
- Question card rendering
- Evaluation panel
- Complication banner
- Technical question interface
- Submission and navigation logic
*/

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitAnswer } from '../api';
import { TimerBadge } from '../components/TimerBadge';
import { TechnicalQuestionCard } from '../components/TechnicalQuestionCard';
import {
  useAssessment,
  formatQuestionType,
  formatCompetency,
  formatRole,
  formatLevel,
} from '../context/AssessmentContext';
import type { Question, ScenarioStep } from '../types';
import { QUESTION_TYPE_META } from '../types';


/*
─────────────────────────────────────────────────
SVG Icons
─────────────────────────────────────────────────

All icons are implemented using inline SVG to avoid emoji usage
and maintain consistent styling across the application.
*/

function IcoTarget({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}

function IcoBug({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M9 9h.01M15 9h.01"/><path d="M12 3C9.24 3 7 5.24 7 8v5c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-2.76-2.24-5-5-5z"/><path d="M7 10H3M21 10h-4M7 14H3M21 14h-4" strokeLinecap="round"/></svg>;
}

/*
Additional icons represent different technical tasks such as:
- code fixing
- log investigation
- code review
- algorithm complexity
*/

function IcoCode({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
}

function IcoEye({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

function IcoTerminal({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="8 10 12 14 8 18"/><line x1="14" y1="18" x2="20" y2="18"/></svg>;
}

function IcoLightning({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}

function IcoCheck({ className = 'w-3 h-3' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}><polyline points="20 6 9 17 4 12"/></svg>;
}

function IcoAlert({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

function IcoRefresh({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}


/*
─────────────────────────────────────────────────
Progress Bar
─────────────────────────────────────────────────

Shows the 6-step progress of the assessment.
Each slot represents a different challenge category.
*/

const SLOTS = [
  { icon: <IcoTarget />,    label: 'Scenario' },
  { icon: <IcoBug />,       label: 'Debug' },
  { icon: <IcoCode />,      label: 'Fix Code' },
  { icon: <IcoEye />,       label: 'Review' },
  { icon: <IcoTerminal />,  label: 'Logs' },
  { icon: <IcoLightning />, label: 'Complexity' },
];


/*
ProgressBar Component

Displays completion status of the 6 question slots.
Completed slots appear green, active slot appears amber.
*/

function ProgressBar({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-end gap-1.5">
      {SLOTS.map((slot, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                done
                  ? 'bg-emerald-400'
                  : active
                  ? 'bg-amber-500'
                  : 'bg-stone-200'
              }`}
            />

            <span
              className={`transition-colors ${
                done
                  ? 'text-emerald-500'
                  : active
                  ? 'text-amber-600'
                  : 'text-stone-300'
              }`}
            >
              {done ? <IcoCheck className="w-3 h-3" /> : slot.icon}
            </span>

            <span
              className={`text-[8px] font-medium uppercase tracking-wide hidden md:block ${
                active
                  ? 'text-amber-700'
                  : done
                  ? 'text-emerald-600'
                  : 'text-stone-400'
              }`}
            >
              {slot.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}


/*
─────────────────────────────────────────────────
Main Assessment Page
─────────────────────────────────────────────────

Controls the entire lifecycle of a question:
- Display question
- Record answer
- Submit answer
- Show AI evaluation
- Handle scenario chain complications
*/

export function AssessmentPage() {

  // Access global assessment state from context
  const {
    currentSession,
    currentQuestion,
    lastEvaluation,
    setCurrentQuestion,
    setLastEvaluation,
    setSession,
    setReport,
  } = useAssessment();

  const navigate = useNavigate();

  // Local UI state
  const [selectedOption, setSelectedOption] = useState('');
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string>(
    new Date().toISOString()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks whether the page is showing question or evaluation
  const [phase, setPhase] = useState<'question' | 'evaluation'>('question');

  const [pendingComplication, setPendingComplication] = useState<string | null>(null);
  const [pendingNextQuestion, setPendingNextQuestion] = useState<Question | null>(null);

  // Stores steps for the scenario arc visualization
  const [arcSteps, setArcSteps] = useState<ScenarioStep[]>([]);

  const topRef = useRef<HTMLDivElement>(null);


  /*
  Redirect user to role selection if no active session exists
  */
  useEffect(() => {
    if (!currentSession) navigate('/roles');
  }, [currentSession, navigate]);


  /*
  Reset question-related state when a new question loads
  */
  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartedAt(new Date().toISOString());
      setSelectedOption('');
      setEditedCode(null);
      setError(null);
      setPhase('question');
    }
  }, [currentQuestion?.questionId]);


  /*
  Handles answer submission.

  Sends the user's answer to the backend and updates:
  - evaluation results
  - next question
  - scenario chain state
  */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const answerValue =
      selectedOption;

    if (!answerValue.trim()) {
      setError('Please provide an answer before continuing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {

      // Submit answer to backend
      const res = await submitAnswer({
        sessionId: currentSession!.sessionId,
        questionId: currentQuestion!.questionId,
        answer: answerValue,
        startedAtIso: questionStartedAt,
        endedAtIso: new Date().toISOString(),
      });

      // Store evaluation feedback
      setLastEvaluation(res.evaluation);

      // Update session state
      setSession({
        ...currentSession!,
        currentQuestion: res.nextQuestion ?? null,
      });

      // Navigate to report when assessment finishes
      if (res.status === 'completed') {
        if (res.report) setReport(res.report);
        navigate('/report');
      }

    } catch (err) {

      console.error(err);
      setError('Unable to submit answer. Please try again.');

    } finally {
      setSubmitting(false);
    }
  }
}