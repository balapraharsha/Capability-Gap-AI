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

// ─────────────────────────────────────────────────
// Question progress tracker (6 slots)
// ─────────────────────────────────────────────────

const QUESTION_SLOTS = [
  { icon: '🎯', label: 'Scenario Chain' },
  { icon: '🐛', label: 'Debug' },
  { icon: '🔧', label: 'Fix Code' },
  { icon: '👁️', label: 'Code Review' },
  { icon: '🔍', label: 'Log Detective' },
  { icon: '⚡', label: 'Complexity' },
];

function QuestionProgressBar({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {QUESTION_SLOTS.map((slot, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div
            className={`w-full h-1.5 rounded-full transition-all duration-500 ${
              i < currentIndex
                ? 'bg-green-400'
                : i === currentIndex
                  ? 'bg-amber-500'
                  : 'bg-stone-200'
            }`}
          />
          <span className={`mt-1 text-[8px] font-medium ${
            i === currentIndex ? 'text-amber-600' : i < currentIndex ? 'text-green-600' : 'text-stone-400'
          }`}>
            {i < currentIndex ? '✓' : slot.icon}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Scenario Arc sidebar (Q1 chain only)
// ─────────────────────────────────────────────────

function ScenarioArc({
  steps,
  rootScenario,
  lastComplication,
  currentStepIndex,
}: {
  steps: ScenarioStep[];
  rootScenario: string;
  lastComplication?: string | null;
  currentStepIndex: number;
}) {
  const nodes = [
    { label: 'Scenario', sub: rootScenario.slice(0, 72) + (rootScenario.length > 72 ? '…' : ''), done: true, active: currentStepIndex === 0 },
    ...steps.map((s, i) => ({
      label: i === 0 ? 'Decision 1' : i === 1 ? 'Decision 2' : 'Final Decision',
      sub: s.candidateAnswer.slice(0, 60) + (s.candidateAnswer.length > 60 ? '…' : ''),
      done: true,
      active: false,
    })),
    ...(lastComplication
      ? [{
          label: 'Complication',
          sub: lastComplication.slice(0, 72) + (lastComplication.length > 72 ? '…' : ''),
          done: true,
          active: false,
          isComplication: true,
        }]
      : []),
    {
      label: currentStepIndex === 0 ? 'Decision 1' : currentStepIndex === 1 ? 'Decision 2' : 'Final Decision',
      sub: 'Your next move…',
      done: false,
      active: true,
    },
    { label: 'Final Evaluation', sub: 'Awaiting outcome', done: false, active: false },
  ];

  return (
    <div className="glass-panel p-4 space-y-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-600 mb-3">
        Scenario Arc
      </p>
      <div className="relative">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-start gap-3 relative">
            {i < nodes.length - 1 && (
              <div className="absolute left-[9px] top-5 w-px h-full bg-amber-200 z-0" />
            )}
            <div
              className={`relative z-10 mt-0.5 flex-shrink-0 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center
                ${node.active
                  ? 'border-orange-500 bg-orange-500'
                  : node.done
                    ? (node as any).isComplication
                      ? 'border-amber-600 bg-amber-100'
                      : 'border-green-500 bg-green-100'
                    : 'border-stone-300 bg-white'
                }`}
            >
              {node.done && !node.active && (
                <span className="text-[8px] font-bold text-green-600">✓</span>
              )}
              {node.active && (
                <span className="block h-2 w-2 rounded-full bg-white" />
              )}
            </div>
            <div className={`pb-4 ${i === nodes.length - 1 ? 'pb-0' : ''}`}>
              <p className={`text-[11px] font-semibold leading-tight
                ${node.active ? 'text-orange-600' : node.done ? 'text-slate-800' : 'text-stone-400'}`}>
                {node.label}
              </p>
              <p className={`text-[10px] leading-snug mt-0.5
                ${node.active ? 'text-slate-600' : node.done ? 'text-slate-500' : 'text-stone-300'}`}>
                {node.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Complication banner
// ─────────────────────────────────────────────────

function ComplicationBanner({ text, onContinue }: { text: string; onContinue: () => void }) {
  return (
    <div className="glass-panel border-amber-500 bg-amber-50/95 p-5 space-y-3 animate-fade-slide-in">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">
          Situation Update
        </p>
      </div>
      <p className="text-sm text-slate-900 leading-relaxed">{text}</p>
      <button type="button" onClick={onContinue} className="primary-btn text-xs py-1.5 px-4">
        Continue →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────
// AI evaluation panel
// ─────────────────────────────────────────────────

function EvaluationPanel({
  observerSummary,
  criticFeedback,
  guidePrompt,
}: {
  observerSummary?: string;
  criticFeedback?: string;
  guidePrompt?: string;
}) {
  return (
    <div className="glass-panel space-y-3 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
        AI Evaluation
      </p>
      <div className="grid gap-3 text-xs md:grid-cols-3">
        <div>
          <p className="mb-1 text-stone-500 font-medium">Observer</p>
          <p className="text-slate-900">{observerSummary}</p>
        </div>
        <div>
          <p className="mb-1 text-stone-500 font-medium">Critic</p>
          <p className="text-slate-900">{criticFeedback}</p>
        </div>
        <div>
          <p className="mb-1 text-stone-500 font-medium">Guide</p>
          <p className="text-slate-900">{guidePrompt}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Question type transition card (shown between questions)
// ─────────────────────────────────────────────────

function QuestionTypeTransition({ type }: { type: string }) {
  const meta = QUESTION_TYPE_META[type] ?? { label: type, icon: '💡', description: '' };
  return (
    <div className="glass-panel p-6 text-center space-y-2 animate-fade-slide-in">
      <span className="text-4xl">{meta.icon}</span>
      <p className="text-lg font-bold text-slate-900">{meta.label}</p>
      <p className="text-sm text-slate-500">{meta.description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Technical question types (non-scenario)
// ─────────────────────────────────────────────────

const TECHNICAL_TYPES = new Set(['debugging', 'fix_the_code', 'code_review', 'log_detective', 'complexity']);

function isTechnicalQuestion(type: string) {
  return TECHNICAL_TYPES.has(type);
}

// ─────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────

type PagePhase = 'question' | 'evaluation' | 'complication';

export function AssessmentPage() {
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
  const [selectedOption, setSelectedOption] = useState('');
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string>(new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PagePhase>('question');
  const [showTransition, setShowTransition] = useState(false);

  const [pendingComplication, setPendingComplication] = useState<string | null>(null);
  const [pendingNextQuestion, setPendingNextQuestion] = useState<Question | null>(null);
  const [arcSteps, setArcSteps] = useState<ScenarioStep[]>([]);

  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentSession) navigate('/roles');
  }, [currentSession, navigate]);

  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartedAt(new Date().toISOString());
      setSelectedOption('');
      setEditedCode(null);
      setError(null);
    }
  }, [currentQuestion?.questionId]);

  if (!currentSession) return null;

  const q = currentQuestion as Question;
  const currentChainStep = q?.chainStep ?? null;
  const isInChain = currentChainStep !== null && currentChainStep !== undefined;
  const chain = currentSession.scenarioChain;
  const isTechnical = q ? isTechnicalQuestion(q.type) : false;

  // 0-based slot index for the progress bar
  const slotIndex = Math.max(0, (currentSession.questionCount ?? 1) - 1);

  // ── Submit answer ──────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // For fix_the_code: require explanation text; code change is optional
    const answerValue = isTechnical && q.type === 'fix_the_code'
      ? `${selectedOption}\n\n[Fixed code]:\n${editedCode ?? q.code ?? ''}`
      : selectedOption;

    if (!answerValue.trim()) {
      setError('Please provide an answer before continuing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await submitAnswer({
        sessionId: currentSession!.sessionId,
        questionId: q.questionId,
        answer: answerValue,
        startedAtIso: questionStartedAt,
        endedAtIso: new Date().toISOString(),
      });

      setLastEvaluation(res.evaluation);

      // Accumulate arc steps for Q1 chain
      if (currentChainStep !== null && currentChainStep !== undefined) {
        const newStep: ScenarioStep = {
          stepIndex: currentChainStep,
          type: currentChainStep === 0 ? 'initial' : 'follow_up',
          questionId: q.questionId,
          questionText: `${q.scenario}\n${q.question ?? ''}`,
          candidateAnswer: answerValue,
          complicationText: q.complicationText ?? null,
          criticScore: 0,
          observerSummary: res.evaluation?.observerSummary ?? '',
        };
        setArcSteps((prev) => [...prev, newStep]);
      }

      const updatedSession = {
        ...currentSession!,
        testedCompetencies: res.testedCompetencies ?? currentSession!.testedCompetencies ?? [],
        remainingCompetencies: res.remainingCompetencies ?? currentSession!.remainingCompetencies ?? [],
        confidenceScore: res.confidenceScore ?? currentSession!.confidenceScore ?? 0,
        coverage: res.coverage ?? currentSession!.coverage ?? 0,
        questionCount: res.questionCount ?? (currentSession!.questionCount ?? 1) + 1,
        status: res.status ?? currentSession!.status,
        scenarioChain: res.scenarioChain ?? currentSession!.scenarioChain,
        currentQuestion: res.nextQuestion ?? null,
      } as typeof currentSession;

      setSession(updatedSession);

      if (res.status === 'completed') {
        if (res.report) setReport(res.report);
        navigate('/report');
        return;
      }

      if (res.complicationText) {
        setPendingComplication(res.complicationText);
        setPendingNextQuestion(res.nextQuestion);
        setPhase('evaluation');
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Show brief transition card when switching from chain → technical
      const nextType = res.nextQuestion?.type;
      if (nextType && isTechnicalQuestion(nextType) && !isTechnical) {
        setShowTransition(true);
        setTimeout(() => setShowTransition(false), 1800);
      }

      setCurrentQuestion(res.nextQuestion ?? null);
      setPhase('question');
      topRef.current?.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      setError('Unable to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinueAfterComplication() {
    setCurrentQuestion(pendingNextQuestion);
    setPendingComplication(null);
    setPendingNextQuestion(null);
    setPhase('question');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!currentQuestion && !lastEvaluation) {
    return (
      <div className="glass-panel p-6 text-center text-sm text-slate-300">
        No question available. Please start a new assessment.
        <button type="button" className="primary-btn mt-4" onClick={() => navigate('/roles')}>
          Start assessment
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────

  return (
    <div className="space-y-4" ref={topRef}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black">
            Question {currentSession.questionCount} of 6 · {formatRole(currentSession.role)} ·{' '}
            {formatLevel(currentSession.level)}
          </h2>
          <p className="text-xs text-slate-700">
            {q && isTechnical
              ? (QUESTION_TYPE_META[q.type]?.label ?? formatQuestionType(q.type))
              : formatQuestionType(q?.type || 'technical_reasoning')
            }
            {' · '}Evaluating {formatCompetency(q?.competency || '')}
            {isInChain && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                ⚡ Scenario Arc · Step {(currentChainStep ?? 0) + 1}
              </span>
            )}
          </p>
        </div>
        {phase === 'question' && <TimerBadge startedAt={questionStartedAt} />}
      </div>

      {/* 6-slot progress bar */}
      <QuestionProgressBar currentIndex={slotIndex} />

      {/* Transition card */}
      {showTransition && q && (
        <QuestionTypeTransition type={q.type} />
      )}

      {/* Two-column layout for chain arc */}
      <div className={isInChain && arcSteps.length > 0 ? 'grid gap-4 md:grid-cols-[220px_1fr]' : ''}>

        {/* Arc sidebar */}
        {isInChain && arcSteps.length > 0 && chain && (
          <div className="hidden md:block">
            <ScenarioArc
              steps={arcSteps}
              rootScenario={chain.rootScenario}
              lastComplication={chain.lastComplication}
              currentStepIndex={currentChainStep ?? arcSteps.length}
            />
          </div>
        )}

        <div className="space-y-4 min-w-0">

          {/* Evaluation panel */}
          {phase === 'evaluation' && lastEvaluation && (
            <EvaluationPanel
              observerSummary={lastEvaluation.observerSummary}
              criticFeedback={lastEvaluation.criticFeedback}
              guidePrompt={lastEvaluation.guidePrompt}
            />
          )}

          {/* Complication banner */}
          {phase === 'evaluation' && pendingComplication && (
            <ComplicationBanner
              text={pendingComplication}
              onContinue={handleContinueAfterComplication}
            />
          )}

          {/* Previous evaluation (collapsed) */}
          {phase === 'question' && lastEvaluation && arcSteps.length > 0 && (
            <details className="glass-panel p-4 text-xs cursor-pointer">
              <summary className="font-semibold text-orange-700 uppercase tracking-wider text-[10px]">
                Previous evaluation ▸
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="mb-1 text-stone-500 font-medium">Observer</p>
                  <p className="text-slate-900">{lastEvaluation.observerSummary}</p>
                </div>
                <div>
                  <p className="mb-1 text-stone-500 font-medium">Critic</p>
                  <p className="text-slate-900">{lastEvaluation.criticFeedback}</p>
                </div>
                <div>
                  <p className="mb-1 text-stone-500 font-medium">Guide</p>
                  <p className="text-slate-900">{lastEvaluation.guidePrompt}</p>
                </div>
              </div>
            </details>
          )}

          {/* Question content */}
          {phase === 'question' && q && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Complication context chip */}
              {q.complicationText && (
                <div className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-xs text-slate-800 leading-relaxed">
                  <span className="font-semibold text-amber-700 mr-1">⚡ Update:</span>
                  {q.complicationText}
                </div>
              )}

              {/* ── TECHNICAL question (Q2-Q6) ── */}
              {isTechnical ? (
                <div className="glass-panel p-5">
                  <TechnicalQuestionCard
                    question={q}
                    selectedOption={selectedOption}
                    onOptionSelect={setSelectedOption}
                    onCodeChange={setEditedCode}
                    submitting={submitting}
                  />
                </div>
              ) : (
                /* ── SCENARIO question (Q1 chain) ── */
                <>
                  <div className="glass-panel question-card p-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                      Scenario
                    </p>
                    <p className="text-sm text-slate-900">{q.scenario}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
                      Question
                    </p>
                    <p className="text-base font-semibold text-black">{q.question}</p>
                    {q.difficulty === 'hard' && (
                      <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        High pressure
                      </span>
                    )}
                  </div>

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
                </>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Footer: progress + submit */}
              <div className="space-y-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${Math.round(((currentSession.questionCount ?? 1) / 6) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-stone-700">
                    Question {currentSession.questionCount} of 6 · Confidence:{' '}
                    {Math.round((currentSession.confidenceScore ?? 0) * 100)}%
                  </p>
                  <button type="submit" className="primary-btn" disabled={submitting}>
                    {submitting ? 'Analysing…' : 'Submit'}
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
