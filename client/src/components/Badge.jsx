import React from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const styles = {
    OPEN: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    WAITING_FOR_CUSTOMER: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    RESOLVED: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    CLOSED: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };

  const labels = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    WAITING_FOR_CUSTOMER: 'Waiting on Customer',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.OPEN}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current"></span>
      {labels[status] || status}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const styles = {
    URGENT: 'bg-red-500/15 text-red-400 border-red-500/30 font-bold animate-pulse',
    HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30 font-medium',
    MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${styles[priority] || styles.MEDIUM}`}>
      {priority === 'URGENT' && <ShieldAlert className="w-3 h-3 mr-1 text-red-400" />}
      {priority}
    </span>
  );
};

export const SentimentBadge = ({ sentiment }) => {
  const styles = {
    ANGRY: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    FRUSTRATED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    NEUTRAL: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    POSITIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };

  const icons = {
    ANGRY: '😡',
    FRUSTRATED: '😤',
    NEUTRAL: '😐',
    POSITIVE: '😊',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${styles[sentiment] || styles.NEUTRAL}`}>
      <span>{icons[sentiment] || '😐'}</span>
      <span>{sentiment}</span>
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
      {category || 'General'}
    </span>
  );
};
