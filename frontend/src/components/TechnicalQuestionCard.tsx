import { useState } from 'react';
import type { Question } from '../types';
import { QUESTION_TYPE_META } from '../types';

// ── SVG icons only — no emojis ───────────────────────────────────

function IcoBug({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="M9 9h.01M15 9h.01"/><path d="M12 3C9.24 3 7 5.24 7 8v5c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-2.76-2.24-5-5-5z"/><path d="M7 10H3M21 10h-4M7 14H3M21 14h-4" strokeLinecap="round"/></svg>;
}
function IcoCode({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
}
function IcoEye({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IcoTerminal({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="8 10 12 14 8 18" strokeLinecap="round" strokeLinejoin="round"/><line x1="14" y1="18" x2="20" y2="18" strokeLinecap="round"/></svg>;
}
function IcoLightning({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IcoCopy({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
function IcoEdit({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function IcoHint({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}

const TYPE_ICONS: Record<string, JSX.Element> = {
  debugging:    <IcoBug />,
  fix_the_code: <IcoCode />,
  code_review:  <IcoEye />,
  log_detective:<IcoTerminal />,
  complexity:   <IcoLightning />,
};

// ── Code block ────────────────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">{language || 'code'}</span>
        <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded border border-slate-600 hover:border-slate-400">
          <IcoCopy />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-slate-100"><code>{code}</code></pre>
    </div>
  );
}

// ── Diff block ────────────────────────────────────────────────────

function DiffBlock({ diff }: { diff: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">Pull Request Diff</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono">
        {diff.split('\n').map((line, i) => (
          <div key={i} className={line.startsWith('+') ? 'text-green-400' : line.startsWith('-') ? 'text-red-400' : 'text-slate-300'}>
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

// ── Log block ─────────────────────────────────────────────────────

function LogBlock({ logs }: { logs: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">Server Logs</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed font-mono">
        {logs.split('\n').map((line, i) => (
          <div key={i} className={
            line.includes('[ERROR]') ? 'text-red-400' :
            line.includes('[WARN]')  ? 'text-yellow-400' :
            line.includes('[INFO]')  ? 'text-blue-300' :
            'text-slate-300'
          }>
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

// ── Fix-the-code editor ───────────────────────────────────────────

export function FixTheCodeEditor({ initialCode, language, onChange }: {
  initialCode: string; language?: string; onChange: (val: string) => void;
}) {
  const [value, setValue] = useState(initialCode);
  return (
    <div className="rounded-xl overflow-hidden border border-amber-400 bg-slate-900">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-amber-500/50">
        <IcoEdit className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-mono font-semibold text-amber-400 uppercase tracking-widest">
          Edit to fix — {language || 'code'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={e => { setValue(e.target.value); onChange(e.target.value); }}
        className="w-full bg-slate-900 text-slate-100 font-mono text-[13px] leading-relaxed p-4 resize-y min-h-[180px] focus:outline-none focus:ring-1 focus:ring-amber-400"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

interface TechnicalQuestionCardProps {
  question: Question;
  selectedOption: string;
  onOptionSelect: (val: string) => void;
  onCodeChange?: (val: string) => void;
  submitting: boolean;
}

export function TechnicalQuestionCard({
  question, selectedOption, onOptionSelect, onCodeChange, submitting,
}: TechnicalQuestionCardProps) {
  const meta = QUESTION_TYPE_META[question.type] ?? { label: question.type, description: '' };
  const isFixTheCode = question.type === 'fix_the_code';
  const hasOptions = (question.options?.length ?? 0) > 0;
  const icon = TYPE_ICONS[question.type];

  const difficultyBadge = question.difficulty === 'hard'
    ? <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600">Hard</span>
    : question.difficulty === 'medium'
      ? <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Medium</span>
      : null;

  const questionLabel =
    question.type === 'debugging'     ? 'What is the bug?' :
    question.type === 'code_review'   ? 'What feedback would you leave?' :
    question.type === 'log_detective' ? 'What is the root cause?' :
    question.type === 'complexity'    ? 'What is the complexity and how would you fix it?' :
    'Choose the best answer.';

  return (
    <div className="space-y-4">

      {/* Type header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            {icon}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">{meta.label}</p>
            <p className="text-[10px] text-slate-500">{meta.description}</p>
          </div>
        </div>
        {difficultyBadge}
      </div>

      {/* Scenario */}
      {question.scenario && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">Scenario</p>
          <p className="text-sm text-slate-800 leading-relaxed">{question.scenario}</p>
        </div>
      )}

      {/* Code (debugging / complexity) */}
      {question.code && !isFixTheCode && <CodeBlock code={question.code} language={question.language} />}

      {/* Diff (code review) */}
      {question.diff && <DiffBlock diff={question.diff} />}

      {/* Logs (log detective) */}
      {question.logs && <LogBlock logs={question.logs} />}

      {/* Task */}
      {(question.task || question.question) && (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">
            {isFixTheCode ? 'Your Task' : 'Question'}
          </p>
          <p className="text-sm font-semibold text-slate-900">{question.task || question.question}</p>
          {question.hint && (
            <div className="flex items-start gap-1.5 mt-2 text-[11px] text-amber-700">
              <IcoHint className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{question.hint}</span>
            </div>
          )}
        </div>
      )}

      {/* Fix-the-code editor */}
      {isFixTheCode && question.code && (
        <FixTheCodeEditor
          initialCode={question.code}
          language={question.language}
          onChange={(val) => onCodeChange?.(val)}
        />
      )}

      {/* MCQ options */}
      {hasOptions && !isFixTheCode && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold text-stone-700">{questionLabel}</legend>
          <div className="space-y-2">
            {question.options!.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs shadow-sm transition-all duration-150 hover:shadow-md font-mono ${
                  selectedOption === opt
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-stone-200 bg-white hover:border-orange-300'
                }`}
              >
                <input
                  type="radio"
                  className="mt-0.5 h-3.5 w-3.5 text-orange-600 focus:ring-orange-400 flex-shrink-0"
                  name="technical_decision"
                  value={opt}
                  checked={selectedOption === opt}
                  onChange={() => onOptionSelect(opt)}
                  disabled={submitting}
                />
                <span className="text-slate-800 leading-relaxed">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Fix-the-code explanation */}
      {isFixTheCode && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-stone-700">Explain the bug and your fix:</p>
          <textarea
            value={selectedOption}
            onChange={(e) => onOptionSelect(e.target.value)}
            placeholder="e.g. The magnitude calculation was missing math.sqrt()…"
            disabled={submitting}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none min-h-[72px]"
          />
        </div>
      )}
    </div>
  );
}
