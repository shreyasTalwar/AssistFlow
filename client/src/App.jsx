import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { AgentDashboard } from './pages/AgentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import {
  Bot,
  Sparkles,
  Shield,
  Headphones,
  User,
  ArrowRight,
  Database,
  CheckCircle2,
  Lock,
  LogIn
} from 'lucide-react';

const HeroLanding = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'CUSTOMER';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI-Powered B2B Multi-Tenant Support SaaS Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          AI Assists Support Agents. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            It Does Not Replace Them.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Intelligent ticket triage, emotion & priority detection, and Retrieval-Augmented Generation (RAG) grounded strictly in company policies and Pinecone vectors.
        </p>

        {/* Signed Out CTA */}
        <SignedOut>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>Sign In to Access Your Portal</span>
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold cursor-pointer">
                Create Account
              </button>
            </SignUpButton>
          </div>
        </SignedOut>

        {/* Signed In — Strictly Show ONLY the Single Authorized Portal Card */}
        <SignedIn>
          <div className="max-w-md mx-auto pt-6 text-left">
            
            {/* Customer Role -> Customer Portal Card ONLY */}
            {role === 'CUSTOMER' && (
              <Link
                to="/customer"
                className="glass-panel p-6 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-500/70 transition-all group cursor-pointer shadow-2xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Authorized Role: Customer</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mt-0.5">
                      Open Customer Portal
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submit support tickets, view live status tracking, and message support specialists.
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span>Enter Customer Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {/* Agent Role -> Agent Copilot Card ONLY */}
            {role === 'AGENT' && (
              <Link
                to="/agent"
                className="glass-panel p-6 rounded-3xl border border-blue-500/40 bg-blue-950/20 hover:border-blue-500/70 transition-all group cursor-pointer shadow-2xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Authorized Role: Support Agent</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors mt-0.5">
                      Open Agent AI Workspace
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Access ticket queues, AI sentiment & priority insights, and RAG suggested responses.
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-blue-400">
                  <span>Enter Agent Copilot</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {/* Admin Role -> Admin Console Card ONLY */}
            {role === 'ADMIN' && (
              <Link
                to="/admin"
                className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-purple-950/20 hover:border-purple-500/70 transition-all group cursor-pointer shadow-2xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Authorized Role: Administrator</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mt-0.5">
                      Open Admin Console & RAG Knowledge
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Manage Pinecone vector index documents, view CSAT analytics, and monitor system activity.
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-purple-400">
                  <span>Enter Admin Console</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

          </div>
        </SignedIn>
      </div>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HeroLanding />} />
              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agent"
                element={
                  <ProtectedRoute allowedRoles={['AGENT', 'ADMIN']}>
                    <AgentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
