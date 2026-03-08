import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssessment, formatRole, formatLevel } from '../context/AssessmentContext';
import { fetchReport } from '../api';

// ─────────────────────────────────────────────────
// SVG Icon library — no emojis, all custom paths
// ─────────────────────────────────────────────────

function Icon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    decision: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="4"/>
        <path d="M8.5 5.5L6 3M15.5 5.5L18 3M8.5 18.5L6 21M15.5 18.5L18 21" strokeLinecap="round"/>
      </svg>
    ),
    bug: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M9 9h.01M15 9h.01" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3C9.24 3 7 5.24 7 8v5c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-2.76-2.24-5-5-5z"/>
        <path d="M7 10H3M21 10h-4M7 14H3M21 14h-4M9 20l-2 2M15 20l2 2" strokeLinecap="round"/>
      </svg>
    ),
    code: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    eye: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    terminal: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="8 10 12 14 8 18" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="14" y1="18" x2="20" y2="18" strokeLinecap="round"/>
      </svg>
    ),
    lightning: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    message: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    layers: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    book: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    clock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    refresh: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  };
  return icons[name] ?? <span className={className} />;
}

// ─────────────────────────────────────────────────
// Skill metadata — icon + colour per skill
// ─────────────────────────────────────────────────

const SKILL_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  decision_making:             { icon: 'decision',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  debugging_ability:           { icon: 'bug',       color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  code_correctness:            { icon: 'code',      color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  code_quality:                { icon: 'eye',       color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  incident_diagnosis:          { icon: 'terminal',  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  algorithmic_thinking:        { icon: 'lightning', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  communication_clarity:       { icon: 'message',   color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200' },
  adaptability_under_pressure: { icon: 'shield',    color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  technical_depth:             { icon: 'layers',    color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-200' },
};

const SKILL_ORDER = [
  'decision_making', 'debugging_ability', 'code_correctness',
  'code_quality', 'incident_diagnosis', 'algorithmic_thinking',
  'communication_clarity', 'adaptability_under_pressure', 'technical_depth',
];

// ─────────────────────────────────────────────────
// Radial gauge for overall score
// ─────────────────────────────────────────────────

function RadialGauge({ pct }: { pct: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? '#16a34a' : pct >= 55 ? '#d97706' : '#dc2626';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>{pct}</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Skill row with animated bar
// ─────────────────────────────────────────────────

function SkillRow({ skillKey, data, animate }: { skillKey: string; data: any; animate: boolean }) {
  const cfg = SKILL_CONFIG[skillKey] ?? { icon: 'chart', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  const pct = data?.pct ?? Math.round((data?.score ?? 0.5) * 100);
  const label = data?.label ?? skillKey;
  const perf = data?.performanceLabel ?? '';
  const isWeak = data?.isWeak ?? pct < 65;
  const isStrong = data?.isStrong ?? pct >= 75;

  const barColor = isStrong ? 'bg-emerald-500' : isWeak ? 'bg-red-400' : 'bg-amber-500';
  const perfColor = isStrong ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                   : isWeak  ? 'text-red-700 bg-red-50 border-red-200'
                   : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${cfg.border} ${cfg.bg} transition-all duration-200 hover:shadow-sm`}>
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border ${cfg.border} bg-white`}>
        <span className={cfg.color}>
          <Icon name={cfg.icon} className="w-4 h-4" />
        </span>
      </div>

      {/* Label + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[13px] font-semibold text-slate-800">{label}</p>
          <div className="flex items-center gap-2">
            {isWeak && (
              <span className="flex items-center gap-1 text-red-600">
                <Icon name="alert" className="w-3 h-3" />
              </span>
            )}
            {isStrong && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Icon name="check" className="w-3 h-3" />
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${perfColor}`}>{perf}</span>
            <span className="text-[13px] font-bold text-slate-700 w-8 text-right">{pct}%</span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/70 overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
            style={{ width: animate ? `${pct}%` : '0%' }}
          />
        </div>
        {data?.description && (
          <p className="text-[10px] text-slate-500 mt-1">{data.description}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Radar chart (SVG, 9 axes)
// ─────────────────────────────────────────────────

function RadarChart({ skills }: { skills: Record<string, any> }) {
  const cx = 180, cy = 180, r = 130;
  const n = SKILL_ORDER.length;

  function polarToCart(angle: number, radius: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const axes = SKILL_ORDER.map((key, i) => ({
    key,
    angle: (360 / n) * i,
    score: skills[key]?.pct ?? Math.round((skills[key]?.score ?? 0.5) * 100),
    label: SKILL_CONFIG[key]?.icon ?? 'chart',
    shortLabel: (skills[key]?.label ?? key).split(' ')[0],
  }));

  const dataPoints = axes.map(ax => polarToCart(ax.angle, (ax.score / 100) * r));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  return (
    <svg viewBox="0 0 360 360" className="w-full max-w-xs mx-auto">
      {/* Grid rings */}
      {gridLevels.map(level => {
        const pts = axes.map(ax => polarToCart(ax.angle, level * r));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
        return (
          <path key={level} d={path} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        );
      })}

      {/* Axis lines */}
      {axes.map(ax => {
        const end = polarToCart(ax.angle, r);
        return <line key={ax.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth="1" />;
      })}

      {/* Data polygon */}
      <path d={dataPath} fill="rgba(217,119,6,0.15)" stroke="#d97706" strokeWidth="2" />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#d97706" stroke="white" strokeWidth="1.5" />
      ))}

      {/* Labels */}
      {axes.map(ax => {
        const pos = polarToCart(ax.angle, r + 22);
        const cfg = SKILL_CONFIG[ax.key];
        return (
          <text
            key={ax.key}
            x={pos.x} y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontWeight="600"
            fill="#64748b"
            fontFamily="system-ui, sans-serif"
          >
            {ax.shortLabel}
          </text>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────
// Readiness badge
// ─────────────────────────────────────────────────

function ReadinessBadge({ pct }: { pct: number }) {
  if (pct >= 80) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold">
      <Icon name="check" className="w-3 h-3" /> Interview Ready
    </span>
  );
  if (pct >= 60) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold">
      <Icon name="alert" className="w-3 h-3" /> Nearly Ready
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">
      <Icon name="alert" className="w-3 h-3" /> Needs Preparation
    </span>
  );
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
      fetchReport(currentSession.sessionId)
        .then(setReport)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [currentSession, report]);

  useEffect(() => {
    if (report) setTimeout(() => setAnimate(true), 200);
  }, [report]);

  if (loading || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-600">Generating your capability report…</p>
      </div>
    );
  }

  const nineSkills: Record<string, any> = report.nineSkills ?? {};
  const weakSkills: string[] = report.weakSkills ?? report.weakAreas ?? [];
  const strongSkills: string[] = report.strongSkills ?? [];
  const pct = report.overallReadiness ?? 0;
  const role = formatRole(report.role);
  const level = formatLevel(report.level);

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
            Capability Report
          </p>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
            {role} · {level}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <ReadinessBadge pct={pct} />
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Icon name="clock" className="w-3 h-3" />
              {report.timeAnalysis?.averageResponseTimeMinutes ?? '—'} min avg response
            </span>
          </div>
          {report.narrativeSummary && (
            <p className="text-sm text-slate-600 max-w-xl leading-relaxed mt-2 border-l-2 border-amber-300 pl-3">
              {report.narrativeSummary}
            </p>
          )}
        </div>

        {/* Radial gauge */}
        <div className="flex flex-col items-center gap-2">
          <RadialGauge pct={pct} />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Overall Readiness
          </p>
        </div>
      </div>

      {/* ── Two-column: skills list + radar ─────── */}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">

        {/* Skill rows */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="chart" className="w-4 h-4 text-slate-500" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              9 Skill Dimensions
            </p>
          </div>
          {SKILL_ORDER.map(key => (
            <SkillRow
              key={key}
              skillKey={key}
              data={nineSkills[key]}
              animate={animate}
            />
          ))}
        </div>

        {/* Radar */}
        <div className="space-y-4">
          <div className="glass-panel p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 text-center">
              Skill Radar
            </p>
            <RadarChart skills={nineSkills} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{strongSkills.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Strong Skills</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{weakSkills.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Weak Areas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Weak areas callout ───────────────────── */}
      {weakSkills.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="alert" className="w-4 h-4 text-red-600" />
            <p className="text-sm font-semibold text-red-800">Priority Improvement Areas</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {weakSkills.map(key => {
              const cfg = SKILL_CONFIG[key] ?? {};
              const meta = nineSkills[key];
              return (
                <div key={key} className="flex items-start gap-3 bg-white rounded-lg border border-red-200 p-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon name={cfg.icon ?? 'alert'} className={`w-4 h-4 ${cfg.color ?? 'text-slate-600'}`} />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-800">{meta?.label ?? key}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{meta?.description ?? ''}</p>
                    <p className="text-[11px] text-red-600 font-medium mt-1">Score: {meta?.pct ?? '—'}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Strengths / Weaknesses ───────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="check" className="w-4 h-4 text-emerald-600" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Strengths</p>
          </div>
          <ul className="space-y-2">
            {(report.strengths ?? []).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-emerald-500 flex-shrink-0">
                  <Icon name="check" className="w-3.5 h-3.5" />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="alert" className="w-4 h-4 text-amber-600" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Areas to Develop</p>
          </div>
          <ul className="space-y-2">
            {(report.weaknesses ?? []).map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-amber-500 flex-shrink-0">
                  <Icon name="alert" className="w-3.5 h-3.5" />
                </span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Learning recommendations ─────────────── */}
      {(report.learningRecommendations?.length > 0) && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="book" className="w-4 h-4 text-blue-600" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Recommended Learning Path
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {(report.learningRecommendations ?? []).map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-700">
                  {i + 1}
                </span>
                <p className="text-xs text-slate-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/roles')}
          className="primary-btn flex items-center gap-2 justify-center"
        >
          <Icon name="refresh" className="w-4 h-4" />
          Start New Assessment
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-amber-400 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
