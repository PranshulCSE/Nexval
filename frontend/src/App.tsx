import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeamsPage } from './pages/TeamsPage';
import { JudgesPage } from './pages/JudgesPage';
import { RoundsPage } from './pages/RoundsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { JudgeDashboard } from './pages/JudgeDashboard';
import { PublicResultsPage } from './pages/PublicResultsPage';
import { TeamPortalPage } from './pages/TeamPortalPage';
import { JudgeScoringPage } from './pages/JudgeScoringPage';
import { EvaluationGuidelinesPage } from './pages/EvaluationGuidelinesPage';
import { MentorGuidelinesPage } from './pages/MentorGuidelinesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/ProtectedRoute';




const RootRedirect: React.FC = () => {

  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0F172A] rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/judge" replace />;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes with role guard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/judges"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <JudgesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rounds"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <RoundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AssignmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leaderboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />





      {/* Judge routes with role guard */}
      <Route
        path="/judge"
        element={
          <ProtectedRoute allowedRoles={['judge', 'mentor']}>
            <JudgeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge/evaluate/:roundId/:teamId"
        element={
          <ProtectedRoute allowedRoles={['judge', 'mentor']}>
            <JudgeScoringPage />
          </ProtectedRoute>
        }
      />

      {/* Evaluation Guidelines */}
      <Route
        path="/judge/guidelines"
        element={
          <ProtectedRoute allowedRoles={['admin', 'judge', 'mentor']}>
            <EvaluationGuidelinesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guidelines"
        element={
          <ProtectedRoute allowedRoles={['admin', 'judge', 'mentor']}>
            <EvaluationGuidelinesPage />
          </ProtectedRoute>
        }
      />

      {/* Mentor Portal & Guidelines */}
      <Route
        path="/mentor"
        element={
          <ProtectedRoute allowedRoles={['admin', 'judge', 'mentor']}>
            <MentorGuidelinesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/guidelines"
        element={
          <ProtectedRoute allowedRoles={['admin', 'judge', 'mentor']}>
            <MentorGuidelinesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge/mentor"
        element={
          <ProtectedRoute allowedRoles={['admin', 'judge', 'mentor']}>
            <MentorGuidelinesPage />
          </ProtectedRoute>
        }
      />


      {/* Team Submission Portal */}
      <Route path="/team" element={<TeamPortalPage />} />
      <Route path="/team/portal" element={<TeamPortalPage />} />

      {/* Public Results Presentation Screen */}
      <Route path="/results" element={<PublicResultsPage />} />
      <Route path="/public-results" element={<PublicResultsPage />} />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
