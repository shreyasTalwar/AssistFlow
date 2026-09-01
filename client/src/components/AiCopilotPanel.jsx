import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  FileText,
  AlertTriangle,
  ArrowRight,
  ThumbsUp,
  X,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { PriorityBadge, SentimentBadge, CategoryBadge } from './Badge';
import api from '../services/api';

export const AiCopilotPanel = ({
  ticket,
  onUseResponse,
  onUpdateAnalysis,
}) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [retrievedDocs, setRetrievedDocs] = useState([]);
  const [suggestedText, setSuggestedText] = useState(
    ticket?.aiSuggestions?.[0]?.content || ''
  );

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      setDiscarded(false);
      const res = await api.post(`/tickets/${ticket.id}/suggest-response`);
      if (res.data.success) {
        setSuggestedText(res.data.data.suggestedResponse);
        setRetrievedDocs(res.data.data.retrievedKnowledge || []);
        if (onUpdateAnalysis) {
          onUpdateAnalysis(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate response:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseResponse = async () => {
    if (onUseResponse) {
      onUseResponse(suggestedText);
    }
    setAccepted(true);

    // If there is an AI suggestion ID, mark accepted in DB
    const suggestionId = ticket?.aiSuggestions?.[0]?.id;
    if (suggestionId) {
      try {
        await api.patch(`/tickets/${ticket.id}/suggestions/${suggestionId}/accept`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/95 overflow-hidden shadow-2xl">
      
      {/* Copilot Header */}
      <div className="px-5 py-4 border-b border-indigo-500/20 bg-indigo-950/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-100">AI Support Copilot</h3>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                RAG Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Grounded in company knowledge</p>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
          title="Regenerate AI Analysis & RAG response"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* Ticket AI Insights Triage Grid */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-white/5">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Category</span>
            <CategoryBadge category={ticket.category} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Priority</span>
            <PriorityBadge priority={ticket.priority} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Sentiment</span>
            <SentimentBadge sentiment={ticket.sentiment} />
          </div>
        </div>

        {/* Emotion Alert Banner if Angry / Frustrated */}
        {(ticket.sentiment === 'ANGRY' || ticket.sentiment === 'FRUSTRATED') && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Emotionally Sensitive Conversation</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">Customer appears {ticket.sentiment.toLowerCase()}. Prioritize empathetic language and direct problem resolution.</p>
            </div>
          </div>
        )}

        {/* AI Summary Card */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Executive Summary</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-300 leading-relaxed">
            {ticket.summary || 'Summary generating...'}
          </div>
        </div>

        {/* Retrieved Pinecone Knowledge Chunks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Retrieved Knowledge (Pinecone)</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Org Isolated
            </span>
          </div>

          <div className="space-y-1.5">
            {retrievedDocs.length > 0 ? (
              retrievedDocs.map((doc, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-xs hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-200">{doc.title}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">Match: {Math.round(doc.score * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{doc.excerpt}</p>
                </div>
              ))
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950/30 border border-white/5 text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Grounded against Acme Knowledge Base vectors</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Suggested Response Box */}
        {!discarded ? (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>Suggested Response</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={suggestedText}
                onChange={(e) => setSuggestedText(e.target.value)}
                rows={7}
                className="w-full p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-xs text-slate-200 focus:outline-none focus:border-indigo-400 resize-none font-sans leading-relaxed shadow-inner"
                placeholder="AI suggested response will appear here..."
              />
            </div>

            {/* Response Action Buttons matching Section 13.5 & 24 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleUseResponse}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium shadow-lg shadow-indigo-500/25 transition-all cursor-pointer group"
              >
                <span>Use Response</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Regen</span>
                </button>

                <button
                  onClick={() => setDiscarded(true)}
                  className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
                  title="Discard suggestion"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {accepted && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Response applied to reply composer!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-center text-xs text-slate-400 space-y-2">
            <p>AI suggestion discarded.</p>
            <button
              onClick={handleRegenerate}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              Generate a new draft response
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
