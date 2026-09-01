import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUser } from '@clerk/clerk-react';
import api from '../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badge';
import { CustomerChatbot } from '../components/CustomerChatbot';
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Star,
  Sparkles,
  Paperclip,
  RefreshCw,
  X,
  FileText,
  User,
  ShieldAlert,
  Bot,
  Layers,
  BookOpen
} from 'lucide-react';

export const CustomerDashboard = () => {
  const { currentUser, currentOrg } = useAuth();
  const { user: clerkUser } = useUser();
  
  // Section Navigation: 'tickets' or 'chatbot'
  const [activeSection, setActiveSection] = useState('tickets');

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Billing');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reply message
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // CSAT feedback form
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tickets');
      if (res.data.success) {
        setTickets(res.data.data);
        if (res.data.data.length > 0 && !selectedTicket) {
          fetchTicketDetails(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching customer tickets:', err);
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
      console.error('Error fetching ticket details:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentUser]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await api.post('/tickets', {
        subject: newSubject,
        category: newCategory,
        description: newDescription,
      });

      if (res.data.success) {
        setShowCreateModal(false);
        setNewSubject('');
        setNewDescription('');
        await fetchTickets();
        if (res.data.data) {
          fetchTicketDetails(res.data.data.id);
        }
        setActiveSection('tickets');
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedTicket) return;

    try {
      setIsSendingReply(true);
      const res = await api.post(`/tickets/${selectedTicket.id}/messages`, {
        content: replyContent,
      });

      if (res.data.success) {
        setReplyContent('');
        await fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/tickets/${selectedTicket.id}`, {
        status: newStatus,
      });
      if (res.data.success) {
        await fetchTicketDetails(selectedTicket.id);
        fetchTickets();
        if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
          setShowFeedbackModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsSubmittingFeedback(true);
      const res = await api.post(`/tickets/${selectedTicket.id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment,
      });
      if (res.data.success) {
        setShowFeedbackModal(false);
        setFeedbackComment('');
        await fetchTicketDetails(selectedTicket.id);
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.ticketNumber).includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Customer Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-indigo-950/40 p-6 rounded-3xl border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Customer Support Portal</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">{currentOrg?.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {clerkUser?.firstName || clerkUser?.fullName || currentUser?.name || 'Valued Customer'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Access 24/7 AI grounded support or manage active inquiries with our support specialists.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Support Ticket</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs: My Tickets vs AI Chatbot */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setActiveSection('tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'tickets'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>My Support Tickets</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {tickets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('chatbot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'chatbot'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>24/7 AI Assistant</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 1: TICKETS WORKSPACE */}
      {activeSection === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left List: Ticket Feed */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Search & Filter Bar */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ticket #, subject or text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Cards */}
            <div className="space-y-3">
              {loading ? (
                <div className="p-8 text-center glass-panel rounded-2xl border border-white/10 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  <p className="text-xs">Loading tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-2xl border border-white/10 text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-medium text-slate-300">No support tickets found</p>
                  <p className="text-xs text-slate-500 mt-1">Submit your first inquiry above.</p>
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => fetchTicketDetails(t.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedTicket?.id === t.id
                        ? 'glass-panel border-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                        : 'glass-card border-white/5 hover:border-white/15 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">#{t.ticketNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <CategoryBadge category={t.category} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1.5">
                      {t.subject}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
                      <span>{new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{t._count?.messages || 1} messages</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Detail: Active Conversation Thread */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col min-h-[640px]">
                
                {/* Thread Header */}
                <div className="p-6 border-b border-white/10 bg-slate-950/50">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-mono font-bold text-indigo-400">
                        Ticket #{selectedTicket.ticketNumber}
                      </span>
                      <StatusBadge status={selectedTicket.status} />
                      <PriorityBadge priority={selectedTicket.priority} />
                      <CategoryBadge category={selectedTicket.category} />
                    </div>

                    {/* Actions for Customer */}
                    <div className="flex items-center gap-2">
                      {selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED' ? (
                        <button
                          onClick={() => handleStatusChange('OPEN')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                        >
                          Reopen Ticket
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange('RESOLVED')}
                          className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Mark as Resolved
                        </button>
                      )}
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-white mb-2">{selectedTicket.subject}</h2>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Assigned Agent: <strong className="text-slate-200">{selectedTicket.assignedAgent?.name || 'Triage Team'}</strong></span>
                    <span>•</span>
                    <span>Created: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Message Feed */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/30">
                  {selectedTicket.messages?.map((msg, idx) => {
                    const isUser = msg.senderType === 'CUSTOMER';
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isUser
                            ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30'
                        }`}>
                          {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </div>

                        <div className={`max-w-[80%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">
                              {msg.sender?.name || (isUser ? 'You' : 'Support Specialist')}
                            </span>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.isAiGenerated && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                                AI Assisted
                              </span>
                            )}
                          </div>

                          <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? 'bg-emerald-950/40 border border-emerald-500/20 text-slate-100 rounded-tr-none'
                              : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Feedback rating card if exists */}
                  {selectedTicket.feedback && (
                    <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-center my-4 space-y-2">
                      <p className="text-xs font-semibold text-purple-300">Your Support Rating</p>
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < selectedTicket.feedback.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      {selectedTicket.feedback.comment && (
                        <p className="text-xs text-slate-400 italic">"{selectedTicket.feedback.comment}"</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <form onSubmit={handleSendReply} className="p-4 border-t border-white/10 bg-slate-950/60 flex gap-3">
                    <textarea
                      rows={2}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Type your response to the support agent..."
                      className="flex-1 p-3 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyContent.trim()}
                      className="px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-4 border-t border-white/10 bg-slate-950/60 text-center text-xs text-slate-500">
                    This ticket is closed. Click "Reopen Ticket" above to continue the conversation.
                  </div>
                )}

              </div>
            ) : (
              <div className="glass-panel rounded-3xl border border-white/10 p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[480px]">
                <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-slate-200">Select a Ticket</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Choose a ticket from the left queue to view messages, interact with the agent, or manage resolution.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SECTION 2: DEDICATED 24/7 AI CHATBOT WORKSPACE */}
      {activeSection === 'chatbot' && (
        <div className="glass-panel rounded-3xl border border-indigo-500/30 p-6 space-y-6 bg-slate-950/80 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>SmartSupport 24/7 AI Assistant</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Mistral AI + Pinecone RAG Grounded
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Ask any question about billing, refunds, rate limits, or account security to receive instant policy-grounded answers.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Open Official Support Ticket</span>
            </button>
          </div>

          {/* Embedded Full-Width AI Chatbot */}
          <div className="max-w-4xl mx-auto">
            <CustomerChatbot onRequestNewTicket={() => setShowCreateModal(true)} embeddedMode={true} />
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-dropdown w-full max-w-lg rounded-3xl border border-white/15 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Support Ticket</h3>
                  <p className="text-[11px] text-slate-400">AI triage will automatically classify and assign priority</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Duplicate charge on monthly invoice"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Billing">Billing & Invoices</option>
                  <option value="Payments">Payments</option>
                  <option value="Account">Account Security & Access</option>
                  <option value="Technical Issue">Technical Issue & API</option>
                  <option value="Subscription">Subscription Management</option>
                  <option value="Refund">Refund Request</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Product Question">Product Question</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Problem Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe your issue in detail. Our AI will search company policies and assist our specialists with a solution..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-3.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>AI RAG Copilot will analyze your request and retrieve company guidelines immediately.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting & AI Triaging...</span>
                    </>
                  ) : (
                    <span>Submit Ticket</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Customer Feedback Rating Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-dropdown w-full max-w-md rounded-3xl border border-white/15 p-6 shadow-2xl animate-in fade-in">
            <div className="text-center space-y-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto">
                <Star className="w-6 h-6 fill-yellow-400" />
              </div>
              <h3 className="text-base font-bold text-white">Rate Your Support Experience</h3>
              <p className="text-xs text-slate-400">How satisfied were you with the resolution of Ticket #{selectedTicket?.ticketNumber}?</p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= feedbackRating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Optional Comments</label>
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Tell us what went well or how we can improve..."
                  className="w-full p-3 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
