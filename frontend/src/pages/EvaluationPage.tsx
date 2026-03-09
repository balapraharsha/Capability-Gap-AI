/*
EvaluationPage

This page displays AI-generated evaluation feedback for the user's latest
answer in the assessment.

The evaluation is produced by three AI roles:
1. Observer – summarizes the candidate's reasoning and approach.
2. Critic – highlights weaknesses, gaps, or risks in the answer.
3. Guide – suggests improvements and follow-up learning directions.

Main responsibilities:
- Show the latest evaluation feedback from the AI system
- Allow the user to navigate to the full capability report
- Allow the user to continue the assessment
*/

import { Link, useNavigate } from 'react-router-dom';
import { useAssessment } from '../context/AssessmentContext';

export function EvaluationPage() {

  // Access global assessment state from context
  const { currentSession, lastEvaluation } = useAssessment();

  const navigate = useNavigate();

  /*
  If no active session exists, redirect the user back
  to the role selection page to start a new assessment.
  */
  if (!currentSession) {
    navigate('/roles');
    return null;
  }

  return (

    <div className="space-y-6">

      {/* Header section */}
      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold text-slate-50">
            AI Evaluation
          </h2>

          <p className="text-xs text-slate-400">
            Observer, Critic, and Guide agents analyze each answer to surface strengths and
            capability gaps.
          </p>
        </div>

        {/* Navigate to the full capability report */}
        <Link to="/report" className="primary-btn">
          View capability report
        </Link>

      </div>


      {/* Evaluation results */}
      {lastEvaluation ? (

        <div className="glass-panel space-y-3 p-5">

          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Latest evaluation
          </p>

          {/* Three-agent feedback grid */}
          <div className="grid gap-3 text-xs md:grid-cols-3">

            {/* Observer feedback */}
            <div>
              <p className="mb-1 text-slate-400">
                Observer
              </p>
              <p className="text-slate-200">
                {lastEvaluation.observerSummary}
              </p>
            </div>

            {/* Critic feedback */}
            <div>
              <p className="mb-1 text-slate-400">
                Critic
              </p>
              <p className="text-slate-200">
                {lastEvaluation.criticFeedback}
              </p>
            </div>

            {/* Guide feedback and follow-up questions */}
            <div>
              <p className="mb-1 text-slate-400">
                Guide
              </p>

              <p className="text-slate-200">
                {lastEvaluation.guidePrompt}
              </p>

              {/* Optional list of guide questions */}
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

        /*
        If no evaluation exists yet, show an informational message
        explaining when feedback will appear.
        */
        <p className="text-xs text-slate-400">
          Complete your assessment to see AI evaluation feedback. After each answer, feedback is
          shown on the assessment page.
        </p>

      )}


      {/* Button to return to the assessment and continue answering questions */}
      <Link to="/assessment" className="secondary-btn">
        Continue assessment
      </Link>

    </div>

  );
}