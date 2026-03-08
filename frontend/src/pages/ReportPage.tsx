import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssessment, formatRole, formatLevel } from '../context/AssessmentContext';
import { fetchReport } from '../api';

// ─────────────────────────────────────────────────
// SVG icons
// ─────────────────────────────────────────────────
const Ico = {
  target:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  bug:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M9 9h.01M15 9h.01"/><path d="M12 3C9.24 3 7 5.24 7 8v5c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-2.76-2.24-5-5-5z"/><path d="M7 10H3M21 10h-4M7 14H3M21 14h-4" strokeLinecap="round"/></svg>,
  code:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  eye:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  terminal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="8 10 12 14 8 18" strokeLinecap="round" strokeLinejoin="round"/><line x1="14" y1="18" x2="20" y2="18" strokeLinecap="round"/></svg>,
  lightning:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  message:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  shield:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  layers:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  check:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>,
  alert:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  book:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  clock:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  refresh:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  chart:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
};

// ─────────────────────────────────────────────────
// Skill config — autumn/orange palette throughout
// ─────────────────────────────────────────────────

const SKILL_CONFIG: Record<string, {
  icon: JSX.Element; label: string; description: string;
  bg: string; border: string; iconBg: string; iconColor: string;
}> = {
  decision_making:             { icon: Ico.target,   label: 'Decision Making',            description: 'Sound decisions under constraints and ambiguity', bg: 'bg-orange-50',  border: 'border-orange-200', iconBg: 'bg-orange-100',  iconColor: 'text-orange-700' },
  debugging_ability:           { icon: Ico.bug,      label: 'Debugging Ability',          description: 'Identifying bugs and reasoning about code correctness', bg: 'bg-amber-50',   border: 'border-amber-200',  iconBg: 'bg-amber-100',   iconColor: 'text-amber-700'  },
  code_correctness:            { icon: Ico.code,     label: 'Code Correctness',           description: 'Writing and fixing code that handles all cases', bg: 'bg-yellow-50',  border: 'border-yellow-200', iconBg: 'bg-yellow-100',  iconColor: 'text-yellow-700' },
  code_quality:                { icon: Ico.eye,      label: 'Code Quality',               description: 'Security, best practices, and maintainability awareness', bg: 'bg-orange-50',  border: 'border-orange-200', iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
  incident_diagnosis:          { icon: Ico.terminal, label: 'Incident Diagnosis',         description: 'Tracing root causes from logs and stack traces', bg: 'bg-amber-50',   border: 'border-amber-200',  iconBg: 'bg-amber-100',   iconColor: 'text-amber-800'  },
  algorithmic_thinking:        { icon: Ico.lightning,label: 'Algorithmic Thinking',       description: 'Complexity analysis and optimisation trade-offs', bg: 'bg-yellow-50',  border: 'border-yellow-200', iconBg: 'bg-yellow-100',  iconColor: 'text-yellow-800' },
  communication_clarity:       { icon: Ico.message,  label: 'Communication Clarity',      description: 'Articulating reasoning clearly and concisely', bg: 'bg-orange-50',  border: 'border-orange-200', iconBg: 'bg-orange-100',  iconColor: 'text-orange-700' },
  adaptability_under_pressure: { icon: Ico.shield,   label: 'Adaptability Under Pressure',description: 'Performance when conditions change unexpectedly', bg: 'bg-amber-50',   border: 'border-amber-200',  iconBg: 'bg-amber-100',   iconColor: 'text-amber-700'  },
  technical_depth:             { icon: Ico.layers,   label: 'Technical Depth',            description: 'Breadth and depth of domain-specific knowledge', bg: 'bg-yellow-50',  border: 'border-yellow-200', iconBg: 'bg-yellow-100',  iconColor: 'text-yellow-700' },
};

const SKILL_ORDER = [
  'decision_making','debugging_ability','code_correctness','code_quality',
  'incident_diagnosis','algorithmic_thinking','communication_clarity',
  'adaptability_under_pressure','technical_depth',
];

// ─────────────────────────────────────────────────
// Performance label helpers
// ─────────────────────────────────────────────────

function perfLabel(pct: number): { label: string; color: string } {
  if (pct >= 88) return { label: 'Expert',      color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
  if (pct >= 75) return { label: 'Proficient',  color: 'text-green-700   bg-green-50   border-green-300'   };
  if (pct >= 60) return { label: 'Competent',   color: 'text-amber-700   bg-amber-50   border-amber-300'   };
  if (pct >= 40) return { label: 'Developing',  color: 'text-orange-700  bg-orange-50  border-orange-300'  };
  return               { label: 'Needs Work',   color: 'text-red-700     bg-red-50     border-red-300'     };
}

// ─────────────────────────────────────────────────
// Radial gauge
// ─────────────────────────────────────────────────

function RadialGauge({ pct }: { pct: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct,100) / 100) * circ;
  const color = pct >= 75 ? '#16a34a' : pct >= 55 ? '#d97706' : '#dc2626';
  return (
    <div className="relative flex items-center justify-center" style={{ width:140, height:140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#fed7aa" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-slate-900">{pct}</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Skill row
// ─────────────────────────────────────────────────

function SkillRow({ skillKey, score, animate }: { skillKey: string; score: number; animate: boolean }) {
  const cfg = SKILL_CONFIG[skillKey];
  if (!cfg) return null;
  const pct  = Math.round(score * 100);
  const perf = perfLabel(pct);
  const isWeak   = pct < 65;
  const isStrong = pct >= 75;
  const barColor = isStrong ? 'bg-emerald-500' : isWeak ? 'bg-red-400' : 'bg-amber-500';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${cfg.border} ${cfg.bg} transition-all hover:shadow-sm`}>
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${cfg.iconBg} border ${cfg.border} flex items-center justify-center ${cfg.iconColor}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-slate-800">{cfg.label}</p>
            {isWeak   && <span className="text-red-500">{Ico.alert}</span>}
            {isStrong && <span className="text-emerald-500">{Ico.check}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${perf.color}`}>{perf.label}</span>
            <span className="text-[13px] font-bold text-slate-700 w-8 text-right tabular-nums">{pct}%</span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/80 overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
            style={{ width: animate ? `${pct}%` : '0%' }} />
        </div>
        <p className="text-[10px] text-slate-500 mt-1">{cfg.description}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Radar chart (SVG, 9 axes) — autumn palette
// ─────────────────────────────────────────────────

function RadarChart({ skillScores }: { skillScores: Record<string, number> }) {
  const cx = 180, cy = 180, r = 130, n = SKILL_ORDER.length;
  const polar = (angle: number, radius: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const axes = SKILL_ORDER.map((key, i) => ({
    key, angle: (360/n)*i,
    score: Math.round((skillScores[key] ?? 0.5) * 100),
    short: SKILL_CONFIG[key]?.label.split(' ')[0] ?? key,
  }));
  const pts = axes.map(a => polar(a.angle, (a.score/100)*r));
  const path = pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')+'Z';

  return (
    <svg viewBox="0 0 360 360" className="w-full max-w-xs mx-auto">
      {[0.25,0.5,0.75,1].map(lvl => {
        const gpts = axes.map(a => polar(a.angle, lvl*r));
        const gpath = gpts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')+'Z';
        return <path key={lvl} d={gpath} fill="none" stroke="#fed7aa" strokeWidth="1" />;
      })}
      {axes.map(a => { const end = polar(a.angle,r); return <line key={a.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#fed7aa" strokeWidth="1" />; })}
      <path d={path} fill="rgba(234,88,12,0.15)" stroke="#ea580c" strokeWidth="2" />
      {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ea580c" stroke="white" strokeWidth="1.5" />)}
      {axes.map(a => {
        const pos = polar(a.angle, r+24);
        return <text key={a.key} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill="#78350f" fontFamily="system-ui,sans-serif">{a.short}</text>;
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────
// Readiness badge
// ─────────────────────────────────────────────────

function ReadinessBadge({ pct }: { pct: number }) {
  if (pct >= 80) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold">{Ico.check} Interview Ready</span>;
  if (pct >= 60) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold">{Ico.alert} Nearly Ready</span>;
  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">{Ico.alert} Needs Preparation</span>;
}

// ─────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────

export function ReportPage() {
  const { currentSession, report, setReport } = useAssessment();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!currentSession) { navigate('/'); return; }
    if (!report && currentSession?.sessionId) {
      setLoading(true);
      fetchReport(currentSession.sessionId).then(setReport).catch(console.error).finally(() => setLoading(false));
    }
  }, [currentSession, report]);

  useEffect(() => { if (report) setTimeout(() => setAnimate(true), 200); }, [report]);

  if (loading || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-600">Generating your capability report…</p>
      </div>
    );
  }

  const pct = report.overallReadiness ?? 0;

  // Build normalised skill scores from whatever the backend returns
  const rawNine: Record<string, number> = {};
  if (report.nineSkillScores && Object.keys(report.nineSkillScores).length > 0) {
    Object.assign(rawNine, report.nineSkillScores);
  } else if (report.nineSkills && Object.keys(report.nineSkills).length > 0) {
    for (const [k, v] of Object.entries(report.nineSkills as Record<string, any>)) {
      rawNine[k] = typeof v === 'object' ? (v.score ?? 0.5) : Number(v);
    }
  } else if (report.competencyScores && Object.keys(report.competencyScores).length > 0) {
    // Legacy fallback: map competency names to skill keys
    const mapping: Record<string, string> = {
      decision_making:'decision_making', problem_solving:'decision_making',
      debugging:'debugging_ability', code_correctness:'code_correctness',
      code_quality:'code_quality', incident_diagnosis:'incident_diagnosis',
      algorithmic_thinking:'algorithmic_thinking', tradeoff_reasoning:'algorithmic_thinking',
      communication:'communication_clarity', stakeholder_thinking:'communication_clarity',
      adaptability:'adaptability_under_pressure',
      technical_analysis:'technical_depth', system_design:'technical_depth',
      ownership:'technical_depth', technical_expertise:'technical_depth',
    };
    for (const [comp, score] of Object.entries(report.competencyScores as Record<string, number>)) {
      const sk = mapping[comp] ?? 'technical_depth';
      if (!rawNine[sk]) rawNine[sk] = Number(score);
    }
  }
  // Fill any missing skills with 0.5
  for (const k of SKILL_ORDER) { if (rawNine[k] == null) rawNine[k] = 0.5; }

  // Compute strong/weak from the actual scores
  const weakSkills   = SKILL_ORDER.filter(k => (rawNine[k] ?? 0.5) < 0.65);
  const strongSkills = SKILL_ORDER.filter(k => (rawNine[k] ?? 0.5) >= 0.75);

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600">Capability Report</p>
          <h1 className="text-2xl font-bold text-slate-900">{formatRole(report.role)} · {formatLevel(report.level)}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <ReadinessBadge pct={pct} />
            <span className="text-xs text-slate-500 flex items-center gap-1">
              {Ico.clock} {report.timeAnalysis?.averageResponseTimeMinutes ?? '—'} min avg response
            </span>
          </div>
          {report.narrativeSummary && (
            <p className="text-sm text-slate-600 max-w-xl leading-relaxed border-l-2 border-orange-300 pl-3">
              {report.narrativeSummary}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <RadialGauge pct={pct} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overall Readiness</p>
        </div>
      </div>

      {/* Skills + radar */}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            {Ico.chart}
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">9 Skill Dimensions</p>
          </div>
          {SKILL_ORDER.map(key => (
            <SkillRow key={key} skillKey={key} score={rawNine[key] ?? 0.5} animate={animate} />
          ))}
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">Skill Radar</p>
            <RadarChart skillScores={rawNine} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4 text-center border-orange-200 bg-orange-50">
              <p className="text-2xl font-bold text-emerald-600">{strongSkills.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Strong Skills</p>
            </div>
            <div className="glass-panel p-4 text-center border-orange-200 bg-orange-50">
              <p className="text-2xl font-bold text-red-500">{weakSkills.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Weak Areas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weak areas callout */}
      {weakSkills.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            {Ico.alert}
            <p className="text-sm font-bold text-red-800">Priority Improvement Areas</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {weakSkills.map(key => {
              const cfg = SKILL_CONFIG[key];
              const pctVal = Math.round((rawNine[key] ?? 0.5) * 100);
              return (
                <div key={key} className="flex items-start gap-3 bg-white rounded-lg border border-red-200 p-3">
                  <div className={`flex-shrink-0 mt-0.5 ${cfg?.iconColor ?? 'text-slate-600'}`}>{cfg?.icon}</div>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-800">{cfg?.label ?? key}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{cfg?.description ?? ''}</p>
                    <p className="text-[11px] text-red-600 font-semibold mt-1">Score: {pctVal}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths / Weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel p-5 space-y-3 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 text-emerald-700">{Ico.check}<p className="text-[11px] font-bold uppercase tracking-wider">Strengths</p></div>
          <ul className="space-y-2">
            {(report.strengths ?? []).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-emerald-500 flex-shrink-0">{Ico.check}</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-panel p-5 space-y-3 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700">{Ico.alert}<p className="text-[11px] font-bold uppercase tracking-wider">Areas to Develop</p></div>
          <ul className="space-y-2">
            {(report.weaknesses ?? []).map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-amber-500 flex-shrink-0">{Ico.alert}</span>{w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Learning path */}
      {(report.learningRecommendations?.length > 0) && (
        <div className="glass-panel p-5 space-y-4 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 text-orange-700">{Ico.book}<p className="text-[11px] font-bold uppercase tracking-wider">Recommended Learning Path</p></div>
          <div className="grid gap-2 md:grid-cols-2">
            {(report.learningRecommendations ?? []).map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-orange-200 bg-white p-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-[10px] font-bold text-orange-700">{i+1}</span>
                <p className="text-xs text-slate-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button type="button" onClick={() => navigate('/roles')} className="primary-btn flex items-center gap-2 justify-center">
          {Ico.refresh} Start New Assessment
        </button>
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-400 transition-colors">
          Back to Home
        </button>
      </div>
    </div>
  );
}
