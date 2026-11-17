import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F4F5F9] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8">
        <h1 className="text-5xl font-black text-slate-800 tracking-tight">404</h1>
        <h2 className="text-lg font-bold text-slate-900 mt-2">Page Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested page does not exist or has been relocated.
        </p>
        <Link to="/">
          <Button variant="primary">Return to Portal</Button>
        </Link>
      </Card>
    </div>
  );
};
