import { Link } from 'react-router-dom';

// Inline SVG icons — no emojis
function IconBrain({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M9.5 2a4.5 4.5 0 0 1 4.5 4.5v.5h.5a3.5 3.5 0 0 1 0 7H9A4.5 4.5 0 0 1 9.5 2z"/>
      <path d="M14.5 22a4.5 4.5 0 0 1-4.5-4.5V17h-.5a3.5 3.5 0 0 1 0-7H15a4.5 4.5 0 0 1-.5 12z"/>
    </svg>
  );
}
function IconCode({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}
function IconChart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}
function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconBug({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M9 9h.01M15 9h.01"/>
      <path d="M12 3C9.24 3 7 5.24 7 8v5c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-2.76-2.24-5-5-5z"/>
      <path d="M7 10H3M21 10h-4M7 14H3M21 14h-4" strokeLinecap="round"/>
    </svg>
  );
}
function IconLayers({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  );
}
function IconTarget({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconArrow({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

const ROLES = [
  "Data Analyst", "Data Scientist", "Backend Engineer", "ML Engineer",
  "Product Manager", "Cloud Engineer", "AI/ML Architect", "Cloud Architect",
  "DevOps Engineer", "Cybersecurity Specialist", "Fullstack Developer",
  "Big Data Engineer", "IoT Architect", "Blockchain Developer",
];

const QUESTION_TYPES = [
  { icon: <IconTarget className="w-4 h-4" />, label: "Scenario Chain", desc: "Progressive decisions with real complications" },
  { icon: <IconBug className="w-4 h-4" />, label: "Debug the Code", desc: "Spot bugs in realistic code snippets" },
  { icon: <IconCode className="w-4 h-4" />, label: "Fix the Code", desc: "Edit and correct broken implementations" },
  { icon: <IconShield className="w-4 h-4" />, label: "Code Review", desc: "Review PR diffs like a senior engineer" },
  { icon: <IconLayers className="w-4 h-4" />, label: "Log Detective", desc: "Diagnose root cause from stack traces" },
  { icon: <IconChart className="w-4 h-4" />, label: "Complexity Analysis", desc: "Analyse Big-O and optimise algorithms" },
];

const NINE_SKILLS = [
  "Decision Making", "Debugging Ability", "Code Correctness",
  "Code Quality", "Incident Diagnosis", "Algorithmic Thinking",
  "Communication Clarity", "Adaptability Under Pressure", "Technical Depth",
];

export function HomePage() {
  return (
    <div className="space-y-10">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="glass-panel p-8 space-y-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-600">
              Adaptive Technical Interview Platform
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl leading-tight">
              Know exactly where your<br/>
              <span className="text-orange-600">capability gaps</span> are.
            </h1>
          </div>
          <p className="max-w-lg text-sm text-slate-600 leading-relaxed">
            Capaby AI runs a 6-question adaptive assessment across scenario decisions, live debugging,
            code review, and log diagnosis — then scores you on 9 skill dimensions with a personalised
            learning path.
          </p>

          {/* 6-step flow */}
          <div className="flex items-center gap-1 flex-wrap">
            {["Scenario Chain","Debug","Fix Code","Code Review","Log Detective","Complexity"].map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  Q{i+1} {step}
                </span>
                {i < 5 && <span className="text-stone-300 text-xs">›</span>}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/roles" className="primary-btn flex items-center gap-2">
              Start Assessment
              <IconArrow className="w-4 h-4" />
            </Link>
            <Link to="/dashboard" className="secondary-btn">
              View past results
            </Link>
          </div>
        </div>

        {/* 9 skills panel */}
        <div className="glass-panel p-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
            9 Skill Dimensions Scored
          </p>
          <div className="space-y-1.5">
            {NINE_SKILLS.map((skill, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="text-emerald-500 flex-shrink-0">
                  <IconCheck className="w-3.5 h-3.5" />
                </span>
                {skill}
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-stone-200">
            <p className="text-[10px] text-slate-500">
              Each skill is mapped to a specific question type and scored independently by AI agents.
            </p>
          </div>
        </div>
      </div>

      {/* ── 6 Question types ─────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Assessment Format — 6 Questions
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {QUESTION_TYPES.map((qt, i) => (
            <div key={i} className="glass-panel p-4 flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                {qt.icon}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-slate-800">
                  <span className="text-orange-500 mr-1.5 font-bold">Q{i+1}</span>{qt.label}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{qt.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works + Roles ─────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-[1fr_1fr_300px]">

        <div className="glass-panel p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
            Multi-Agent Evaluation
          </p>
          <div className="space-y-3">
            {[
              { icon: <IconBrain className="w-4 h-4"/>, label: "Observer", desc: "Watches how you reason through the problem" },
              { icon: <IconShield className="w-4 h-4"/>, label: "Critic", desc: "Scores depth, accuracy and edge-case thinking" },
              { icon: <IconChart className="w-4 h-4"/>, label: "Guide", desc: "Prompts deeper thinking with follow-up questions" },
            ].map((agent, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  {agent.icon}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-800">{agent.label}</p>
                  <p className="text-[11px] text-slate-500">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
            What You Get
          </p>
          <div className="space-y-2">
            {[
              "Radar chart of all 9 skill scores",
              "Weak area callout with priority flags",
              "Personalised learning path",
              "Performance label per skill (Needs Work → Expert)",
              "Overall readiness score out of 100",
              "AI narrative summary of your profile",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="mt-0.5 text-emerald-500 flex-shrink-0"><IconCheck className="w-3.5 h-3.5"/></span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
            14 Supported Roles
          </p>
          <div className="space-y-1">
            {ROLES.map((role, i) => (
              <p key={i} className="text-[11px] text-slate-600 py-0.5 border-b border-stone-100 last:border-0">
                {role}
              </p>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
