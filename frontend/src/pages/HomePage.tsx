import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="grid gap-10 md:grid-cols-[5fr,2fr]">
      <section className="space-y-6">
        <div className="glass-panel p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B3543A]">
            Dynamic Career Role Readiness
          </p>

          <h1 className="mb-4 text-3xl font-semibold tracking-tight text-black md:text-4xl">
            Bridge the gap between tutorials and real-world engineering work.
          </h1>

          <p className="max-w-xl text-sm text-[#186F65]">
            Capability Gap AI simulates realistic role-based assessments for technical careers. It
            dynamically generates scenarios, analyzes your reasoning with AI agents, and produces a
            detailed readiness report with targeted learning recommendations.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/roles" className="primary-btn">
              Start a role simulation
            </Link>

            <Link to="/dashboard" className="secondary-btn">
              View past assessments
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">

          <div className="glass-panel p-4 text-xs">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
              Multi-Agent Evaluation
            </p>

            <p className="text-black">
              Observer, Critic, and Guide agents work together to understand your reasoning, spot
              gaps, and prompt deeper thinking.
            </p>
          </div>

          <div className="glass-panel p-4 text-xs">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
              Dynamic Scenario Generation
            </p>

            <p className="text-black">
              Questions are generated on the fly from role-specific topics and interview patterns,
              not static question banks.
            </p>
          </div>

          <div className="glass-panel p-4 text-xs">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
              Capability Gap Reports
            </p>

            <p className="text-black">
              Receive a structured report with readiness scores, strengths, weaknesses, and concrete
              practice topics.
            </p>
          </div>

        </div>
      </section>

      <aside className="space-y-4">

        <div className="glass-panel p-5 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
            Supported Roles
          </p>

          <ul className="space-y-1.5 text-black">
            <li>• Data Analyst</li>
            <li>• Data Scientist</li>
            <li>• Backend Engineer</li>
            <li>• ML Engineer</li>
            <li>• Product Manager</li>
            <li>• Cloud Engineer</li>
          </ul>
        </div>

        <div className="glass-panel p-5 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
            What gets measured
          </p>

          <ul className="space-y-1.5 text-black">
            <li>• Technical reasoning depth</li>
            <li>• System thinking and scalability</li>
            <li>• Communication clarity</li>
            <li>• Decision trade-offs</li>
            <li>• Response time and iteration behavior</li>
          </ul>
        </div>

      </aside>
    </div>
  );
}