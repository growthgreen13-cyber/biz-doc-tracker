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
  Globe, 
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

interface CriteriaItem {
  id: string;
  vertical_id: string;
  category: string;
  title: string;
  document_url: string | null;
  file_name: string | null;
  uploaded_at: string | null;
  notes: string;
}

export default function EarthDashboard() {
  const [verticals, setVerticals] = useState<VerticalItem[]>([]);
  const [activeVertical, setActiveVertical] = useState<VerticalItem | null>(null);
  const [items, setItems] = useState<CriteriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Vertical creation state
  const [showAddVertical, setShowAddVertical] = useState(false);
  const [newVerticalName, setNewVerticalName] = useState('');
  const [newVerticalDesc, setNewVerticalDesc] = useState('');

  // Vertical editing state
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadCriteriaId, setActiveUploadCriteriaId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const { data: vertData } = await supabase.from('verticals').select('*').order('created_at', { ascending: true });
    const { data: critData } = await supabase.from('criteria').select('*');

    if (vertData && vertData.length > 0) {
      setVerticals(vertData as VerticalItem[]);
    }
    if (critData) {
      setItems(critData as CriteriaItem[]);
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
      alert('Vertical name already exists or error occurred.');
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
      .update({
        name: trimmedName,
        description: editVertDesc.trim()
      })
      .eq('id', vertId);

    if (!error) {
      setEditingVerticalId(null);
      // If we are currently inside this vertical, update the active header too
      if (activeVertical?.id === vertId) {
        setActiveVertical(prev => prev ? { ...prev, name: trimmedName, description: editVertDesc.trim() } : null);
      }
      fetchInitialData();
    } else {
      alert('Failed to update vertical name.');
    }
  }

  function cancelVerticalEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingVerticalId(null);
  }

  async function handleDeleteVertical(vertId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this business vertical and all its checklists?')) return;
    await supabase.from('verticals').delete().eq('id', vertId);
    if (activeVertical?.id === vertId) {
      setActiveVertical(null);
    }
    fetchInitialData();
  }

  // --- File Upload & Criteria Handlers ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeUploadCriteriaId) return;

    setUploadingId(activeUploadCriteriaId);
    const fileExt = file.name.split('.').pop();
    const filePath = `${activeUploadCriteriaId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('business-docs')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploadingId(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('business-docs').getPublicUrl(filePath);

    await supabase.from('criteria').update({
      document_url: publicUrlData.publicUrl,
      file_name: file.name,
      uploaded_at: new Date().toISOString()
    }).eq('id', activeUploadCriteriaId);

    setUploadingId(null);
    setActiveUploadCriteriaId(null);
    fetchInitialData();
  }

  function triggerUpload(criteriaId: string) {
    setActiveUploadCriteriaId(criteriaId);
    fileInputRef.current?.click();
  }

  async function removeDocument(criteriaId: string) {
    if (!confirm('Remove document? Status will return to NOT UPLOADED.')) return;
    await supabase.from('criteria').update({
      document_url: null,
      file_name: null,
      uploaded_at: null
    }).eq('id', criteriaId);
    fetchInitialData();
  }

  async function deleteCriteria(criteriaId: string) {
    if (!confirm('Delete this criteria?')) return;
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

  const activeItems = activeVertical ? items.filter(i => i.vertical_id === activeVertical.id) : [];
  const activeCategories = Array.from(new Set([...categories, ...activeItems.map(i => i.category)]));

  const totalCriteriaActive = activeItems.length;
  const fulfilledCriteriaActive = activeItems.filter(i => i.document_url !== null).length;
  const missingCriteriaActive = activeItems.filter(i => i.document_url === null);
  const activeReadiness = totalCriteriaActive ? Math.round((fulfilledCriteriaActive / totalCriteriaActive) * 100) : 0;

  const totalEnterpriseCriteria = items.length;
  const fulfilledEnterprise = items.filter(i => i.document_url !== null).length;
  const overallEnterpriseReadiness = totalEnterpriseCriteria ? Math.round((fulfilledEnterprise / totalEnterpriseCriteria) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Global Parent Company Header */}
        <header className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2.5 rounded-2xl text-slate-950 font-black">
              <Globe size={26} />
            </div>
            <div>
              <span className="text-xs tracking-widest font-bold text-emerald-400 uppercase">Holding Group</span>
              <h1 className="text-3xl font-black tracking-tight">EARTH</h1>
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

        {/* VIEW 1: EARTH PARENT HUB */}
        {!activeVertical ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Corporate Business Verticals</h2>
                <p className="text-xs text-slate-500">Click any vertical to manage its checkpoints, or edit its name directly.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVertical(!showAddVertical)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                <PlusCircle size={16} /> Add New Vertical
              </button>
            </div>

            {/* Form to create a new Vertical */}
            {showAddVertical && (
              <form onSubmit={handleCreateVertical} className="bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add New Vertical to Earth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Vertical Name (e.g. Earth Solar & Power, Earth Real Estate)"
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

            {/* Grid of Business Verticals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verticals.map((vert) => {
                const vertItems = items.filter(i => i.vertical_id === vert.id);
                const total = vertItems.length;
                const fulfilled = vertItems.filter(i => i.document_url !== null).length;
                const pendingCount = total - fulfilled;
                const percent = total ? Math.round((fulfilled / total) * 100) : 0;
                const isEditing = editingVerticalId === vert.id;

                return (
                  <div
                    key={vert.id}
                    onClick={() => !isEditing && setActiveVertical(vert)}
                    className="bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs
