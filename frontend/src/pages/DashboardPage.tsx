import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { fetchUserAssessments, fetchReport } from '../api';
import { useAssessment, formatLevel, formatRole, formatCompetency } from '../context/AssessmentContext';
import type { AssessmentSession, CapabilityReport } from '../types';

export function DashboardPage() {
  const { setSession } = useAssessment();
  const [assessments, setAssessments] = useState<AssessmentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CapabilityReport | null>(null);

  useEffect(() => {
    const userId = 'demo-user';
    fetchUserAssessments(userId)
      .then(async (list) => {
        setAssessments(list);
        if (list.length > 0) {
          try {
            const report = await fetchReport(list[0].sessionId);
            setSelectedReport(report);
          } catch {
            setSelectedReport(null);
          }
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Your assessments</h2>
          <p className="text-xs text-stone-600">
            Track how your readiness for different roles evolves over time.
          </p>
        </div>
        <Link to="/roles" className="primary-btn">
          New assessment
        </Link>
      </div>
      {selectedReport && selectedReport.competencyScores && (
        <div className="glass-panel p-5 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-700">
            Latest competency radar
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={Object.entries(selectedReport.competencyScores).map(([k, v]) => ({
                  competency: formatCompetency(k),
                  score: (typeof v === 'number' ? v : 0) * 100
                }))}
              >
                <PolarGrid stroke="#e2b57a" />
                <PolarAngleAxis dataKey="competency" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                <Radar
                  name="Readiness"
                  dataKey="score"
                  stroke="#ea580c"
                  fill="#f97316"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="glass-panel p-5 text-xs">
        {loading ? (
          <p className="text-stone-600">Loading assessments…</p>
        ) : assessments.length === 0 ? (
          <p className="text-stone-600">
            No assessments yet. Start with a role-focused simulation to see your first report.
          </p>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => (
              <div
                key={a.sessionId}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatRole(a.role)} · {formatLevel(a.level)}
                  </p>
                  <p className="text-[11px] text-stone-600">
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'} ·{' '}
                    {a.questionCount ?? '—'} questions
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  {a.status === 'in-progress' && a.currentQuestion ? (
                    <Link
                      to="/assessment"
                      className="secondary-btn px-3 py-1 text-[11px]"
                      onClick={() => setSession(a)}
                    >
                      Resume
                    </Link>
                  ) : null}
                  <Link
                    to="/report"
                    className="primary-btn px-3 py-1 text-[11px]"
                    onClick={() => setSession(a)}
                  >
                    View report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

