'use client';

import { useEffect, useState } from 'react';
import { supabase, DocumentItem } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Clock, Plus, ExternalLink } from 'lucide-react';

export default function Dashboard() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState('Licenses & Legal');
  const [title, setTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: true });
    if (!error && data) setDocs(data as DocumentItem[]);
    setLoading(false);
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from('documents').insert([
      { category, title, status: 'Pending', document_url: documentUrl, notes }
    ]);

    if (!error) {
      setTitle('');
      setDocumentUrl('');
      setNotes('');
      fetchDocs();
    }
  }

  async function updateStatus(id: string, newStatus: DocumentItem['status']) {
    await supabase.from('documents').update({ status: newStatus }).eq('id', id);
    fetchDocs();
  }

  const completedCount = docs.filter(d => d.status === 'Completed').length;
  const pendingCount = docs.filter(d => d.status === 'Pending').length;
  const inProgressCount = docs.filter(d => d.status === 'In Progress').length;
  const progressPercent = docs.length ? Math.round((completedCount / docs.length) * 100) : 0;
  const categories = Array.from(new Set(docs.map(d => d.category)));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Document Vault</h1>
            <p className="text-slate-500 text-sm mt-1">Track licenses, land approvals, and procurement compliance.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm w-28">
              <span className="text-xs text-slate-500 font-medium">Completed</span>
              <p className="text-xl font-bold text-emerald-600">{completedCount}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm w-28">
              <span className="text-xs text-slate-500 font-medium">Pending</span>
              <p className="text-xl font-bold text-rose-600">{pendingCount}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center shadow-sm w-28">
              <span className="text-xs text-slate-500 font-medium">Readiness</span>
              <p className="text-xl font-bold text-blue-600">{progressPercent}%</p>
            </div>
          </div>
        </div>

        {/* Add Checkpoint Form */}
        <form onSubmit={addDocument} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Add New Document Checkpoint</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm bg-white"
            >
              <option value="Licenses & Legal">Licenses & Legal</option>
              <option value="Land & Facilities">Land & Facilities</option>
              <option value="Raw Materials">Raw Materials</option>
              <option value="Finance & Tax">Finance & Tax</option>
              <option value="HR & Operations">HR & Operations</option>
            </select>
            <input
              type="text"
              placeholder="Document Name (e.g. Fire NOC)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm"
              required
            />
            <input
              type="url"
              placeholder="Cloud Drive URL (optional)"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm"
            />
            <input
              type="text"
              placeholder="Notes or pending action"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm"
            />
          </div>
          <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition">
            <Plus size={16} /> Add Checkpoint
          </button>
        </form>

        {/* Grouped Document List */}
        {loading ? (
          <p className="text-slate-500">Loading documents...</p>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const categoryDocs = docs.filter(d => d.category === cat);
              return (
                <div key={cat} className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-800">{cat}</h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {categoryDocs.map((item) => {
                      const isPending = item.status === 'Pending';
                      const isInProgress = item.status === 'In Progress';
                      const isDone = item.status === 'Completed';

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border transition ${
                            isPending
                              ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                              : isInProgress
                              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {isPending && <AlertCircle className="text-rose-600" size={18} />}
                              {isInProgress && <Clock className="text-amber-600" size={18} />}
                              {isDone && <CheckCircle2 className="text-emerald-600" size={18} />}
                              <span className={`font-medium ${isPending ? 'font-semibold text-rose-900' : ''}`}>
                                {item.title}
                              </span>
                              {isPending && (
                                <span className="bg-rose-200 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Missing / Pending
                                </span>
                              )}
                            </div>
                            {item.notes && <p className="text-xs text-slate-500 ml-6">{item.notes}</p>}
                          </div>

                          <div className="flex items-center gap-3 mt-3 sm:mt-0 ml-6 sm:ml-0">
                            {item.document_url && (
                              <a
                                href={item.document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                View Doc <ExternalLink size={12} />
                              </a>
                            )}
                            <select
                              value={item.status}
                              onChange={(e) => updateStatus(item.id, e.target.value as DocumentItem['status'])}
                              className="text-xs border rounded px-2 py-1 bg-white font-medium shadow-sm"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
