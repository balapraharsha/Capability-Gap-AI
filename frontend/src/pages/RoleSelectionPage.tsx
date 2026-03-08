import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAssessment } from '../api';
import { useAssessment, formatRole, formatLevel } from '../../../../v2_all_changes/frontend/src/context/AssessmentContext';
import type { ExperienceLevel, Role } from '../types';

const ROLE_CATEGORIES = [
  {
    category: 'Data & AI',
    emoji: '🧠',
    roles: [
      { id: 'data-analyst' as Role, label: 'Data Analyst', description: 'SQL, dashboards, business metrics, and exploratory analysis.' },
      { id: 'data-scientist' as Role, label: 'Data Scientist', description: 'Modeling, experimentation, and product analytics.' },
      { id: 'ml-engineer' as Role, label: 'ML Engineer', description: 'Serving models in production, monitoring, and scalability.' },
      { id: 'ai-ml-architect' as Role, label: 'AI/ML Architect', description: 'Builds AI solutions, neural networks, and automates business operations.' },
      { id: 'big-data-engineer' as Role, label: 'Big Data Engineer', description: 'Data pipelines and large-scale processing with Spark and Kafka.' },
    ]
  },
  {
    category: 'Engineering',
    emoji: '⚙️',
    roles: [
      { id: 'backend-engineer' as Role, label: 'Backend Engineer', description: 'APIs, distributed systems, databases, and reliability trade-offs.' },
      { id: 'fullstack-developer' as Role, label: 'Full Stack Developer', description: 'Front-end and back-end components, React, Node, and databases.' },
      { id: 'devops-engineer' as Role, label: 'DevOps Engineer', description: 'CI/CD pipelines, Docker, Kubernetes, and infrastructure automation.' },
      { id: 'blockchain-developer' as Role, label: 'Blockchain Developer', description: 'Decentralized apps, smart contracts, and Web3 protocols.' },
    ]
  },
  {
    category: 'Infrastructure & Security',
    emoji: '🔐',
    roles: [
      { id: 'cloud-engineer' as Role, label: 'Cloud Engineer', description: 'Cloud architecture, cost, reliability, and infrastructure-as-code.' },
      { id: 'cloud-architect' as Role, label: 'Cloud Architect', description: 'Scalable, secure multi-cloud infrastructure on AWS and Azure.' },
      { id: 'cybersecurity-specialist' as Role, label: 'Cybersecurity Specialist', description: 'Network security, threat detection, and incident response.' },
      { id: 'iot-architect' as Role, label: 'IoT Solutions Architect', description: 'Integrates physical devices with digital networked intelligence.' },
    ]
  },
  {
    category: 'Product',
    emoji: '📱',
    roles: [
      { id: 'product-manager' as Role, label: 'Product Manager', description: 'Product thinking, metrics, roadmaps, and stakeholder communication.' },
    ]
  }
];

const ALL_ROLES = ROLE_CATEGORIES.flatMap(c => c.roles);

const LEVELS: { id: ExperienceLevel; label: string; description: string; badge: string }[] = [
  { id: 'beginner', label: 'Beginner', description: 'Starting out and want to understand expectations.', badge: '🌱' },
  { id: 'intermediate', label: 'Intermediate', description: 'Have experience or internships and want to level up.', badge: '⚡' },
  { id: 'senior', label: 'Senior', description: 'Lead projects and want to stress-test system thinking.', badge: '🚀' },
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setSession } = useAssessment();
  const [selectedRole, setSelectedRole] = useState<Role>('backend-engineer');
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('intermediate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredCategories = search.trim()
    ? [{
        category: 'Search Results',
        emoji: '🔍',
        roles: ALL_ROLES.filter(r =>
          r.label.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase())
        )
      }]
    : ROLE_CATEGORIES;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userId = 'demo-user';
      const session = await startAssessment({ userId, role: selectedRole, level: selectedLevel });
      setSession(session);
      navigate('/assessment');
    } catch (err) {
      console.error(err);
      setError('Unable to start assessment. Please check the API and try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedRoleObj = ALL_ROLES.find(r => r.id === selectedRole);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Role Selection */}
      <div className="glass-panel p-6">
        <h2 className="mb-1 text-xl font-semibold text-black">Select your target role</h2>
        <p className="mb-4 text-xs text-slate-600">
          15 roles across Data, Engineering, Infrastructure & Product. Each generates a
          multi-round adaptive assessment tailored to industry expectations.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search roles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />

        {/* Categorised grid */}
        <div className="space-y-5">
          {filteredCategories.map(cat => (
            <div key={cat.category}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                {cat.emoji} {cat.category}
              </p>
              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                {cat.roles.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-xs transition-all duration-150 hover:-translate-y-0.5 ${
                      selectedRole === role.id
                        ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-100'
                        : 'border-amber-200 bg-white text-slate-900 hover:border-orange-300 hover:shadow-sm'
                    }`}
                  >
                    <span className={`mb-0.5 text-[13px] font-semibold ${selectedRole === role.id ? 'text-orange-600' : 'text-slate-800'}`}>
                      {role.label}
                    </span>
                    <span className="text-[10px] leading-snug text-slate-500">{role.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories[0]?.roles.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-4">No roles match "{search}"</p>
          )}
        </div>
      </div>

      {/* Level Selection */}
      <div className="glass-panel p-6">
        <h2 className="mb-3 text-xl font-semibold text-black">Select your experience level</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {LEVELS.map(lvl => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setSelectedLevel(lvl.id)}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left text-xs transition-all duration-150 hover:-translate-y-0.5 ${
                selectedLevel === lvl.id
                  ? 'border-orange-500 bg-orange-500/10 text-orange-600 shadow-md shadow-orange-100'
                  : 'border-amber-200 bg-white text-slate-900 hover:border-orange-300'
              }`}
            >
              <span className="mb-1 text-sm font-semibold">{lvl.badge} {lvl.label}</span>
              <span className="text-[11px] text-slate-500">{lvl.description}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/60 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Footer bar */}
      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-5 py-3">
        <div className="text-xs text-slate-600 space-y-0.5">
          <p>
            Role: <span className="font-semibold text-orange-600">{formatRole(selectedRole)}</span>
          </p>
          <p className="text-[10px] text-slate-400">{selectedRoleObj?.description}</p>
          <p>
            Level: <span className="font-semibold text-orange-600">{formatLevel(selectedLevel)}</span>
          </p>
        </div>
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Starting assessment…' : 'Start assessment →'}
        </button>
      </div>
    </form>
  );
}
