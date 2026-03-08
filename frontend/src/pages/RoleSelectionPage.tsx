import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAssessment } from '../api';
import { useAssessment, formatRole, formatLevel } from '../context/AssessmentContext';
import type { ExperienceLevel, Role } from '../types';

const ROLES: { id: Role; label: string; description: string }[] = [
  {
    id: 'data-analyst',
    label: 'Data Analyst',
    description: 'SQL, dashboards, business metrics, and exploratory analysis.'
  },
  {
    id: 'data-scientist',
    label: 'Data Scientist',
    description: 'Modeling, experimentation, and product analytics questions.'
  },
  {
    id: 'backend-engineer',
    label: 'Backend Engineer',
    description: 'APIs, distributed systems, databases, and reliability trade-offs.'
  },
  {
    id: 'ml-engineer',
    label: 'ML Engineer',
    description: 'Serving models in production, monitoring, and scalability.'
  },
  {
    id: 'product-manager',
    label: 'Product Manager',
    description: 'Product thinking, metrics, and stakeholder communication.'
  },
  {
    id: 'cloud-engineer',
    label: 'Cloud Engineer',
    description: 'Cloud architecture, cost, reliability, and infrastructure-as-code.'
  }
];

const LEVELS: { id: ExperienceLevel; label: string; description: string }[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'You are just starting and want to understand expectations.'
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'You have some experience or internships and want to level up.'
  },
  {
    id: 'senior',
    label: 'Senior',
    description: 'You lead projects and want to stress-test system thinking.'
  }
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setSession } = useAssessment();
  const [selectedRole, setSelectedRole] = useState<Role>('backend-engineer');
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('intermediate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // In a real app, userId would come from auth; for now generate a stable placeholder.
      const userId = 'demo-user';
      const session = await startAssessment({
        userId,
        role: selectedRole,
        level: selectedLevel
      });
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="mb-2 text-xl font-semibold text-black">Select your target role</h2>
        <p className="mb-4 text-xs text-black">
          Capability Gap AI will generate a multi-round assessment tailored to your chosen role and
          experience level.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role.id)}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left text-xs transition ${
                selectedRole === role.id
                  ? 'border-orange-500 bg-orange-500/10 text-orange-600'
                  : 'border-amber-200 bg-white text-slate-900 hover:border-orange-400'
              }`}
            >
              <span className="mb-1 text-sm font-semibold">{role.label}</span>
              <span className="text-[11px] text-black">{role.description}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="glass-panel p-6">
        <h2 className="mb-2 text-xl font-semibold text-black">Select your experience level</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setSelectedLevel(lvl.id)}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left text-xs transition ${
                selectedLevel === lvl.id
  ? 'border-orange-500 bg-orange-500/10 text-orange-600'
  : 'border-amber-200 bg-white text-slate-900 hover:border-orange-400'
              }`}
            >
              <span className="mb-1 text-sm font-semibold">{lvl.label}</span>
              <span className="text-[11px] text-slate-600">{lvl.description}</span>
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-xs text-black">
          Role: <span className="font-semibold text-orange-600">{formatRole(selectedRole)}</span> ·
          Level: <span className="font-semibold text-orange-600">{formatLevel(selectedLevel)}</span>
        </div>
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Starting assessment…' : 'Start assessment'}
        </button>
      </div>
    </form>
  );
}

