import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, SEED_DEMO_USERS } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, loginAsDemo, isDemoMode } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Required fields', 'Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);

    if (signInError) {
      error('Authentication Failed', signInError.message);
    } else {
      success('Welcome back', 'Successfully signed in to NexHack Judging Portal.');
      redirectUser(email);
    }
  };

  const handleDemoLogin = async (demoEmail: keyof typeof SEED_DEMO_USERS) => {
    setIsSubmitting(true);
    await loginAsDemo(demoEmail);
    setIsSubmitting(false);
    success('Demo Access Granted', `Signed in as ${SEED_DEMO_USERS[demoEmail].name} (${SEED_DEMO_USERS[demoEmail].role})`);
    redirectUser(demoEmail);
  };

  const redirectUser = (userEmail: string) => {
    const role = SEED_DEMO_USERS[userEmail]?.role || 'judge';
    if (fromLocation && fromLocation !== '/login') {
      navigate(fromLocation, { replace: true });
    } else {
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/judge', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logos & Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/geeta-university-logo.webp"
              alt="Geeta University"
              className="h-11 w-auto object-contain"
            />
            <span className="h-8  w-[1px] bg-slate-300" />
            <img
              src="/nexhack-logo.webp"
              alt="NexHack 2.0"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Judging Portal
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            NexHack 2.0 &bull; 24-Hour Hackathon Evaluation System
          </p>
        </div>

        {/* Login Card */}
        <Card padding="none" className="overflow-hidden border border-slate-200/90 shadow-subtle">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@nexhack.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">password123</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5"
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In to Portal
                </Button>
              </div>
            </form>
          </div>

          {/* Quick Demo Credentials Seed Section */}
          <div className="bg-slate-50/80 px-6 sm:px-8 py-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Phase 0 Demo Accounts
              </span>
              <Badge variant="blue" className="text-[10px]">
                Pre-seeded
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@nexhack.com')}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200/90 rounded-xl text-left hover:border-slate-400 hover:bg-slate-50 transition-all group"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-slate-950 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
                    Chief Admin
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">admin@nexhack.com</p>
                </div>
                <Badge variant="yellow" className="text-[9px] py-0 px-1.5">admin</Badge>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('judge1@nexhack.com')}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200/90 rounded-xl text-left hover:border-slate-400 hover:bg-slate-50 transition-all group"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-slate-950 flex items-center">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                    Dr. Sarah Verma
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">judge1@nexhack.com</p>
                </div>
                <Badge variant="blue" className="text-[9px] py-0 px-1.5">judge</Badge>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('judge2@nexhack.com')}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200/90 rounded-xl text-left hover:border-slate-400 hover:bg-slate-50 transition-all group"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-slate-950 flex items-center">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                    Prof. Rajesh Kumar
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">judge2@nexhack.com</p>
                </div>
                <Badge variant="blue" className="text-[9px] py-0 px-1.5">judge</Badge>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('judge3@nexhack.com')}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200/90 rounded-xl text-left hover:border-slate-400 hover:bg-slate-50 transition-all group"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-slate-950 flex items-center">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                    Ananya Sharma
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">judge3@nexhack.com</p>
                </div>
                <Badge variant="blue" className="text-[9px] py-0 px-1.5">judge</Badge>
              </button>
            </div>
          </div>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Geeta University &bull; School of Computer Science & Engineering
        </p>
      </div>
    </div>
  );
};
