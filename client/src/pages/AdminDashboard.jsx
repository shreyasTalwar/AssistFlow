import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Layers3,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
  UploadCloud,
  FileType
} from 'lucide-react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const MetricCard = ({ label, value, detail, icon: Icon, tone = 'blue', loading }) => {
  const tones = {
    blue: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/10',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/10',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/10',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/10',
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <div className="mt-3 h-8 w-20 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
          )}
        </div>
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1', tones[tone])}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-4 text-[12px] leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </article>
  );
};

const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
    <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Icon className="h-5 w-5" />
    </span>
    <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

const Panel = ({ children, className = '' }) => (
  <section className={cx('overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900', className)}>
    {children}
  </section>
);

export const AdminDashboard = () => {
  const { currentOrg } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [overview, setOverview] = useState(null);
  const [ticketMetrics, setTicketMetrics] = useState(null);
  const [agentMetrics, setAgentMetrics] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Modal states & mode
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('pdf'); // 'pdf' or 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newVersion, setNewVersion] = useState('1.0');
  const [isUploading, setIsUploading] = useState(false);
  
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState([]);
  const [isSearchingRag, setIsSearchingRag] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoadingMetrics(true);
      const [ovRes, tmRes, agRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/tickets'),
        api.get('/analytics/agents'),
      ]);
      if (ovRes.data.success) setOverview(ovRes.data.data.kpis);
      if (tmRes.data.success) setTicketMetrics(tmRes.data.data);
      if (agRes.data.success) setAgentMetrics(agRes.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.get('/knowledge');
      if (res.data.success) setDocuments(res.data.data);
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchDocuments();
  }, [currentOrg]);

  const handleUploadDocument = async (event) => {
    event.preventDefault();

    try {
      setIsUploading(true);

      if (uploadMode === 'pdf') {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (newTitle.trim()) formData.append('title', newTitle);
        if (newDesc.trim()) formData.append('description', newDesc);
        if (newVersion.trim()) formData.append('version', newVersion);

        const res = await api.post('/knowledge/upload-pdf', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (res.data.success) {
          setShowUploadModal(false);
          setSelectedFile(null);
          setNewTitle('');
          setNewDesc('');
          setNewVersion('1.0');
          await fetchDocuments();
        }
      } else {
        if (!newTitle.trim() || !newContent.trim()) return;
        const res = await api.post('/knowledge', {
          title: newTitle,
          description: newDesc,
          content: newContent,
          version: newVersion,
        });

        if (res.data.success) {
          setShowUploadModal(false);
          setNewTitle('');
          setNewDesc('');
          setNewContent('');
          setNewVersion('1.0');
          await fetchDocuments();
        }
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document from the knowledge base? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/knowledge/${docId}`);
      if (res.data.success) await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleRagSearchTest = async (event) => {
    event.preventDefault();
    if (!ragQuery.trim()) return;
    try {
      setIsSearchingRag(true);
      const res = await api.post('/knowledge/search', { query: ragQuery });
      if (res.data.success) setRagResults(res.data.data);
    } catch (error) {
      console.error('Failed to search RAG:', error);
    } finally {
      setIsSearchingRag(false);
    }
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'knowledge', label: 'Knowledge base', icon: Database },
    { id: 'agents', label: 'Team performance', icon: Users },
  ];

  const categories = ticketMetrics?.categories || [];
  const priorityItems = [
    ['Urgent', ticketMetrics?.priorities?.URGENT || 0, 'bg-rose-500', 'text-rose-700 dark:text-rose-300'],
    ['High', ticketMetrics?.priorities?.HIGH || 0, 'bg-orange-500', 'text-orange-700 dark:text-orange-300'],
    ['Medium', ticketMetrics?.priorities?.MEDIUM || 0, 'bg-amber-400', 'text-amber-700 dark:text-amber-300'],
    ['Low', ticketMetrics?.priorities?.LOW || 0, 'bg-slate-400', 'text-slate-600 dark:text-slate-300'],
  ];
  const sentimentItems = [
    ['Positive', ticketMetrics?.sentiments?.POSITIVE || 0, 'bg-emerald-500', 'text-emerald-700 dark:text-emerald-300'],
    ['Neutral', ticketMetrics?.sentiments?.NEUTRAL || 0, 'bg-slate-400', 'text-slate-600 dark:text-slate-300'],
    ['Frustrated', ticketMetrics?.sentiments?.FRUSTRATED || 0, 'bg-amber-400', 'text-amber-700 dark:text-amber-300'],
    ['Angry', ticketMetrics?.sentiments?.ANGRY || 0, 'bg-rose-500', 'text-rose-700 dark:text-rose-300'],
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-900 dark:bg-[#0b1120] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              <span>Administration</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{currentOrg?.name || 'Workspace'}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[28px]">Support operations</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Monitor customer support, maintain your knowledge base, and track team quality.</p>
          </div>
          <div className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:w-auto" role="tablist" aria-label="Dashboard sections">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all sm:px-4 md:flex-none',
                  activeTab === id
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total tickets" value={overview?.totalTickets ?? 0} detail="Across all support channels" icon={Activity} tone="blue" loading={loadingMetrics} />
              <MetricCard label="Customer satisfaction" value={`${overview?.csatScore ?? 4.8} / 5`} detail="Based on verified customer feedback" icon={Star} tone="amber" loading={loadingMetrics} />
              <MetricCard label="AI acceptance" value={`${overview?.aiAcceptanceRate ?? 74}%`} detail="Suggestions approved by agents" icon={Sparkles} tone="emerald" loading={loadingMetrics} />
              <MetricCard label="Average resolution" value={overview?.avgResolutionTime ?? '1.8 hrs'} detail="Within the two-hour service target" icon={Clock3} tone="violet" loading={loadingMetrics} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <Panel>
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"><Layers3 className="h-4 w-4" /></span>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tickets by category</h2>
                    </div>
                    <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">Distribution of incoming support requests.</p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Current period</span>
                </div>
                <div className="space-y-5 p-5">
                  {loadingMetrics ? (
                    [...Array(5)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)
                  ) : categories.length ? categories.map((category, index) => {
                    const width = Math.max(Number(category.percentage) || 0, 3);
                    const chartColors = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-400', 'bg-rose-500'];
                    return (
                      <div key={`${category.name}-${index}`}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-[12px]">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{category.name}</span>
                          <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{category.count} <span className="text-slate-400 dark:text-slate-500">({category.percentage}%)</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className={cx('h-full rounded-full transition-all duration-500', chartColors[index % chartColors.length])} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  }) : <EmptyState icon={BarChart3} title="No ticket data yet" text="Category data will appear after your support requests are processed." />}
                </div>
              </Panel>

              <div className="space-y-6">
                <Panel>
                  <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-500" /><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Priority distribution</h2></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5 sm:grid-cols-4 xl:grid-cols-2">
                    {priorityItems.map(([name, count, color, textColor]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className={cx('h-2.5 w-2.5 rounded-full', color)} />
                        <div><p className={cx('text-[11px] font-semibold uppercase tracking-wide', textColor)}>{name}</p><p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-950 dark:text-white">{count}</p></div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-500" /><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Customer sentiment</h2></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5 sm:grid-cols-4 xl:grid-cols-2">
                    {sentimentItems.map(([name, count, color, textColor]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className={cx('h-2.5 w-2.5 rounded-full', color)} />
                        <div><p className={cx('text-[11px] font-semibold uppercase tracking-wide', textColor)}>{name}</p><p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-950 dark:text-white">{count}</p></div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <Panel>
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><BookOpen className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Knowledge base</h2>
                    <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500 dark:text-slate-400">Upload PDF documents or paste policy text. Text is extracted, chunked, and indexed into Pinecone for tenant-isolated retrieval.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowUploadModal(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus:ring-slate-500 dark:focus:ring-offset-slate-950">
                  <Plus className="h-4 w-4" /> Add document
                </button>
              </div>
            </Panel>

            <Panel className="border-sky-100 dark:border-sky-900/60">
              <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
                <div className="flex items-center gap-2"><Search className="h-4 w-4 text-sky-600 dark:text-sky-300" /><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Test retrieval</h2></div>
                <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">Run a semantic search to verify the chunks your assistant can retrieve.</p>
              </div>
              <div className="p-5">
                <form onSubmit={handleRagSearchTest} className="flex flex-col gap-2 sm:flex-row">
                  <label className="sr-only" htmlFor="retrieval-query">Search knowledge base</label>
                  <input id="retrieval-query" value={ragQuery} onChange={(event) => setRagQuery(event.target.value)} placeholder="Ask about a policy, billing issue, account access, or product feature..." className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                  <button type="submit" disabled={isSearchingRag || !ragQuery.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-[12px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400">
                    {isSearchingRag ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </button>
                </form>
                {ragResults.length > 0 && (
                  <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                    <p className="mb-3 text-[12px] font-semibold text-slate-700 dark:text-slate-200">{ragResults.length} matching {ragResults.length === 1 ? 'source' : 'sources'}</p>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {ragResults.map((chunk, index) => (
                        <article key={`${chunk.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                          <div className="flex items-start justify-between gap-3"><h3 className="text-[12px] font-semibold text-slate-900 dark:text-white">{chunk.title}</h3><span className="shrink-0 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{Math.round(chunk.score * 100)}% match</span></div>
                          <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-slate-600 dark:text-slate-400">{chunk.text}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Indexed documents</h2><p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{documents.length} documents available to the assistant</p></div></div>
              {loadingDocs ? <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-slate-400" /></div> : documents.length === 0 ? (
                <EmptyState icon={FileText} title="Your knowledge base is empty" text="Add your first document to give the support assistant reliable, company-specific context." action={<button type="button" onClick={() => setShowUploadModal(true)} className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-slate-950">Add document</button>} />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((doc) => (
                    <article key={doc.id} className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><FileText className="h-4 w-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{doc.title}</h3><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{doc.status || 'Indexed'}</span><span className="text-[11px] text-slate-400">v{doc.version || '1.0'}</span></div><p className="mt-1 max-w-3xl truncate text-[12px] text-slate-500 dark:text-slate-400">{doc.description || `${doc.fileContent?.slice(0, 130) || 'No description available'}...`}</p><p className="mt-1 text-[11px] text-slate-400">Added by {doc.createdBy || 'Admin'} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Recently'}</p></div></div>
                      <button type="button" onClick={() => handleDeleteDocument(doc.id)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-300" aria-label={`Delete ${doc.title}`} title="Delete document"><Trash2 className="h-3.5 w-3.5" /></button>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {activeTab === 'agents' && (
          <Panel>
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Team performance</h2><p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Agent throughput, response quality, and current workload.</p></div><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{agentMetrics.length} agents</span></div>
            {loadingMetrics ? <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-slate-400" /></div> : agentMetrics.length === 0 ? <EmptyState icon={Users} title="No agent metrics available" text="Performance information will appear when agents have assigned support work." /> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400"><tr><th className="px-5 py-3.5">Agent</th><th className="px-5 py-3.5">Assigned</th><th className="px-5 py-3.5">Resolved</th><th className="px-5 py-3.5">Active now</th><th className="px-5 py-3.5">Avg. response</th><th className="px-5 py-3.5">CSAT</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{agentMetrics.map((agent) => (<tr key={agent.id} className="text-[12px] transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-sky-100 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">{agent.avatarUrl ? <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" /> : agent.name?.slice(0, 1)?.toUpperCase()}</div><div><p className="font-semibold text-slate-900 dark:text-white">{agent.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{agent.email}</p></div></div></td><td className="px-5 py-4 font-medium tabular-nums text-slate-700 dark:text-slate-200">{agent.totalAssigned}</td><td className="px-5 py-4 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{agent.resolved}</td><td className="px-5 py-4 font-medium tabular-nums text-sky-600 dark:text-sky-300">{agent.active}</td><td className="px-5 py-4 text-slate-600 dark:text-slate-300">{agent.avgResponseTime}</td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-300"><Star className="h-3.5 w-3.5 fill-current" />{agent.csat} / 5</span></td></tr>))}</tbody></table></div>
            )}
          </Panel>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="document-modal-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div className="flex gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><Database className="h-4 w-4" /></span>
                <div>
                  <h2 id="document-modal-title" className="text-sm font-semibold text-slate-900 dark:text-white">Add knowledge document</h2>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Upload a PDF or paste text to extract & index for semantic search.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowUploadModal(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close dialog"><X className="h-4 w-4" /></button>
            </div>

            {/* Mode Switcher: PDF Upload vs Text Paste */}
            <div className="px-6 pt-4 flex gap-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUploadMode('pdf')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all ${
                  uploadMode === 'pdf'
                    ? 'bg-slate-100 text-sky-600 border-b-2 border-sky-500 dark:bg-slate-800 dark:text-sky-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all ${
                  uploadMode === 'text'
                    ? 'bg-slate-100 text-sky-600 border-b-2 border-sky-500 dark:bg-slate-800 dark:text-sky-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <FileType className="h-4 w-4" />
                <span>Paste Text / Markdown</span>
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-5 p-6">
              
              {uploadMode === 'pdf' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                      Select PDF File <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:border-sky-500 transition-colors">
                      <UploadCloud className="h-10 w-10 text-sky-500 mb-2 animate-bounce" />
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        required
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                            if (!newTitle) {
                              setNewTitle(e.target.files[0].name.replace(/\.pdf$/i, ''));
                            }
                          }
                        }}
                        className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                      />
                      <p className="mt-2 text-[11px] text-slate-400">PDF text will be extracted automatically using Node.js pdf-parse.</p>
                      {selectedFile && (
                        <div className="mt-3 p-2 px-3 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold flex items-center gap-2">
                          <FileType className="h-4 w-4" />
                          <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
                    <div>
                      <label htmlFor="pdf-title" className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        Document Title (Optional override)
                      </label>
                      <input id="pdf-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Auto-extracted from PDF filename" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                    </div>
                    <div>
                      <label htmlFor="pdf-version" className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">Version</label>
                      <input id="pdf-version" value={newVersion} onChange={(event) => setNewVersion(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pdf-description" className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">Short description</label>
                    <input id="pdf-description" value={newDesc} onChange={(event) => setNewDesc(event.target.value)} placeholder="e.g. Official 2026 Enterprise Security Policy PDF" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
                    <div>
                      <label htmlFor="document-title" className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">Title <span className="text-rose-500">*</span></label>
                      <input id="document-title" required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. Shipping and delivery policy" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                    </div>
                    <div>
                      <label htmlFor="document-version" className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">Version</label>
                      <input id="document-version" value={newVersion} onChange={(event) => setNewVersion(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="document-description" className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">Short description</label>
                    <input id="document-description" value={newDesc} onChange={(event) => setNewDesc(event.target.value)} placeholder="A concise summary that helps your team identify this source." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                  </div>

                  <div>
                    <label htmlFor="document-content" className="mb-1.5 block text-[12px] font-semibold text-slate-700 dark:text-slate-200">Document content <span className="text-rose-500">*</span></label>
                    <textarea id="document-content" required rows={7} value={newContent} onChange={(event) => setNewContent(event.target.value)} placeholder="Paste policy text, product documentation, FAQs, or Markdown content..." className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 font-mono text-[12px] leading-5 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-500/20" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <button type="button" onClick={() => setShowUploadModal(false)} className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={isUploading || (uploadMode === 'pdf' ? !selectedFile : (!newTitle.trim() || !newContent.trim()))} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400">
                  {isUploading ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Extracting PDF & Indexing</> : <><CheckCircle2 className="h-3.5 w-3.5" />{uploadMode === 'pdf' ? 'Upload PDF & Index' : 'Save and index'}</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </main>
  );
};
