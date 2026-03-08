import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAssessment } from '../api';
import { useAssessment, formatRole, formatLevel } from '../context/AssessmentContext';
import type { ExperienceLevel, Role } from '../types';

// SVG category icons — no emojis
function IconData({ className = "w-4 h-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>;
}
function IconCode({ className = "w-4 h-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
}
function IconCloud({ className = "w-4 h-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
}
function IconBox({ className = "w-4 h-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
}
function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}><polyline points="20 6 9 17 4 12"/></svg>;
}

type RoleEntry = { id: Role; label: string; description: string };
type Category = { label: string; icon: JSX.Element; roles: RoleEntry[] };

const CATEGORIES: Category[] = [
  {
    label: 'Data & AI',
    icon: <IconData className="w-3.5 h-3.5" />,
    roles: [
      { id: 'data-analyst',   label: 'Data Analyst',   description: 'SQL, dashboards, business metrics, and exploratory analysis.' },
      { id: 'data-scientist', label: 'Data Scientist',  description: 'Modeling, experimentation, and product analytics.' },
      { id: 'ml-engineer',    label: 'ML Engineer',     description: 'Serving models in production, monitoring, and scalability.' },
      { id: 'ai-ml-architect',label: 'AI/ML Architect', description: 'Deep learning systems, model architecture, and AI infrastructure.' },
      { id: 'big-data-engineer', label: 'Big Data Engineer', description: 'Data pipelines and large-scale processing with Spark and Kafka.' },
    ],
  },
  {
    label: 'Engineering',
    icon: <IconCode className="w-3.5 h-3.5" />,
    roles: [
      { id: 'backend-engineer',    label: 'Backend Engineer',    description: 'APIs, distributed systems, databases, and reliability trade-offs.' },
      { id: 'fullstack-developer', label: 'Fullstack Developer', description: 'React, Node.js, REST APIs, and frontend-backend integration.' },
      { id: 'blockchain-developer',label: 'Blockchain Developer',description: 'Smart contracts, Web3, and decentralised application design.' },
    ],
  },
  {
    label: 'Infrastructure & Security',
    icon: <IconCloud className="w-3.5 h-3.5" />,
    roles: [
      { id: 'cloud-engineer',           label: 'Cloud Engineer',            description: 'Cloud architecture, cost, reliability, and infrastructure-as-code.' },
      { id: 'cloud-architect',          label: 'Cloud Architect',           description: 'Multi-cloud design, cost optimisation, and governance.' },
      { id: 'devops-engineer',          label: 'DevOps Engineer',           description: 'CI/CD pipelines, Docker, Kubernetes, and observability.' },
      { id: 'cybersecurity-specialist', label: 'Cybersecurity Specialist',  description: 'Threat modelling, incident response, and security architecture.' },
      { id: 'iot-architect',            label: 'IoT Architect',             description: 'Edge computing, MQTT, sensor networks, and firmware design.' },
    ],
  },
  {
    label: 'Product',
    icon: <IconBox className="w-3.5 h-3.5" />,
    roles: [
      { id: 'product-manager', label: 'Product Manager', description: 'Product thinking, metrics, roadmaps, and stakeholder communication.' },
    ],
  },
];

const LEVELS: { id: ExperienceLevel; label: string; description: string; badge: string }[] = [
  { id: 'beginner',     label: 'Beginner',     description: 'Starting out — understand what is expected.',    badge: 'Entry level' },
  { id: 'intermediate', label: 'Intermediate', description: 'Some experience or internships, levelling up.',   badge: 'Mid level' },
  { id: 'senior',       label: 'Senior',       description: 'Lead projects, stress-test system thinking.',     badge: 'Senior level' },
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setSession } = useAssessment();
  const [selectedRole, setSelectedRole] = useState<Role>('backend-engineer');
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('intermediate');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = search.toLowerCase();
  const filteredCats = CATEGORIES.map(cat => ({
    ...cat,
    roles: cat.roles.filter(r => !query || r.label.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)),
  })).filter(cat => cat.roles.length > 0);

  const selectedRoleObj = CATEGORIES.flatMap(c => c.roles).find(r => r.id === selectedRole);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await startAssessment({ userId: 'demo-user', role: selectedRole, level: selectedLevel });
      setSession(session);
      navigate('/assessment');
    } catch (err) {
      console.error(err);
      setError('Unable to start assessment. Please check the API and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Select your target role</h2>
        <p className="text-xs text-slate-500 mt-1">14 roles across Data, Engineering, Infrastructure & Product. Each assessment runs 6 tailored questions.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
          <IconSearch className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Search roles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
      </div>

      {/* Role grid by category */}
      <div className="space-y-5">
        {filteredCats.map(cat => (
          <div key={cat.label}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-slate-400">{cat.icon}</span>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{cat.label}</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {cat.roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`relative flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                    selectedRole === role.id
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-orange-300 hover:shadow-sm'
                  }`}
                >
                  {selectedRole === role.id && (
                    <span className="absolute top-3 right-3 text-orange-500">
                      <IconCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className={`text-sm font-semibold mb-0.5 ${selectedRole === role.id ? 'text-orange-600' : 'text-slate-800'}`}>
                    {role.label}
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed pr-4">{role.description}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Level */}
      <div className="glass-panel p-5 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Experience Level</p>
        <div className="grid gap-3 md:grid-cols-3">
          {LEVELS.map(lvl => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setSelectedLevel(lvl.id)}
              className={`relative flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                selectedLevel === lvl.id
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-orange-300'
              }`}
            >
              {selectedLevel === lvl.id && (
                <span className="absolute top-3 right-3 text-orange-500">
                  <IconCheck className="w-3.5 h-3.5" />
                </span>
              )}
              <span className={`text-sm font-semibold mb-0.5 ${selectedLevel === lvl.id ? 'text-orange-600' : 'text-slate-800'}`}>
                {lvl.label}
              </span>
              <span className="text-[10px] font-medium text-orange-400 mb-1">{lvl.badge}</span>
              <span className="text-[11px] text-slate-500">{lvl.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Assessment format info */}
      <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Assessment Format — 6 Questions</p>
        <div className="flex flex-wrap gap-2">
          {[
            ['Q1', 'Scenario Chain'],
            ['Q2', 'Debug Code'],
            ['Q3', 'Fix Code'],
            ['Q4', 'Code Review'],
            ['Q5', 'Log Detective'],
            ['Q6', 'Complexity'],
          ].map(([num, label]) => (
            <span key={num} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
              <span className="font-bold">{num}</span> {label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Footer action */}
      <div className="flex items-center justify-between border-t border-stone-200 pt-4">
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-orange-600">{selectedRoleObj?.label}</span>
          <span className="mx-1.5 text-stone-300">·</span>
          <span className="font-semibold text-orange-600">{formatLevel(selectedLevel)}</span>
        </div>
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Starting…' : 'Start Assessment'}
        </button>
      </div>
    </form>
  );
}
