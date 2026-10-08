'use client';

import { useEffect, useState } from 'react';
import { supabase, DocumentItem } from '../lib/supabase';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  FolderPlus
} from 'lucide-react';

export default function Dashboard() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Categories list
  const [categories, setCategories] = useState<string[]>([
    'Licenses & Legal',
    'Land & Facilities',
    'Raw Materials',
    'Finance & Tax',
    'HR & Operations',
  ]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // New Checkpoint Form state
  const [selectedCategory, setSelectedCategory] = useState('Licenses & Legal');
  const [title, setTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Inline Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setDocs(data as DocumentItem[]);
      // Merge any new categories found in the DB into category list
      const dbCategories = Array.from(new Set(data.map((d: DocumentItem) => d.category)));
      setCategories(prev => Array.from(new Set([...prev, ...dbCategories])));
    }
    setLoading(false);
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from('documents').insert([
      { category: selectedCategory, title, status: 'Pending', document_url: documentUrl, notes }
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

  async function deleteDocument(id: string) {
    if (!confirm('Are you sure you want to delete this document checkpoint?')) return;
    await supabase.from('documents').delete().eq('id', id);
    fetchDocs();
  }

  function startEditing(item: DocumentItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.document_url || '');
    setEditNotes(item.notes || '');
  }

  async function saveEdit(id: string) {
    await supabase
      .from('documents')
      .update({
        title: editTitle,
        document_url: editUrl,
        notes: editNotes,
      })
      .eq('id', id);

    setEditingId(null);
    fetchDocs();
  }

  function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed]);
      setSelectedCategory(trimmed);
      setNewCategoryInput('');
      setShowAddCategory(false);
    }
  }

  const completedCount = docs.filter(d => d.status === 'Completed').length;
  const pendingCount = docs.filter(d => d.status === 'Pending').length;
  const inProgressCount = docs.filter(d => d.status === 'In Progress').length;
  const progressPercent = docs.length ? Math.round((completedCount / docs.length) * 100) : 0;

  // Active categories that have items OR custom ones created
  const visibleCategories = Array.from(new Set([...categories, ...docs.map(d => d.category)]));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header & Readiness Counters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 bg-white p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Business Document Vault</h1>
            <p className="text-slate-500 text-sm mt-1">Manage corporate licenses, property records, and vendor checklists.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center w-24">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Done</span>
              <p className="text-2xl font-black text-emerald-700">{completedCount}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center w-24">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Progress</span>
              <p className="text-2xl font-black text-amber-700">{inProgressCount}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-center w-24">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Pending</span>
              <p className="text-2xl font-black text-rose-700">{pendingCount}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center w-28">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Readiness</span>
              <p className="text-2xl font-black text-blue-700">{progressPercent}%</p>
            </div>
          </div>
        </div>

        {/* Form: Add Checkpoints & Custom Types */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Add New Checkpoint</h2>
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              <FolderPlus size={14} /> {showAddCategory ? 'Close' : '+ New Category Type'}
            </button>
          </div>

          {/* Quick inline form to create brand-new category types */}
          {showAddCategory && (
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center gap-2">
              <input
                type="text"
                placeholder="Type new category name (e.g. Export Clearances, Factory Machinery)..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
              >
                Create Category
              </button>
            </div>
          )}

          <form onSubmit={addDocument} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-slate-300 rounded-lg p-2 text-sm bg-white font-medium"
            >
              {visibleCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Document Name (e.g. Pollution NOC)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm md:col-span-1"
              required
            />
            <input
              type="url"
              placeholder="Cloud / Drive URL (optional)"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm"
            />
            <input
              type="text"
              placeholder="Pending reason or notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition py-2 cursor-pointer"
            >
              <Plus size={16} /> Add Item
            </button>
          </form>
        </div>

        {/* Document Checkpoints List */}
        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading checkpoints...</p>
        ) : (
          <div className="space-y-8">
            {visibleCategories.map((cat) => {
              const categoryDocs = docs.filter(d => d.category === cat);
              if (categoryDocs.length === 0) return null;

              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-lg font-bold text-slate-800">{cat}</h3>
                    <span className="text-xs text-slate-500 font-medium">
                      {categoryDocs.filter(d => d.status === 'Completed').length} / {categoryDocs.length} Completed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {categoryDocs.map((item) => {
                      const isPending = item.status === 'Pending';
                      const isInProgress = item.status === 'In Progress';
                      const isDone = item.status === 'Completed';
                      const isEditing = editingId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border transition ${
                            isPending
                              ? 'bg-rose-50/80 border-rose-300 shadow-sm'
                              : isInProgress
                              ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                              : 'bg-white border-slate-200 shadow-xs'
                          }`}
                        >
                          {isEditing ? (
                            /* Inline Edit Form */
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="border rounded p-1.5 text-sm bg-white"
                                  placeholder="Document title"
                                />
                                <input
                                  type="url"
                                  value={editUrl}
                                  onChange={(e) => setEditUrl(e.target.value)}
                                  className="border rounded p-1.5 text-sm bg-white"
                                  placeholder="Document URL"
                                />
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="border rounded p-1.5 text-sm bg-white"
                                  placeholder="Notes"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(item.id)}
                                  className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-emerald-700 cursor-pointer"
                                >
                                  <Check size={14} /> Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="flex items-center gap-1 bg-slate-300 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded hover:bg-slate-400 cursor-pointer"
                                >
                                  <X size={14} /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Normal View */
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {isPending && <AlertCircle className="text-rose-600 shrink-0" size={18} />}
                                  {isInProgress && <Clock className="text-amber-600 shrink-0" size={18} />}
                                  {isDone && <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />}
                                  
                                  <span className={`text-sm ${isPending ? 'font-bold text-rose-950' : 'font-medium text-slate-900'}`}>
                                    {item.title}
                                  </span>

                                  {isPending && (
                                    <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                      Missing / Pending
                                    </span>
                                  )}
                                </div>
                                {item.notes && <p className="text-xs text-slate-500 ml-6">{item.notes}</p>}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {item.document_url && (
                                  <a
                                    href={item.document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline mr-2"
                                  >
                                    View <ExternalLink size={12} />
                                  </a>
                                )}

                                <select
                                  value={item.status}
                                  onChange={(e) => updateStatus(item.id, e.target.value as DocumentItem['status'])}
                                  className="text-xs border rounded-lg px-2.5 py-1.5 bg-white font-semibold shadow-xs cursor-pointer"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => startEditing(item)}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer"
                                  title="Edit Checkpoint"
                                >
                                  <Edit2 size={15} />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => deleteDocument(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                                  title="Delete Checkpoint"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          )}
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
