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
import { JudgeDashboard } from './pages/JudgeDashboard';

import { JudgeScoringPage } from './pages/JudgeScoringPage';
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

  if (profile?.role === 'admin') {
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
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/judges"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <JudgesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rounds"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <RoundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AssignmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leaderboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <LeaderboardPage />
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


      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
