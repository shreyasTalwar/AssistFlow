import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, SignOutButton, useUser } from '@clerk/clerk-react';
import {
  Sparkles,
  Building2,
  Users,
  Shield,
  Headphones,
  User,
  ExternalLink,
  Layers,
  Database,
  BarChart3,
  Bot,
  LogIn,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar = () => {
  const { currentUser, currentOrg } = useAuth();
  const { user: clerkUser } = useUser();
  const location = useLocation();

  const activeName = clerkUser?.fullName || currentUser?.name || 'User Profile';
  const activeEmail = clerkUser?.primaryEmailAddress?.emailAddress || currentUser?.email || '';
  const activeAvatar = clerkUser?.imageUrl || currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  const activeRole = currentUser?.role || 'CUSTOMER';

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return <Shield className="w-3.5 h-3.5 text-purple-400" />;
      case 'AGENT': return <Headphones className="w-3.5 h-3.5 text-blue-400" />;
      default: return <User className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Organization */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  SmartSupport AI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v1.0 SaaS
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span>{currentOrg?.name || 'Acme Cloud Technologies'}</span>
              </p>
            </div>
          </Link>

          {/* Navigation Links — Filtered by user's role */}
          <SignedIn>
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
              
              {activeRole === 'CUSTOMER' && (
                <Link
                  to="/customer"
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    location.pathname.startsWith('/customer')
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Customer Portal
                </Link>
              )}

              {activeRole === 'AGENT' && (
                <Link
                  to="/agent"
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    location.pathname.startsWith('/agent')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Agent Copilot
                </Link>
              )}

              {activeRole === 'ADMIN' && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Admin Console
                </Link>
              )}

            </nav>
          </SignedIn>
        </div>

        {/* Clerk Auth Controls */}
        <div className="flex items-center gap-3">
          
          <SignedOut>
            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <button className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
                <UserButton afterSignOutUrl="/" />
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">{activeName}</span>
                    {getRoleIcon(activeRole)}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate max-w-[140px] uppercase font-mono font-semibold">
                    {activeRole}
                  </span>
                </div>
              </div>

              {/* Dedicated 1-Click Log Out Button */}
              <SignOutButton redirectUrl="/">
                <button className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </SignOutButton>
            </div>
          </SignedIn>

        </div>

      </div>
    </header>
  );
};
