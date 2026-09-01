import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { ShieldAlert, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 text-xs">
        Verifying permissions...
      </div>
    );
  }

  // 1. Signed Out Guard
  const signedOutGuard = (
    <div className="max-w-md mx-auto my-16 p-8 glass-panel rounded-3xl border border-indigo-500/30 text-center space-y-4 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">Authentication Required</h2>
        <p className="text-xs text-slate-400 mt-1">
          Please sign in to access this portal with your Clerk account.
        </p>
      </div>

      <div className="pt-2">
        <SignInButton mode="modal">
          <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" />
            <span>Sign In to Continue</span>
          </button>
        </SignInButton>
      </div>
    </div>
  );

  // 2. Role Permission Check
  if (currentUser && allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 glass-panel rounded-3xl border border-rose-500/30 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Access Restricted</h2>
          <p className="text-xs text-slate-400 mt-1">
            Your current account role (<strong className="text-rose-300 capitalize">{currentUser.role.toLowerCase()}</strong>) does not have permission to view this portal.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to={currentUser.role === 'CUSTOMER' ? '/customer' : currentUser.role === 'AGENT' ? '/agent' : '/admin'}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Your Authorized Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};
