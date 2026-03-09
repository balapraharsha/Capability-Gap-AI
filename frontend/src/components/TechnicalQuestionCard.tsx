/*
TechnicalQuestionCard Component

This file contains the UI components used to render technical interview
questions in the assessment system.

It supports multiple question formats including:
- Debugging questions (bug identification in code)
- Fix-the-code challenges (editable code editor)
- Code review questions (PR diff analysis)
- Log investigation questions (server logs)
- Algorithm complexity questions (Big-O reasoning)

The component dynamically renders the appropriate interface depending
on the question type. It also includes reusable UI blocks for displaying
code snippets, diffs, logs, and an editor for code correction tasks.

Major parts of this file:
1. SVG icon components used for question types and UI actions
2. UI blocks for displaying code, diffs, and logs
3. Fix-the-Code editor component
4. Main TechnicalQuestionCard component that renders the full question UI
*/

import { useState } from 'react';
import type { Question } from '../types';
import { QUESTION_TYPE_META } from '../types';

// SVG icons used across the UI for different question types and actions

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

// Map each question type to an icon shown in the header

const TYPE_ICONS: Record<string, JSX.Element> = {
  debugging:    <IcoBug />,
  fix_the_code: <IcoCode />,
  code_review:  <IcoEye />,
  log_detective:<IcoTerminal />,
  complexity:   <IcoLightning />,
};

// Displays a formatted code snippet with a copy-to-clipboard button

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
        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
          {language || 'code'}
        </span>
        <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded border border-slate-600 hover:border-slate-400">
          <IcoCopy />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Displays a pull request diff used in code review questions

function DiffBlock({ diff }: { diff: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
          Pull Request Diff
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono">
        {diff.split('\n').map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith('+')
                ? 'text-green-400'
                : line.startsWith('-')
                ? 'text-red-400'
                : 'text-slate-300'
            }
          >
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

// Displays server log output with color-coded severity levels

function LogBlock({ logs }: { logs: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
          Server Logs
        </span>
      </div>

      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed font-mono">
        {logs.split('\n').map((line, i) => (
          <div
            key={i}
            className={
              line.includes('[ERROR]')
                ? 'text-red-400'
                : line.includes('[WARN]')
                ? 'text-yellow-400'
                : line.includes('[INFO]')
                ? 'text-blue-300'
                : 'text-slate-300'
            }
          >
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

// Editable code editor used for fix-the-code challenges

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
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        className="w-full bg-slate-900 text-slate-100 font-mono text-[13px] leading-relaxed p-4 resize-y min-h-[180px] focus:outline-none focus:ring-1 focus:ring-amber-400"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
    </div>
  );
}

// Main card component that renders the full technical question interface

interface TechnicalQuestionCardProps {
  question: Question;
  selectedOption: string;
  onOptionSelect: (val: string) => void;
  onCodeChange?: (val: string) => void;
  submitting: boolean;
}