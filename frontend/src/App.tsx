import { Route, Routes } from 'react-router-dom';
import { AssessmentProvider } from './context/AssessmentContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportPage } from './pages/ReportPage';

function App() {
  return (
    <AssessmentProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/roles" element={<RoleSelectionPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/evaluation" element={<EvaluationPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </Layout>
    </AssessmentProvider>
  );
}

export default App;

