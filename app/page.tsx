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
