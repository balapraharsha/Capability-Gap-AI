/*
App.tsx

This is the root component of the frontend application.

Responsibilities:
1. Provide global assessment state using AssessmentProvider.
2. Define the main application layout.
3. Configure client-side routing for all pages.

Routing structure:
- "/"            → HomePage (landing page)
- "/roles"       → RoleSelectionPage (choose role and experience level)
- "/assessment"  → AssessmentPage (main adaptive interview simulation)
- "/evaluation"  → EvaluationPage (AI feedback after answers)
- "/dashboard"   → DashboardPage (history of past assessments)
- "/report"      → ReportPage (final capability report and skill analysis)
*/

import { Route, Routes } from 'react-router-dom';
import { AssessmentProvider } from './context/AssessmentContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportPage } from './pages/ReportPage';

/*
Main application component.

The AssessmentProvider wraps the entire app so that all pages
can access shared assessment state such as:
- current session
- current question
- evaluation feedback
- capability report
*/
function App() {
  return (
    <AssessmentProvider>

      {/* Layout component provides shared UI elements like header and page container */}
      <Layout>

        {/* React Router configuration for all application pages */}
        <Routes>

          {/* Landing page */}
          <Route path="/" element={<HomePage />} />

          {/* Role and experience selection before starting an assessment */}
          <Route path="/roles" element={<RoleSelectionPage />} />

          {/* Main assessment simulation with questions and evaluation */}
          <Route path="/assessment" element={<AssessmentPage />} />

          {/* Dedicated evaluation page showing AI feedback */}
          <Route path="/evaluation" element={<EvaluationPage />} />

          {/* Dashboard listing previous assessments */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Final capability report with skill analysis */}
          <Route path="/report" element={<ReportPage />} />

        </Routes>

      </Layout>

    </AssessmentProvider>
  );
}

export default App;