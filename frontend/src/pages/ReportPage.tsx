import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchReport } from '../api';
import { useAssessment, formatLevel, formatRole, formatCompetency } from '../context/AssessmentContext';

export function ReportPage() {
  const { currentSession, report, setReport } = useAssessment();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSession) {
      navigate('/roles');
    }
  }, [currentSession, navigate]);

  useEffect(() => {
    if (currentSession && !report) {
      setLoading(true);
      setFetchError(null);
      fetchReport(currentSession.sessionId)
        .then(setReport)
        .catch(() => setFetchError('Could not load report. The assessment may still be processing.'))
        .finally(() => setLoading(false));
    }
  }, [currentSession, report, setReport]);

  const displayReport = report || (currentSession as { report?: typeof report })?.report;

  if (!currentSession) return null;

  if (loading) {
    return (
      <div className="glass-panel p-8 text-center text-sm text-[#186F65]">
        Generating your capability report…
      </div>
    );
  }

  if (fetchError || !displayReport) {
    return (
      <div className="glass-panel p-8 text-center space-y-3">
        <p className="text-sm text-[#186F65]">{fetchError || 'Report not available yet.'}</p>
        <button className="primary-btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const r = displayReport!;

  return (
    <div className="space-y-6">

      {/* Report Header */}
      <div className="glass-panel p-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
          Capability Gap Report
        </p>

        <h2 className="mb-2 text-xl font-semibold text-[#186F65]">
          {formatRole(r.role)} · {formatLevel(r.level)}
        </h2>

        <p className="text-xs text-[#186F65]">
          Overall Readiness Score:{' '}
          <span className="font-semibold text-[#B3543A]">
            {typeof r.overallReadiness === 'number'
              ? Math.round(r.overallReadiness)
              : r.overallReadiness}%
          </span>
        </p>

        {/* Competency Scores */}
        {(r.competencyScores && Object.keys(r.competencyScores).length > 0) && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
              Competency Scores
            </p>

            <div className="grid gap-2 text-xs md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(r.competencyScores).map(([comp, score]) => (
                <div
                  key={comp}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                >
                  <span className="text-[#186F65] font-medium">
                    {formatCompetency(comp)}
                  </span>

                  <span className="font-semibold text-[#B3543A]">
                    {Math.round((typeof score === 'number' ? score : 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response Time */}
        {r.timeAnalysis?.averageResponseTimeMinutes != null && (
          <p className="mt-4 text-xs text-[#186F65]">
            Average response time per question:{' '}
            <span className="font-semibold text-[#B3543A]">
              {r.timeAnalysis.averageResponseTimeMinutes.toFixed(1)} minutes
            </span>
          </p>
        )}
      </div>

      {/* Strength / Weak Areas / Learning */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Strengths */}
        <div className="glass-panel p-5 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#186F65]">
            Strengths
          </p>
          <ul className="space-y-1.5 text-black">
            {(r.strengths ?? []).map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>

        {/* Weak Areas */}
        <div className="glass-panel p-5 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
            Weak Areas
          </p>
          <ul className="space-y-1.5 text-black">
            {(r.weakAreas ?? r.weaknesses ?? []).map((w) => (
              <li key={w}>• {formatCompetency(w)}</li>
            ))}
          </ul>
        </div>

        {/* Recommended Learning */}
        <div className="glass-panel p-5 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">
            Recommended Learning
          </p>
          <ul className="space-y-1.5 text-black">
            {(r.recommendedLearning ?? r.learningRecommendations ?? []).map((l) => (
              <li key={l}>• {l}</li>
            ))}
          </ul>
        </div>

      </div>

      {/* Suggested Practice Topics */}
      {(r.suggestedPracticeTopics?.length ?? 0) > 0 && (
        <div className="glass-panel p-5 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B3543A]">
            Suggested Practice Topics
          </p>
          <ul className="space-y-1.5 text-[#186F65]">
            {(r.suggestedPracticeTopics ?? []).map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}