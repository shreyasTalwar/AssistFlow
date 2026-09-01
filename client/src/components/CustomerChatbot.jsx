import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Bot,
  Sparkles,
  Send,
  X,
  MessageSquare,
  RefreshCw,
  BookOpen,
  Plus,
  User,
  Trash2,
} from 'lucide-react';

export const CustomerChatbot = ({ onRequestNewTicket, embeddedMode = false }) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(embeddedMode);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const storageKey = `smartsupport_chatbot_messages_${currentUser?.email || 'guest'}`;

  const defaultInitialMessage = {
    sender: 'ai',
    text: `Hello ${currentUser?.name || 'there'}! I'm your SmartSupport AI assistant powered by Mistral AI. Ask me anything about our refund policies, 2FA security, or subscription rate limits!`,
    retrievedDocs: [],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chatbot history from localStorage:', e);
    }
    return [defaultInitialMessage];
  });

  const fetchDbHistory = async () => {
    try {
      const res = await api.get('/knowledge/chat/history');
      if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load chatbot DB history:', err);
    }
  };

  useEffect(() => {
    fetchDbHistory();
  }, [currentUser]);

  // Save to localStorage on message update
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chatbot messages to localStorage:', e);
    }
  }, [messages, storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen || embeddedMode) {
      scrollToBottom();
    }
  }, [messages, isOpen, embeddedMode]);

  const handleClearHistory = async () => {
    if (window.confirm('Clear your AI Chatbot conversation history from database?')) {
      try {
        await api.delete('/knowledge/chat/history');
      } catch (err) {
        console.warn('Failed to clear DB chatbot history:', err);
      }
      const reset = [defaultInitialMessage];
      setMessages(reset);
      localStorage.setItem(storageKey, JSON.stringify(reset));
    }
  };

  const handleSendMessage = async (e, customText = null) => {
    if (e) e.preventDefault();
    const userText = (customText || inputMessage).trim();
    if (!userText || loading) return;

    if (!customText) setInputMessage('');

    const userMsg = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/knowledge/chat', { query: userText });
      
      let aiResponseText = '';
      let docs = [];

      if (res.data.success) {
        aiResponseText = res.data.data.reply;
        docs = res.data.data.retrievedKnowledge || [];
      } else {
        aiResponseText = `I searched our company documentation but didn't find a direct match for "${userText}".\n\nWould you like me to submit an official support ticket so one of our specialists can assist you?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiResponseText,
          retrievedDocs: docs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Chatbot RAG error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'I encountered a temporary issue connecting to our knowledge base. Please feel free to open an official ticket for assistance!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Sample quick question prompts
  const samplePrompts = [
    'What is your refund policy for duplicate charges?',
    'How do I reset my 2FA authentication code?',
    'What are the API rate limits for Pro subscriptions?',
  ];

  if (embeddedMode) {
    return (
      <div className="w-full h-[580px] rounded-2xl glass-panel border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar with Clear History button */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white">24/7 AI Assistant Workspace</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
              Persistent Chat Active
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearHistory}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-[11px] transition-all cursor-pointer border border-white/5"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>

        {/* Sample Prompt Pills */}
        <div className="p-3 bg-slate-900/80 border-b border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Suggested Questions:</span>
          </span>
          {samplePrompts.map((promptText, pIdx) => (
            <button
              key={pIdx}
              onClick={(e) => handleSendMessage(e, promptText)}
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 border border-white/10 text-[11px] transition-all cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/60 text-xs">
          {messages.map((msg, idx) => {
            const isAi = msg.sender === 'ai';
            return (
              <div key={idx} className={`flex gap-3 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isAi
                    ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                }`}>
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`max-w-[80%] space-y-1.5 ${isAi ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">{isAi ? 'SmartSupport AI (Mistral AI)' : 'You'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className={`p-4 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    isAi
                      ? 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none'
                      : 'bg-indigo-600/30 border border-indigo-500/30 text-white rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>

                  {msg.retrievedDocs && msg.retrievedDocs.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pinecone Vector Knowledge Source:</span>
                      </span>
                      {msg.retrievedDocs.map((doc, dIdx) => (
                        <div key={dIdx} className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-[11px] text-emerald-300">
                          <span className="font-bold">{doc.title}</span> (Relevance: {Math.round(doc.score * 100)}%)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2 items-center text-xs text-slate-400 p-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Querying Pinecone vectors & generating Mistral AI response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/90 space-y-3">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask AI assistant about policies, 2FA, billing..."
              className="flex-1 px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
            >
              <Send className="w-4 h-4" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>

      </div>
    );
  }

  // Fallback floating pop-up mode if rendered outside embedded view
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-2xl shadow-indigo-500/50 group transition-all hover:scale-105 cursor-pointer ring-2 ring-indigo-400/30"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          </div>
          <span>AI Support Assistant</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[540px] rounded-3xl glass-dropdown border border-indigo-500/30 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">SmartSupport AI</h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">RAG Grounded • 24/7 Instant Answers</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/60 text-xs">
            {messages.map((msg, idx) => {
              const isAi = msg.sender === 'ai';
              return (
                <div key={idx} className={`flex gap-2.5 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isAi
                      ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                  }`}>
                    {isAi ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`max-w-[85%] space-y-1 ${isAi ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>{isAi ? 'AI Assistant' : 'You'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      isAi
                        ? 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none'
                        : 'bg-indigo-600/30 border border-indigo-500/30 text-white rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>

                    {msg.retrievedDocs && msg.retrievedDocs.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-emerald-400" />
                          <span>Knowledge Source:</span>
                        </span>
                        {msg.retrievedDocs.map((doc, dIdx) => (
                          <div key={dIdx} className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-300">
                            <span className="font-bold">{doc.title}</span> (Score: {Math.round(doc.score * 100)}%)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-400 p-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Searching Pinecone vectors & drafting answer...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-white/10 bg-slate-900/90 space-y-2">
            {onRequestNewTicket && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onRequestNewTicket();
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Need more help? Open Official Ticket</span>
              </button>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask AI anything..."
                className="flex-1 px-3.5 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};
