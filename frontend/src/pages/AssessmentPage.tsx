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
// All SVG icons — zero emojis
// ─────────────────────────────────────────────────

function IcoTarget({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function IcoBug({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M9 9h.01M15 9h.01"/><path d="M12 3C9.24 3 7 5.24 7 8v5c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-2.76-2.24-5-5-5z"/><path d="M7 10H3M21 10h-4M7 14H3M21 14h-4" strokeLinecap="round"/></svg>;
}
function IcoCode({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
}
function IcoEye({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IcoTerminal({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="8 10 12 14 8 18" strokeLinecap="round" strokeLinejoin="round"/><line x1="14" y1="18" x2="20" y2="18" strokeLinecap="round"/></svg>;
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

// ─────────────────────────────────────────────────
// 6-slot progress bar — SVG icons only
// ─────────────────────────────────────────────────

const SLOTS = [
  { icon: <IcoTarget />,    label: 'Scenario' },
  { icon: <IcoBug />,       label: 'Debug' },
  { icon: <IcoCode />,      label: 'Fix Code' },
  { icon: <IcoEye />,       label: 'Review' },
  { icon: <IcoTerminal />,  label: 'Logs' },
  { icon: <IcoLightning />, label: 'Complexity' },
];

function ProgressBar({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-end gap-1.5">
      {SLOTS.map((slot, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-400' : active ? 'bg-amber-500' : 'bg-stone-200'}`} />
            <span className={`transition-colors ${done ? 'text-emerald-500' : active ? 'text-amber-600' : 'text-stone-300'}`}>
              {done
                ? <IcoCheck className="w-3 h-3" />
                : <span className={active ? 'text-amber-600' : 'text-stone-300'}>{slot.icon}</span>
              }
            </span>
            <span className={`text-[8px] font-medium uppercase tracking-wide hidden md:block ${active ? 'text-amber-700' : done ? 'text-emerald-600' : 'text-stone-400'}`}>
              {slot.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Scenario Arc sidebar
// ─────────────────────────────────────────────────

function ScenarioArc({ steps, rootScenario, lastComplication, currentStepIndex }: {
  steps: ScenarioStep[];
  rootScenario: string;
  lastComplication?: string | null;
  currentStepIndex: number;
}) {
  const nodes = [
    { label: 'Scenario', sub: rootScenario.slice(0, 72) + (rootScenario.length > 72 ? '…' : ''), done: true, active: false },
    ...steps.map((s, i) => ({
      label: i === 0 ? 'Decision 1' : i === 1 ? 'Decision 2' : 'Final Decision',
      sub: s.candidateAnswer.slice(0, 60) + (s.candidateAnswer.length > 60 ? '…' : ''),
      done: true, active: false,
    })),
    ...(lastComplication ? [{ label: 'Complication', sub: lastComplication.slice(0, 72) + '…', done: true, active: false, isComp: true }] : []),
    {
      label: currentStepIndex === 0 ? 'Decision 1' : currentStepIndex === 1 ? 'Decision 2' : 'Final Decision',
      sub: 'Your next move…', done: false, active: true,
    },
    { label: 'Final Evaluation', sub: 'Awaiting outcome', done: false, active: false },
  ];

  return (
    <div className="glass-panel p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-3">Scenario Arc</p>
      <div className="relative space-y-0">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-start gap-3 relative">
            {i < nodes.length - 1 && <div className="absolute left-[9px] top-5 w-px h-full bg-amber-200 z-0" />}
            <div className={`relative z-10 mt-0.5 flex-shrink-0 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center ${
              node.active ? 'border-orange-500 bg-orange-500' :
              node.done ? ((node as any).isComp ? 'border-amber-500 bg-amber-100' : 'border-emerald-500 bg-emerald-100') :
              'border-stone-300 bg-white'
            }`}>
              {node.done && !node.active && <IcoCheck className="w-2.5 h-2.5 text-emerald-600" />}
              {node.active && <span className="block h-2 w-2 rounded-full bg-white" />}
            </div>
            <div className="pb-4">
              <p className={`text-[11px] font-semibold ${node.active ? 'text-orange-600' : node.done ? 'text-slate-800' : 'text-stone-400'}`}>{node.label}</p>
              <p className={`text-[10px] mt-0.5 ${node.active ? 'text-slate-600' : node.done ? 'text-slate-500' : 'text-stone-300'}`}>{node.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Complication banner — no emojis
// ─────────────────────────────────────────────────

function ComplicationBanner({ text, onContinue }: { text: string; onContinue: () => void }) {
  return (
    <div className="glass-panel border-amber-400 bg-amber-50/95 p-5 space-y-3">
      <div className="flex items-center gap-2 text-amber-700">
        <IcoAlert className="w-4 h-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest">Situation Update</p>
      </div>
      <p className="text-sm text-slate-900 leading-relaxed">{text}</p>
      <button type="button" onClick={onContinue} className="primary-btn text-xs py-1.5 px-4">
        Continue
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Evaluation panel
// ─────────────────────────────────────────────────

function EvaluationPanel({ observerSummary, criticFeedback, guidePrompt }: {
  observerSummary?: string; criticFeedback?: string; guidePrompt?: string;
}) {
  return (
    <div className="glass-panel space-y-3 p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">AI Evaluation</p>
      <div className="grid gap-3 text-xs md:grid-cols-3">
        {[['Observer', observerSummary], ['Critic', criticFeedback], ['Guide', guidePrompt]].map(([label, text]) => (
          <div key={label}>
            <p className="mb-1 text-stone-500 font-semibold text-[10px] uppercase tracking-wider">{label}</p>
            <p className="text-slate-900 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Question type banner shown at start of technical Qs
// ─────────────────────────────────────────────────

const TYPE_ICONS: Record<string, JSX.Element> = {
  debugging:    <IcoBug className="w-6 h-6" />,
  fix_the_code: <IcoCode className="w-6 h-6" />,
  code_review:  <IcoEye className="w-6 h-6" />,
  log_detective:<IcoTerminal className="w-6 h-6" />,
  complexity:   <IcoLightning className="w-6 h-6" />,
};

// ─────────────────────────────────────────────────
// Technical question types set
// ─────────────────────────────────────────────────

const TECHNICAL_TYPES = new Set(['debugging', 'fix_the_code', 'code_review', 'log_detective', 'complexity']);
function isTechnical(type: string) { return TECHNICAL_TYPES.has(type); }

// ─────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────

type PagePhase = 'question' | 'evaluation';

export function AssessmentPage() {
  const {
    currentSession, currentQuestion, lastEvaluation,
    setCurrentQuestion, setLastEvaluation, setSession, setReport,
  } = useAssessment();

  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState('');
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string>(new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PagePhase>('question');
  const [pendingComplication, setPendingComplication] = useState<string | null>(null);
  const [pendingNextQuestion, setPendingNextQuestion] = useState<Question | null>(null);
  const [arcSteps, setArcSteps] = useState<ScenarioStep[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!currentSession) navigate('/roles'); }, [currentSession, navigate]);

  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartedAt(new Date().toISOString());
      setSelectedOption('');
      setEditedCode(null);
      setError(null);
      setPhase('question');
    }
  }, [currentQuestion?.questionId]);

  if (!currentSession) return null;

  const q = currentQuestion as Question;
  const currentChainStep = q?.chainStep ?? null;
  const isInChain = currentChainStep !== null && currentChainStep !== undefined;
  const chain = currentSession.scenarioChain;
  const isTech = q ? isTechnical(q.type) : false;
  const slotIndex = Math.max(0, (currentSession.questionCount ?? 1) - 1);
  const meta = QUESTION_TYPE_META[q?.type ?? ''];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const answerValue = isTech && q.type === 'fix_the_code'
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

      if (currentChainStep !== null && currentChainStep !== undefined) {
        setArcSteps(prev => [...prev, {
          stepIndex: currentChainStep,
          type: currentChainStep === 0 ? 'initial' : 'follow_up',
          questionId: q.questionId,
          questionText: `${q.scenario}\n${q.question ?? ''}`,
          candidateAnswer: answerValue,
          complicationText: q.complicationText ?? null,
          criticScore: 0,
          observerSummary: res.evaluation?.observerSummary ?? '',
        }]);
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

      setCurrentQuestion(res.nextQuestion ?? null);
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
      <div className="glass-panel p-6 text-center text-sm text-slate-500">
        No question available.
        <button type="button" className="primary-btn mt-4 block mx-auto" onClick={() => navigate('/roles')}>
          Start new assessment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl" ref={topRef}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Question {currentSession.questionCount} of 6
            <span className="mx-1.5 text-stone-300">·</span>
            {formatRole(currentSession.role)}
            <span className="mx-1.5 text-stone-300">·</span>
            {formatLevel(currentSession.level)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {isTech && meta ? (
              <span className="flex items-center gap-1 text-orange-600 font-medium">
                <span className="w-3.5 h-3.5 inline-flex">{TYPE_ICONS[q.type]}</span>
                {meta.label}
              </span>
            ) : (
              <span>{formatQuestionType(q?.type || 'technical_reasoning')}</span>
            )}
            <span className="text-stone-300">·</span>
            <span>Evaluating {formatCompetency(q?.competency || '')}</span>
            {isInChain && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <IcoTarget className="w-3 h-3" />
                Scenario Arc · Step {(currentChainStep ?? 0) + 1}
              </span>
            )}
          </p>
        </div>
        {phase === 'question' && <TimerBadge startedAt={questionStartedAt} />}
      </div>

      {/* Progress bar */}
      <ProgressBar currentIndex={slotIndex} />

      {/* Two-column layout for chain */}
      <div className={isInChain && arcSteps.length > 0 ? 'grid gap-4 md:grid-cols-[200px_1fr]' : ''}>

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
            <ComplicationBanner text={pendingComplication} onContinue={handleContinueAfterComplication} />
          )}

          {/* Previous evaluation (collapsed) */}
          {phase === 'question' && lastEvaluation && arcSteps.length > 0 && (
            <details className="glass-panel p-4 text-xs cursor-pointer">
              <summary className="font-semibold text-orange-700 uppercase tracking-wider text-[10px]">Previous evaluation</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[['Observer', lastEvaluation.observerSummary], ['Critic', lastEvaluation.criticFeedback], ['Guide', lastEvaluation.guidePrompt]].map(([lbl, txt]) => (
                  <div key={lbl}>
                    <p className="mb-1 text-stone-500 font-semibold text-[10px] uppercase">{lbl}</p>
                    <p className="text-slate-800">{txt}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Question content */}
          {phase === 'question' && q && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Complication context */}
              {q.complicationText && (
                <div className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-xs text-slate-800 leading-relaxed flex items-start gap-2">
                  <IcoAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{q.complicationText}</span>
                </div>
              )}

              {/* Technical question (Q2–Q6) */}
              {isTech ? (
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
                /* Scenario question (Q1 chain) */
                <>
                  <div className="glass-panel p-5 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 mb-1">Scenario</p>
                      <p className="text-sm text-slate-900 leading-relaxed">{q.scenario}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-600 mb-1">Question</p>
                      <p className="text-base font-semibold text-slate-900">{q.question}</p>
                    </div>
                    {q.difficulty === 'hard' && (
                      <span className="inline-block rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        High pressure
                      </span>
                    )}
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-xs font-semibold text-stone-700">
                      Choose the option that best reflects what you would do first.
                    </legend>
                    <div className="space-y-2">
                      {q.options?.map((opt) => (
                        <label
                          key={opt}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs shadow-sm transition-all duration-150 hover:shadow-md ${
                            selectedOption === opt
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-stone-200 bg-white hover:border-orange-300'
                          }`}
                        >
                          <input
                            type="radio"
                            className="mt-0.5 h-3.5 w-3.5 text-orange-600 focus:ring-orange-400 flex-shrink-0"
                            name="decision"
                            value={opt}
                            checked={selectedOption === opt}
                            onChange={() => setSelectedOption(opt)}
                            disabled={submitting}
                          />
                          <span className="text-slate-800">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
                  <IcoAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-stone-600">
                  Question {currentSession.questionCount} of 6
                  <span className="mx-1.5 text-stone-300">·</span>
                  Confidence: {Math.round((currentSession.confidenceScore ?? 0) * 100)}%
                </p>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <IcoRefresh className="w-4 h-4 animate-spin" />
                      Analysing…
                    </span>
                  ) : 'Submit'}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
