import { Link, useNavigate } from 'react-router-dom';
import { useAssessment } from '../context/AssessmentContext';

export function EvaluationPage() {
  const { currentSession, lastEvaluation } = useAssessment();
  const navigate = useNavigate();

  if (!currentSession) {
    navigate('/roles');
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">AI Evaluation</h2>
          <p className="text-xs text-slate-400">
            Observer, Critic, and Guide agents analyze each answer to surface strengths and
            capability gaps.
          </p>
        </div>
        <Link to="/report" className="primary-btn">
          View capability report
        </Link>
      </div>
      {lastEvaluation ? (
        <div className="glass-panel space-y-3 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Latest evaluation
          </p>
          <div className="grid gap-3 text-xs md:grid-cols-3">
            <div>
              <p className="mb-1 text-slate-400">Observer</p>
              <p className="text-slate-200">{lastEvaluation.observerSummary}</p>
            </div>
            <div>
              <p className="mb-1 text-slate-400">Critic</p>
              <p className="text-slate-200">{lastEvaluation.criticFeedback}</p>
            </div>
            <div>
              <p className="mb-1 text-slate-400">Guide</p>
              <p className="text-slate-200">{lastEvaluation.guidePrompt}</p>
              {lastEvaluation.guideQuestions?.length ? (
                <ul className="mt-2 space-y-1 text-slate-300">
                  {lastEvaluation.guideQuestions.map((gq) => (
                    <li key={gq}>• {gq}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Complete your assessment to see AI evaluation feedback. After each answer, feedback is
          shown on the assessment page.
        </p>
      )}
      <Link to="/assessment" className="secondary-btn">
        Continue assessment
      </Link>
    </div>
  );
}
