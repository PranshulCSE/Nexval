import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('super_admin' | 'admin' | 'judge' | 'mentor')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0F172A] rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  const currentRole = profile?.role;
  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F9] p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Your account ({profile?.email}) with role <span className="font-semibold text-slate-700">{currentRole}</span> does not have permission to view this section.
          </p>
          <div className="flex justify-center gap-3">
            <Link to={currentRole === 'admin' || currentRole === 'super_admin' ? '/admin' : '/judge'}>
              <Button variant="primary">
                Go to {currentRole === 'admin' || currentRole === 'super_admin' ? 'Admin Portal' : 'Judge Portal'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
