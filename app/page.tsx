'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  ExternalLink, 
  Trash2, 
  FolderPlus, 
  FileText, 
  AlertTriangle, 
  Download,
  ChevronRight, 
  PlusCircle, 
  ArrowLeft,
  Edit2,
  Check,
  X
} from 'lucide-react';

interface VerticalItem {
  id: string;
  name: string;
  description: string;
}

interface AttachedFile {
  id: string;
  criteria_id: string;
  file_name: string;
  file_url: string;
}

interface CriteriaItem {
  id: string;
  vertical_id: string;
  category: string;
  title: string;
  notes: string;
  files?: AttachedFile[];
}

export default function ERTHDashboard() {
  const [verticals, setVerticals] = useState<VerticalItem[]>([]);
  const [activeVertical, setActiveVertical] = useState<VerticalItem | null>(null);
  const [items, setItems] = useState<CriteriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Vertical creation & edit state
  const [showAddVertical, setShowAddVertical] = useState(false);
  const [newVerticalName, setNewVerticalName] = useState('');
  const [newVerticalDesc, setNewVerticalDesc] = useState('');
  const [editingVerticalId, setEditingVerticalId] = useState<string | null>(null);
  const [editVertName, setEditVertName] = useState('');
  const [editVertDesc, setEditVertDesc] = useState('');

  // Category & Checkpoint Form state
  const [categories, setCategories] = useState<string[]>([
    'Licenses & Legal',
    'Land & Facilities',
    'Raw Materials',
    'Finance & Tax',
    'HR & Operations',
  ]);
  const [selectedCategory, setSelectedCategory] = useState('Licenses & Legal');
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Multi-file upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadCriteriaId, setActiveUploadCriteriaId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const { data: vertData } = await supabase.from('verticals').select('*').order('created_at', { ascending: true });
    const { data: critData } = await supabase.from('criteria').select('*');
    const { data: filesData } = await supabase.from('criteria_files').select('*').order('created_at', { ascending: true });

    if (vertData) setVerticals(vertData as VerticalItem[]);

    if (critData) {
      const merged: CriteriaItem[] = (critData as CriteriaItem[]).map((c) => ({
        ...c,
        files: (filesData || []).filter((f: AttachedFile) => f.criteria_id === c.id)
      }));
      setItems(merged);
    }
    setLoading(false);
  }

  // --- Vertical Handlers ---
  async function handleCreateVertical(e: React.FormEvent) {
    e.preventDefault();
    if (!newVerticalName.trim()) return;

    const { error } = await supabase.from('verticals').insert([
      { name: newVerticalName.trim(), description: newVerticalDesc.trim() }
    ]);

    if (!error) {
      setNewVerticalName('');
      setNewVerticalDesc('');
      setShowAddVertical(false);
      fetchInitialData();
    } else {
      alert('Vertical already exists or error occurred.');
    }
  }

  function startEditingVertical(vert: VerticalItem, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingVerticalId(vert.id);
    setEditVertName(vert.name);
    setEditVertDesc(vert.description || '');
  }

  async function saveVerticalEdit(vertId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const trimmedName = editVertName.trim();
    if (!trimmedName) return;

    const { error } = await supabase
      .from('verticals')
      .update({ name: trimmedName, description: editVertDesc.trim() })
      .eq('id', vertId);

    if (!error) {
      setEditingVerticalId(null);
      if (activeVertical?.id === vertId) {
        setActiveVertical(prev => prev ? { ...prev, name: trimmedName, description: editVertDesc.trim() } : null);
      }
      fetchInitialData();
    }
  }

  async function handleDeleteVertical(vertId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this business vertical and all its checklists?')) return;
    await supabase.from('verticals').delete().eq('id', vertId);
    if (activeVertical?.id === vertId) setActiveVertical(null);
    fetchInitialData();
  }

  // --- Multiple File Upload Handler ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !activeUploadCriteriaId) return;

    setUploadingId(activeUploadCriteriaId);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = file.name.split('.').pop();
      const filePath = `${activeUploadCriteriaId}-${Date.now()}-${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-docs')
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('business-docs').getPublicUrl(filePath);

        await supabase.from('criteria_files').insert([{
          criteria_id: activeUploadCriteriaId,
          file_name: file.name,
          file_url: publicUrlData.publicUrl
        }]);
      }
    }

    setUploadingId(null);
    setActiveUploadCriteriaId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchInitialData();
  }

  function triggerUpload(criteriaId: string) {
    setActiveUploadCriteriaId(criteriaId);
    fileInputRef.current?.click();
  }

  // Force download helper
  async function downloadFile(url: string, fileName: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  }

  async function removeFile(fileId: string) {
    if (!confirm('Remove this document attachment?')) return;
    await supabase.from('criteria_files').delete().eq('id', fileId);
    fetchInitialData();
  }

  async function deleteCriteria(criteriaId: string) {
    if (!confirm('Delete this criteria checkpoint completely?')) return;
    await supabase.from('criteria').delete().eq('id', criteriaId);
    fetchInitialData();
  }

  async function addCriteria(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !activeVertical) return;

    await supabase.from('criteria').insert([{
      vertical_id: activeVertical.id,
      category: selectedCategory,
      title: newTitle.trim(),
      notes: newNotes.trim()
    }]);

    setNewTitle('');
    setNewNotes('');
    fetchInitialData();
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed]);
      setSelectedCategory(trimmed);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  }

  // Scoped calculation for active vertical
  const activeItems = activeVertical ? items.filter(i => i.vertical_id === activeVertical.id) : [];
  const activeCategories = Array.from(new Set([...categories, ...activeItems.map(i => i.category)]));

  const totalCriteriaActive = activeItems.length;
  // A criteria is fulfilled if it has at least 1 document uploaded
  const fulfilledCriteriaActive = activeItems.filter(i => (i.files?.length || 0) > 0).length;
  const missingCriteriaActive = activeItems.filter(i => (i.files?.length || 0) === 0);
  const activeReadiness = totalCriteriaActive ? Math.round((fulfilledCriteriaActive / totalCriteriaActive) * 100) : 0;

  // Global enterprise stats
  const totalEnterprise = items.length;
  const fulfilledEnterprise = items.filter(i => (i.files?.length || 0) > 0).length;
  const overallEnterpriseReadiness = totalEnterprise ? Math.round((fulfilledEnterprise / totalEnterprise) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 font-sans">
      {/* File input supporting multiple document selection */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Global ERTH Brand Header */}
        <header className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/icon.png" 
              alt="ERTH Logo" 
              className="h-16 w-auto rounded-xl bg-white p-1 object-contain shadow-sm" 
            />
            <div>
              <span className="text-xs tracking-widest font-bold text-emerald-400 uppercase">Holding Group</span>
              <h1 className="text-3xl font-black tracking-tight">ERTH</h1>
              <p className="text-slate-400 text-xs">Central Corporate Multi-Vertical Operating Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verticals</span>
              <p className="text-xl font-bold text-white">{verticals.length}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Group Readiness</span>
              <p className="text-xl font-bold text-emerald-400">{overallEnterpriseReadiness}%</p>
            </div>
          </div>
        </header>

        {/* VIEW 1: ERTH VERTICALS OVERVIEW */}
        {!activeVertical ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Corporate Business Verticals</h2>
                <p className="text-xs text-slate-500">Select any business vertical to manage checkpoints and documents.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVertical(!showAddVertical)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                <PlusCircle size={16} /> Add New Vertical
              </button>
            </div>

            {showAddVertical && (
              <form onSubmit={handleCreateVertical} className="bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add New Vertical to ERTH</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Vertical Name (e.g. ERTH Energy, ERTH Logistics)"
                    value={newVerticalName}
                    onChange={(e) => setNewVerticalName(e.target.value)}
                    className="border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Short description / purpose"
                    value={newVerticalDesc}
                    onChange={(e) => setNewVerticalDesc(e.target.value)}
                    className="border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddVertical(false)}
                    className="text-xs bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700"
                  >
                    Save Vertical
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verticals.map((vert) => {
                const vertItems = items.filter(i => i.vertical_id === vert.id);
                const total = vertItems.length;
                const fulfilled = vertItems.filter(i => (i.files?.length || 0) > 0).length;
                const pendingCount = total - fulfilled;
                const percent = total ? Math.round((fulfilled / total) * 100) : 0;
                const isEditing = editingVerticalId === vert.id;

                return (
                  <div
                    key={vert.id}
                    onClick={() => !isEditing && setActiveVertical(vert)}
                    className="bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Vertical
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => startEditingVertical(vert, e)}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Vertical Name"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteVertical(vert.id, e)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Delete vertical"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editVertName}
                            onChange={(e) => setEditVertName(e.target.value)}
                            className="w-full border border-blue-400 rounded-lg p-2 text-sm font-bold bg-white"
                          />
                          <input
                            type="text"
                            value={editVertDesc}
                            onChange={(e) => setEditVertDesc(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                          />
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={(e) => saveVerticalEdit(vert.id, e)}
                              className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 cursor-pointer"
                            >
                              <Check size={13} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingVerticalId(null); }}
                              className="flex items-center gap-1 bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-300 cursor-pointer"
                            >
                              <X size={13} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition">
                            {vert.name}
                          </h3>
                          {vert.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{vert.description}</p>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-600">{fulfilled}/{total} Checkpoints</span>
                          <span className={`font-bold ${percent === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {percent}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${percent === 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[11px] font-bold ${pendingCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {pendingCount > 0 ? `${pendingCount} Incomplete` : 'All Documents Verified'}
                          </span>
                          <span className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition">
                            Open Vault <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VIEW 2: DEDICATED VERTICAL DOCUMENT CHECKLIST */
          <div className="space-y-6">
            
            <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setActiveVertical(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to ERTH Verticals Hub
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Viewing:</span>
                <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {activeVertical.name}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{activeVertical.name} Checklist</h2>
                <p className="text-slate-500 text-xs mt-0.5">{activeVertical.description || 'Dedicated business unit documentation'}</p>
              </div>

              <div className="flex gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center w-24">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Fulfilled</span>
                  <p className="text-xl font-black text-emerald-700">{fulfilledCriteriaActive}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-center w-24">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Pending</span>
                  <p className="text-xl font-black text-rose-700">{missingCriteriaActive.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center w-28">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Readiness</span>
                  <p className="text-xl font-black text-blue-700">{activeReadiness}%</p>
                </div>
              </div>
            </div>

            {missingCriteriaActive.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-950">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold text-sm">Action Needed: {missingCriteriaActive.length} Criteria Not Fulfilled in this Vertical</p>
                  <p className="text-xs text-rose-700 mt-1">
                    Missing documents for: {missingCriteriaActive.map(m => `"${m.title}"`).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Add Criteria Form */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Checkpoint to {activeVertical.name}</h3>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus size={14} /> {showAddCategory ? 'Close' : '+ New Category Type'}
                </button>
              </div>

              {showAddCategory && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex gap-2">
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              )}

              <form onSubmit={addCriteria} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2.5 text-sm bg-white font-medium"
                >
                  {activeCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Document Criteria (e.g. Land Survey 2026)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2.5 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Notes or requirements"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2.5 text-sm"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg py-2.5 cursor-pointer shadow-xs"
                >
                  Add Checkpoint
                </button>
              </form>
            </div>

            {/* List of Criteria by Category with Multiple Files Support */}
            <div className="space-y-6">
              {activeCategories.map((cat) => {
                const catItems = activeItems.filter(i => i.category === cat);
                if (catItems.length === 0) return null;

                const isCatComplete = catItems.length > 0 && catItems.every(i => (i.files?.length || 0) > 0);
                const missingInCat = catItems.filter(i => (i.files?.length || 0) === 0);

                return (
                  <div key={cat} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">{cat}</h4>
                        <p className="text-xs text-slate-500">
                          {catItems.filter(i => (i.files?.length || 0) > 0).length} of {catItems.length} complete
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        isCatComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isCatComplete ? 'Category Complete' : `${missingInCat.length} Missing`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {catItems.map((item) => {
                        const fileCount = item.files?.length || 0;
                        const isFulfilled = fileCount > 0;

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl border flex flex-col gap-3 transition ${
                              isFulfilled ? 'bg-white border-slate-200' : 'bg-rose-50/70 border-rose-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {isFulfilled ? (
                                    <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                                  ) : (
                                    <AlertCircle className="text-rose-600 shrink-0" size={18} />
                                  )}
                                  <span className={`text-sm ${isFulfilled ? 'font-medium text-slate-900' : 'font-bold text-rose-950'}`}>
                                    {item.title}
                                  </span>
                                  {!isFulfilled ? (
                                    <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                      NO FILES UPLOADED
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      {fileCount} {fileCount === 1 ? 'Doc' : 'Docs'} Attached
                                    </span>
                                  )}
                                </div>
                                {item.notes && <p className="text-xs text-slate-500 ml-6">{item.notes}</p>}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {/* Upload button (allows adding more docs) */}
                                <button
                                  type="button"
                                  disabled={uploadingId === item.id}
                                  onClick={() => triggerUpload(item.id)}
                                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
                                >
                                  <Upload size={13} />
                                  {uploadingId === item.id ? 'Uploading...' : '+ Upload File(s)'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteCriteria(item.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded cursor-pointer"
                                  title="Delete Criteria"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            {/* Attached files listing with direct view, download, and delete */}
                            {fileCount > 0 && (
                              <div className="ml-6 pt-2 border-t border-slate-100 space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Uploaded Documents:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {item.files?.map((f) => (
                                    <div 
                                      key={f.id}
                                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                                    >
                                      <div className="flex items-center gap-1.5 truncate mr-2">
                                        <FileText size={14} className="text-emerald-600 shrink-0" />
                                        <span className="truncate font-medium text-slate-800" title={f.file_name}>
                                          {f.file_name}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        {/* View Doc */}
                                        <a
                                          href={f.file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                          title="View in new tab"
                                        >
                                          <ExternalLink size={13} />
                                        </a>

                                        {/* Direct Download File */}
                                        <button
                                          type="button"
                                          onClick={() => downloadFile(f.file_url, f.file_name)}
                                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                                          title="Direct download to device"
                                        >
                                          <Download size={13} />
                                        </button>

                                        {/* Delete File */}
                                        <button
                                          type="button"
                                          onClick={() => removeFile(f.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                          title="Remove file"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
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
          </div>
        )}
      </div>
    </div>
  );
}
