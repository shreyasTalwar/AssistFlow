import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StatusBadge, PriorityBadge, SentimentBadge, CategoryBadge } from '../components/Badge';
import { AiCopilotPanel } from '../components/AiCopilotPanel';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  UserCheck,
  Send,
  Sparkles,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  X,
  User,
  SlidersHorizontal,
  Bot
} from 'lucide-react';

export const AgentDashboard = () => {
  const { currentUser, currentOrg, availableUsers } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    openTickets: 0,
    pendingTickets: 0,
    resolvedToday: 0,
    avgResolutionTime: '1.8 hrs',
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [assignedFilter, setAssignedFilter] = useState('ALL');

  // Reply Composer
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiAssistedReply, setIsAiAssistedReply] = useState(false);

  const fetchKpis = async () => {
    try {
      const res = await api.get('/analytics/overview');
      if (res.data.success) {
        setKpis(res.data.data.kpis);
      }
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (assignedFilter === 'ME' && currentUser) params.agentId = currentUser.id;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/tickets', { params });
      if (res.data.success) {
        setTickets(res.data.data);
        if (res.data.data.length > 0 && !selectedTicket) {
          fetchTicketDetails(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      if (res.data.success) {
        setSelectedTicket(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchTickets();
  }, [statusFilter, priorityFilter, categoryFilter, assignedFilter, currentUser]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setIsSending(true);
      const res = await api.post(`/tickets/${selectedTicket.id}/messages`, {
        content: replyMessage,
        isAiGenerated: isAiAssistedReply,
      });

      if (res.data.success) {
        setReplyMessage('');
        setIsAiAssistedReply(false);
        await fetchTicketDetails(selectedTicket.id);
        fetchTickets();
        fetchKpis();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/tickets/${selectedTicket.id}`, { status: newStatus });
      if (res.data.success) {
        await fetchTicketDetails(selectedTicket.id);
        fetchTickets();
        fetchKpis();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleUpdatePriority = async (newPriority) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/tickets/${selectedTicket.id}`, { priority: newPriority });
      if (res.data.success) {
        await fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const handleAssignAgent = async (agentId) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/tickets/${selectedTicket.id}/assign`, { agentId });
      if (res.data.success) {
        await fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  const handleUseAiResponse = (text) => {
    setReplyMessage(text);
    setIsAiAssistedReply(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & KPI Summary Cards */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Agent Operations Center</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">{currentOrg?.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              Support Ticket Queue & AI Copilot
            </h1>
          </div>

          <button
            onClick={() => { fetchTickets(); fetchKpis(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* 4 KPI Cards matching Section 23 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Open Tickets</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.openTickets}</p>
            <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Real-time triage</span>
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Pending Tickets</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.pendingTickets}</p>
            <p className="text-[11px] text-blue-400 font-medium mt-1">In progress & customer</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Resolved Today</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.resolvedToday}</p>
            <p className="text-[11px] text-purple-400 font-medium mt-1">High throughput</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Avg Resolution Time</span>
              <div className="w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{kpis.avgResolutionTime}</p>
            <p className="text-[11px] text-yellow-400 font-medium mt-1">-42% faster with RAG</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket #, customer name, subject, or message text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </form>

          {/* Quick Filter Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Billing">Billing</option>
              <option value="Security">Security</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Refund">Refund</option>
              <option value="Subscription">Subscription</option>
              <option value="Account">Account</option>
            </select>

            <button
              onClick={() => setAssignedFilter(assignedFilter === 'ME' ? 'ALL' : 'ME')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                assignedFilter === 'ME'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-300 border border-white/10 hover:bg-slate-800'
              }`}
            >
              Assigned to Me
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Column AI Copilot Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Ticket Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ticket Queue ({tickets.length})
            </span>
          </div>

          <div className="space-y-3 max-h-[820px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center glass-panel rounded-2xl border border-white/10 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                <p className="text-xs">Loading queue...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-2xl border border-white/10 text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-medium text-slate-300">No matching tickets</p>
                <p className="text-xs text-slate-500 mt-1">Adjust filters or search parameters.</p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => fetchTicketDetails(t.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedTicket?.id === t.id
                      ? 'glass-panel border-blue-500/50 bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30'
                      : 'glass-card border-white/5 hover:border-white/15 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-400">#{t.ticketNumber}</span>
                      <PriorityBadge priority={t.priority} />
                      <SentimentBadge sentiment={t.sentiment} />
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1.5">
                    {t.subject}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={t.customer?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                        alt={t.customer?.name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="font-medium text-slate-300 truncate max-w-[120px]">{t.customer?.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <CategoryBadge category={t.category} />
                      <span>{new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Columns: Active Ticket & AI Copilot Workspace (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              
              {/* Left Subsection: Ticket Detail & Message Stream (7 cols on xl) */}
              <div className="xl:col-span-7 glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col min-h-[720px]">
                
                {/* Header & Status/Priority Controls */}
                <div className="p-5 border-b border-white/10 bg-slate-950/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono font-bold text-blue-400">
                      Ticket #{selectedTicket.ticketNumber}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Priority selector */}
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) => handleUpdatePriority(e.target.value)}
                        className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>

                      {/* Status selector */}
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="WAITING_FOR_CUSTOMER">Waiting Customer</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                  </div>

                  <h2 className="text-base font-bold text-white">{selectedTicket.subject}</h2>

                  {/* Customer and Assignee banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Customer: <strong className="text-slate-200">{selectedTicket.customer?.name}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Agent:</span>
                      <select
                        value={selectedTicket.assignedAgentId || ''}
                        onChange={(e) => handleAssignAgent(e.target.value || null)}
                        className="bg-transparent border-b border-slate-600 text-slate-200 text-xs focus:outline-none"
                      >
                        <option value="" className="bg-slate-900">Unassigned</option>
                        {availableUsers
                          .filter((u) => u.role === 'AGENT' || u.role === 'ADMIN')
                          .map((ag) => (
                            <option key={ag.id} value={ag.id} className="bg-slate-900">
                              {ag.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Messages Thread */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/30">
                  {selectedTicket.messages?.map((msg, idx) => {
                    const isAgent = msg.senderType === 'AGENT';
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isAgent
                            ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                        }`}>
                          {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        <div className={`max-w-[85%] space-y-1 ${isAgent ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">{msg.sender?.name || (isAgent ? 'Agent' : 'Customer')}</span>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.isAiGenerated && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                                AI Suggested
                              </span>
                            )}
                          </div>

                          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            isAgent
                              ? 'bg-blue-950/40 border border-blue-500/20 text-slate-100 rounded-tr-none'
                              : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Composer with AI insertion highlight */}
                <form onSubmit={handleSendReply} className="p-4 border-t border-white/10 bg-slate-950/60 space-y-2">
                  {isAiAssistedReply && (
                    <div className="flex items-center justify-between text-[11px] px-2 text-indigo-300">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        AI Copilot draft inserted (Ready for agent review & edit)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAiAssistedReply(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        Clear flag
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your response to the customer or click 'Use Response' on the AI Copilot panel..."
                      className="flex-1 p-3 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !replyMessage.trim()}
                      className="px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>

              </div>

              {/* Right Subsection: AI Copilot Panel (5 cols on xl) matching Section 24 */}
              <div className="xl:col-span-5">
                <AiCopilotPanel
                  ticket={selectedTicket}
                  onUseResponse={handleUseAiResponse}
                  onUpdateAnalysis={(newData) => {
                    setSelectedTicket((prev) => ({
                      ...prev,
                      ...newData,
                    }));
                  }}
                />
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-white/10 p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[480px]">
              <Inbox className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-200">No Ticket Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Select a support ticket from the queue to start investigating with the AI Copilot.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
