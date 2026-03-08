import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitAnswer } from '../api';
import { TimerBadge } from '../components/TimerBadge';
import {
  useAssessment,
  formatQuestionType,
  formatCompetency,
  formatRole,
  formatLevel
} from '../context/AssessmentContext';
import type { Question } from '../types';

export function AssessmentPage() {
  const {
    currentSession,
    currentQuestion,
    lastEvaluation,
    setCurrentQuestion,
    setLastEvaluation,
    setSession,
    setReport
  } = useAssessment();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState('');
  const [questionStartedAt, setQuestionStartedAt] = useState<string>(new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!currentSession) {
      navigate('/roles');
    }
  }, [currentSession, navigate]);

  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartedAt(new Date().toISOString());
      setSelectedOption('');
      setError(null);
    }
  }, [currentQuestion?.questionId]);

  if (!currentSession) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!selectedOption) {
      setError('Please choose an option before continuing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await submitAnswer({
        sessionId: currentSession.sessionId,
        questionId: (currentQuestion as Question).questionId,
        answer: selectedOption,
        startedAtIso: questionStartedAt,
        endedAtIso: new Date().toISOString()
      });

      // store evaluation
      setLastEvaluation(res.evaluation);
      setShowFeedback(true);

      // SAFE values
      const tested = res.testedCompetencies ?? currentSession.testedCompetencies ?? [];
      const remaining = res.remainingCompetencies ?? currentSession.remainingCompetencies ?? [];

      const updatedSession = {
        ...currentSession,
        testedCompetencies: tested,
        remainingCompetencies: remaining,
        confidenceScore: res.confidenceScore ?? currentSession.confidenceScore ?? 0,
        coverage: res.coverage ?? currentSession.coverage ?? 0,
        questionCount: (currentSession.questionCount ?? 1) + 1,
        status: res.status ?? currentSession.status,
        currentQuestion: res.nextQuestion ?? null
      } as typeof currentSession;

      setSession(updatedSession);
      setCurrentQuestion(res.nextQuestion ?? null);

      // Assessment finished
      if (res.status === 'completed') {
        if (res.report) {
          setReport(res.report);
        }
        navigate('/report');
      }

    } catch (err) {
      console.error(err);
      setError('Unable to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentQuestion && !lastEvaluation) {
    return (
      <div className="glass-panel p-6 text-center text-sm text-slate-300">
        No question available. Please start a new assessment.
        <button
          type="button"
          className="primary-btn mt-4"
          onClick={() => navigate('/roles')}
        >
          Start assessment
        </button>
      </div>
    );
  }

  const q = currentQuestion as Question;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black">
            Question {currentSession.questionCount} · {formatRole(currentSession.role)} ·{' '}
            {formatLevel(currentSession.level)}
          </h2>
          <p className="text-xs text-slate-700">
            {formatQuestionType(q?.type || 'technical_reasoning')} · Evaluating{' '}
            {formatCompetency(q?.competency || '')}
          </p>
        </div>
        <TimerBadge startedAt={questionStartedAt} />
      </div>
      {showFeedback && lastEvaluation && (
        <div className="glass-panel space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
            AI Evaluation
          </p>
          <div className="grid gap-3 text-xs md:grid-cols-3">
            <div>
              <p className="mb-1 text-stone-600">Observer</p>
              <p className="text-slate-900">{lastEvaluation.observerSummary}</p>
            </div>
            <div>
              <p className="mb-1 text-stone-600">Critic</p>
              <p className="text-slate-900">{lastEvaluation.criticFeedback}</p>
            </div>
            <div>
              <p className="mb-1 text-stone-600">Guide</p>
              <p className="text-slate-900">{lastEvaluation.guidePrompt}</p>
              {lastEvaluation.guideQuestions?.length ? (
                <ul className="mt-2 space-y-1 text-slate-900">
                  {lastEvaluation.guideQuestions.map((gq) => (
                    <li key={gq}>• {gq}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      )}
      <div className="glass-panel question-card p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
          Scenario
        </p>
        <p className="text-sm text-slate-900">{q?.scenario}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
          Question
        </p>
        <p className="text-base font-semibold text-black">{q?.question}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold text-stone-800">
            Choose the option that best reflects what you would do first.
          </legend>
          <div className="space-y-2">
            {q.options?.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  selectedOption === opt
                    ? 'border-amber-500 bg-amber-100/70'
                    : 'border-stone-300 bg-white hover:border-amber-400'
                }`}
              >
                <input
                  type="radio"
                  className="mt-0.5 h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                  name="decision"
                  value={opt}
                  checked={selectedOption === opt}
                  onChange={() => setSelectedOption(opt)}
                  disabled={submitting}
                />
                <span className="text-slate-900">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.round((currentSession.coverage ?? 0) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-stone-700">
              Coverage: {Math.round((currentSession.coverage ?? 0) * 100)}% · Confidence:{' '}
              {Math.round((currentSession.confidenceScore ?? 0) * 100)}%
            </p>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? 'Analyzing decision…' : 'Submit decision'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}