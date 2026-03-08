import { useState } from 'react';
import type { Question } from '../types';
import { QUESTION_TYPE_META } from '../types';

// ── Code block with syntax highlighting styling ──────────────────
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded border border-slate-600 hover:border-slate-400"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Diff block for code review ───────────────────────────────────
function DiffBlock({ diff }: { diff: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
          Pull Request Diff
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono">
        {diff.split('\n').map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith('+') ? 'text-green-400' :
              line.startsWith('-') ? 'text-red-400' :
              'text-slate-300'
            }
          >
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

// ── Log block for log detective ───────────────────────────────────
function LogBlock({ logs }: { logs: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="ml-2 text-[11px] font-mono text-slate-400 uppercase tracking-widest">
          Server Logs
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed font-mono">
        {logs.split('\n').map((line, i) => (
          <div
            key={i}
            className={
              line.includes('[ERROR]') ? 'text-red-400' :
              line.includes('[WARN]')  ? 'text-yellow-400' :
              line.includes('[INFO]')  ? 'text-blue-300' :
              'text-slate-300'
            }
          >
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

// ── Editable code area for fix_the_code ─────────────────────────
export function FixTheCodeEditor({
  initialCode,
  language,
  onChange,
}: {
  initialCode: string;
  language?: string;
  onChange: (val: string) => void;
}) {
  const [value, setValue] = useState(initialCode);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    onChange(e.target.value);
  }

  return (
    <div className="rounded-xl overflow-hidden border border-amber-400 bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-amber-500/50">
        <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest">
          ✏️ Edit to fix — {language || 'code'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        className="w-full bg-slate-900 text-slate-100 font-mono text-[13px] leading-relaxed p-4 resize-y min-h-[180px] focus:outline-none focus:ring-1 focus:ring-amber-400"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
    </div>
  );
}

// ── Main technical question card ─────────────────────────────────
interface TechnicalQuestionCardProps {
  question: Question;
  selectedOption: string;
  onOptionSelect: (val: string) => void;
  onCodeChange?: (val: string) => void;
  submitting: boolean;
}

export function TechnicalQuestionCard({
  question,
  selectedOption,
  onOptionSelect,
  onCodeChange,
  submitting,
}: TechnicalQuestionCardProps) {
  const meta = QUESTION_TYPE_META[question.type] ?? { label: question.type, icon: '💡', description: '' };
  const isFixTheCode = question.type === 'fix_the_code';
  const hasOptions = (question.options?.length ?? 0) > 0;

  return (
    <div className="space-y-4 question-card">

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{meta.icon}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-600">
            {meta.label}
          </p>
          <p className="text-[10px] text-slate-500">{meta.description}</p>
        </div>
        {question.difficulty === 'hard' && (
          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            Hard
          </span>
        )}
        {question.difficulty === 'medium' && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Medium
          </span>
        )}
      </div>

      {/* Scenario */}
      {question.scenario && (
        <div className="glass-panel p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-orange-600">
            Scenario
          </p>
          <p className="text-sm text-slate-900">{question.scenario}</p>
        </div>
      )}

      {/* Code block (debugging / complexity) */}
      {question.code && question.type !== 'fix_the_code' && (
        <CodeBlock code={question.code} language={question.language} />
      )}

      {/* Diff block (code review) */}
      {question.diff && (
        <DiffBlock diff={question.diff} />
      )}

      {/* Log block (log detective) */}
      {question.logs && (
        <LogBlock logs={question.logs} />
      )}

      {/* Task / question */}
      {(question.task || question.question) && (
        <div className="glass-panel p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-stone-600">
            {question.type === 'fix_the_code' ? 'Your Task' : 'Question'}
          </p>
          <p className="text-sm font-semibold text-black">
            {question.task || question.question}
          </p>
          {question.hint && (
            <p className="mt-2 text-[11px] text-amber-700 italic">
              💡 Hint: {question.hint}
            </p>
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

      {/* MCQ options (debugging, code_review, log_detective, complexity) */}
      {hasOptions && !isFixTheCode && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold text-stone-800">
            {question.type === 'debugging'    ? 'What is the bug?' :
             question.type === 'code_review'  ? 'What feedback would you leave?' :
             question.type === 'log_detective'? 'What is the root cause?' :
             question.type === 'complexity'   ? 'What is the complexity and fix?' :
             'Choose the best answer.'}
          </legend>
          <div className="space-y-2">
            {question.options!.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-xs shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md font-mono ${
                  selectedOption === opt
                    ? 'border-amber-500 bg-amber-100/70'
                    : 'border-stone-300 bg-white hover:border-amber-400'
                }`}
              >
                <input
                  type="radio"
                  className="mt-0.5 h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 flex-shrink-0"
                  name="technical_decision"
                  value={opt}
                  checked={selectedOption === opt}
                  onChange={() => onOptionSelect(opt)}
                  disabled={submitting}
                />
                <span className="text-slate-900 leading-relaxed">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Fix-the-code: free text explanation below editor */}
      {isFixTheCode && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-stone-700">
            Briefly explain the bug and your fix:
          </p>
          <textarea
            value={selectedOption}
            onChange={(e) => onOptionSelect(e.target.value)}
            placeholder="e.g. The magnitude calculation was missing math.sqrt()…"
            disabled={submitting}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none min-h-[72px]"
          />
        </div>
      )}
    </div>
  );
}
