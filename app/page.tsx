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
  FolderPlus,
  AlertTriangle,
  FolderEdit
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Category management state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Checkpoint Form state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [title, setTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Checkpoint inline edit state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // Fetch categories
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    // Fetch documents
    const { data: docData } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: true });

    if (catData) {
      setCategories(catData as CategoryItem[]);
      if (catData.length > 0 && !selectedCategory) {
        setSelectedCategory(catData[0].name);
      }
    }
    if (docData) {
      setDocs(docData as DocumentItem[]);
    }
    setLoading(false);
  }

  // --- Category Handlers ---
  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('categories').insert([{ name: trimmed }]);
    if (!error) {
      setNewCategoryName('');
      setShowCategoryModal(false);
      fetchData();
    } else {
      alert('Category already exists or failed to save.');
    }
  }

  async function saveCategoryEdit(cat: CategoryItem) {
    const trimmed = editingCategoryName.trim();
    if (!trimmed || trimmed === cat.name) {
      setEditingCategoryId(null);
      return;
    }

    // Update in categories table
    const { error } = await supabase
      .from('categories')
      .update({ name: trimmed })
      .eq('id', cat.id);

    if (!error) {
      // Also update any existing documents under this category name
      await supabase
        .from('documents')
        .update({ category: trimmed })
        .eq('category', cat.name);

      setEditingCategoryId(null);
      fetchData();
    }
  }

  async function deleteCategory(cat: CategoryItem) {
    const associatedDocs = docs.filter(d => d.category === cat.name);
    const confirmMsg = associatedDocs.length > 0
      ? `This category contains ${associatedDocs.length} checkpoints. Deleting it will also remove all its checkpoints. Proceed?`
      : `Delete category "${cat.name}"?`;

    if (!confirm(confirmMsg)) return;

    // Delete associated docs first, then category
    await supabase.from('documents').delete().eq('category', cat.name);
    await supabase.from('categories').delete().eq('id', cat.id);
    fetchData();
  }

  // --- Checkpoint Handlers ---
  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !selectedCategory) return;

    const { error } = await supabase.from('documents').insert([
      { category: selectedCategory, title: title.trim(), status: 'Pending', document_url: documentUrl.trim(), notes: notes.trim() }
    ]);

    if (!error) {
      setTitle('');
      setDocumentUrl('');
      setNotes('');
      fetchData();
    }
  }

  async function updateDocStatus(id: string, newStatus: DocumentItem['status']) {
    await supabase.from('documents').update({ status: newStatus }).eq('id', id);
    fetchData();
  }

  async function deleteDoc(id: string) {
    if (!confirm('Are you sure you want to delete this checkpoint?')) return;
    await supabase.from('documents').delete().eq('id', id);
    fetchData();
  }

  function startEditingDoc(item: DocumentItem) {
    setEditingDocId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.document_url || '');
    setEditNotes(item.notes || '');
  }

  async function saveDocEdit(id: string) {
    await supabase
      .from('documents')
      .update({
        title: editTitle.trim(),
        document_url: editUrl.trim(),
        notes: editNotes.trim(),
      })
      .eq('id', id);

    setEditingDocId(null);
    fetchData();
  }

  // Global counts
  const totalCompleted = docs.filter(d => d.status === 'Completed').length;
  const totalPending = docs.filter(d => d.status === 'Pending').length;
  const totalInProgress = docs.filter(d => d.status === 'In Progress').length;
  const overallReadiness = docs.length ? Math.round((totalCompleted / docs.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header & High-Level Counters */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Business Document Vault</h1>
            <p className="text-slate-500 text-sm mt-1">Audit compliance status, licenses, land records, and checklists.</p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center min-w-[80px]">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Completed</span>
              <p className="text-2xl font-black text-emerald-700">{totalCompleted}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center min-w-[80px]">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">In Progress</span>
              <p className="text-2xl font-black text-amber-700">{totalInProgress}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-center min-w-[80px]">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Pending</span>
              <p className="text-2xl font-black text-rose-700">{totalPending}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Readiness</span>
              <p className="text-2xl font-black text-blue-700">{overallReadiness}%</p>
            </div>
          </div>
        </div>

        {/* Manage Categories & Add Checkpoints Controls */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Add Checkpoint to Category</h2>
            <button
              type="button"
              onClick={() => setShowCategoryModal(!showCategoryModal)}
              className="text-xs flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <FolderPlus size={15} /> {showCategoryModal ? 'Hide Category Manager' : 'Manage / Add Categories'}
            </button>
          </div>

          {/* Expandable Category Management Panel */}
          {showCategoryModal && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-600">Create New Category</h3>
              <form onSubmit={addCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name (e.g. Factory Clearances, Export Approvals)..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Create
                </button>
              </form>
            </div>
          )}

          {/* Form to add a new checkpoint */}
          <form onSubmit={addDocument} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm bg-white font-medium"
              required
            >
              <option value="" disabled>Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Checkpoint Title (e.g. Fire NOC)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm"
              required
            />
            <input
              type="url"
              placeholder="Drive / Document URL (optional)"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm"
            />
            <input
              type="text"
              placeholder="Notes or pending actions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm py-2.5 cursor-pointer shadow-xs"
            >
              <Plus size={16} /> Add Checkpoint
            </button>
          </form>
        </div>

        {/* Categories & Their Checklists */}
        {loading ? (
          <p className="text-center text-slate-500 py-10 font-medium">Loading compliance records...</p>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const categoryDocs = docs.filter(d => d.category === cat.name);
              const totalItems = categoryDocs.length;
              const completedItems = categoryDocs.filter(d => d.status === 'Completed').length;
              const pendingItems = categoryDocs.filter(d => d.status === 'Pending').length;
              const inProgressItems = categoryDocs.filter(d => d.status === 'In Progress').length;
              const isAllComplete = totalItems > 0 && completedItems === totalItems;
              const isEditingCat = editingCategoryId === cat.id;

              return (
                <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  
                  {/* Category Header with Edit/Delete */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      {isEditingCat ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => saveCategoryEdit(cat)}
                            className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700 cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="bg-slate-300 text-slate-800 p-1 rounded hover:bg-slate-400 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-extrabold text-slate-900">{cat.name}</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                            }}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                            title="Edit Category Name"
                          >
                            <FolderEdit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCategory(cat)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-slate-600">
                      {completedItems} / {totalItems} Checkpoints Done
                    </div>
                  </div>

                  {/* Category Completion Status Banner */}
                  {totalItems === 0 ? (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                      No checkpoints added to this category yet. Use the form above to add one.
                    </div>
                  ) : isAllComplete ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold shadow-xs">
                      <CheckCircle2 className="text-emerald-600" size={18} />
                      <span>COMPLETE: All {totalItems} checkpoints in this category are fulfilled and verified!</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold shadow-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-rose-600" size={18} />
                        <span>ATTENTION: {pendingItems + inProgressItems} checkpoint(s) incomplete ({pendingItems} Pending, {inProgressItems} In Progress).</span>
                      </div>
                      <span className="bg-rose-200 text-rose-800 px-2.5 py-0.5 rounded-full uppercase text-[10px] tracking-wider">
                        Action Required
                      </span>
                    </div>
                  )}

                  {/* Individual Checkpoints List */}
                  {totalItems > 0 && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {categoryDocs.map((item) => {
                        const isPending = item.status === 'Pending';
                        const isInProgress = item.status === 'In Progress';
                        const isDone = item.status === 'Completed';
                        const isEditingThisDoc = editingDocId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-xl border transition ${
                              isPending
                                ? 'bg-rose-50/60 border-rose-200'
                                : isInProgress
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            {isEditingThisDoc ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="border rounded p-1.5 text-xs bg-white"
                                    placeholder="Title"
                                  />
                                  <input
                                    type="url"
                                    value={editUrl}
                                    onChange={(e) => setEditUrl(e.target.value)}
                                    className="border rounded p-1.5 text-xs bg-white"
                                    placeholder="URL"
                                  />
                                  <input
                                    type="text"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="border rounded p-1.5 text-xs bg-white"
                                    placeholder="Notes"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => saveDocEdit(item.id)}
                                    className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded hover:bg-emerald-700 cursor-pointer"
                                  >
                                    <Check size={12} /> Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDocId(null)}
                                    className="flex items-center gap-1 bg-slate-300 text-slate-800 text-xs px-2.5 py-1 rounded cursor-pointer"
                                  >
                                    <X size={12} /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {isPending && <AlertCircle className="text-rose-600 shrink-0" size={16} />}
                                    {isInProgress && <Clock className="text-amber-600 shrink-0" size={16} />}
                                    {isDone && <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />}

                                    <span className={`text-sm ${isPending ? 'font-bold text-rose-950' : 'font-medium text-slate-900'}`}>
                                      {item.title}
                                    </span>

                                    {isPending && (
                                      <span className="bg-rose-200 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                        Pending
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
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline mr-1"
                                    >
                                      Doc <ExternalLink size={12} />
                                    </a>
                                  )}

                                  <select
                                    value={item.status}
                                    onChange={(e) => updateDocStatus(item.id, e.target.value as DocumentItem['status'])}
                                    className="text-xs border rounded-lg px-2 py-1 bg-white font-medium shadow-xs cursor-pointer"
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => startEditingDoc(item)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteDoc(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
