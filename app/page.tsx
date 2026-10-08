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
  AlertTriangle
} from 'lucide-react';

interface CriteriaItem {
  id: string;
  category: string;
  title: string;
  document_url: string | null;
  file_name: string | null;
  uploaded_at: string | null;
  notes: string;
}

export default function Dashboard() {
  const [items, setItems] = useState<CriteriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // New criteria form
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

  // Add custom category
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadCriteriaId, setActiveUploadCriteriaId] = useState<string | null>(null);

  useEffect(() => {
    fetchCriteria();
  }, []);

  async function fetchCriteria() {
    setLoading(false);
    const { data } = await supabase.from('criteria').select('*').order('category', { ascending: true });
    if (data) {
      setItems(data as CriteriaItem[]);
      const uniqueCats = Array.from(new Set(data.map((d: CriteriaItem) => d.category)));
      setCategories(prev => Array.from(new Set([...prev, ...uniqueCats])));
    }
  }

  // Handle direct file upload to Supabase Storage
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeUploadCriteriaId) return;

    setUploadingId(activeUploadCriteriaId);

    const fileExt = file.name.split('.').pop();
    const filePath = `${activeUploadCriteriaId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase bucket 'business-docs'
    const { error: uploadError } = await supabase.storage
      .from('business-docs')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploadingId(null);
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('business-docs')
      .getPublicUrl(filePath);

    // Automatically mark as complete by storing document_url & file_name
    await supabase.from('criteria').update({
      document_url: publicUrlData.publicUrl,
      file_name: file.name,
      uploaded_at: new Date().toISOString()
    }).eq('id', activeUploadCriteriaId);

    setUploadingId(null);
    setActiveUploadCriteriaId(null);
    fetchCriteria();
  }

  function triggerUpload(criteriaId: string) {
    setActiveUploadCriteriaId(criteriaId);
    fileInputRef.current?.click();
  }

  async function removeDocument(criteriaId: string) {
    if (!confirm('Remove this uploaded document? The criteria will return to NOT COMPLETED.')) return;
    await supabase.from('criteria').update({
      document_url: null,
      file_name: null,
      uploaded_at: null
    }).eq('id', criteriaId);
    fetchCriteria();
  }

  async function deleteCriteria(criteriaId: string) {
    if (!confirm('Delete this criteria completely?')) return;
    await supabase.from('criteria').delete().eq('id', criteriaId);
    fetchCriteria();
  }

  async function addCriteria(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await supabase.from('criteria').insert([{
      category: selectedCategory,
      title: newTitle.trim(),
      notes: newNotes.trim()
    }]);

    setNewTitle('');
    setNewNotes('');
    fetchCriteria();
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

  const totalCriteria = items.length;
  const completedCriteria = items.filter(i => i.document_url !== null).length;
  const missingCriteria = items.filter(i => i.document_url === null);
  const readiness = totalCriteria ? Math.round((completedCriteria / totalCriteria) * 100) : 0;

  const currentCategories = Array.from(new Set([...categories, ...items.map(i => i.category)]));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      {/* Hidden file input for file picker */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header with Overall Status */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Document Compliance Tracker</h1>
            <p className="text-slate-500 text-sm mt-1">
              Set required criteria per category. Upload documents to fulfill each requirement.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center w-28">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Fulfilled</span>
              <p className="text-2xl font-black text-emerald-700">{completedCriteria}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-center w-28">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Missing Docs</span>
              <p className="text-2xl font-black text-rose-700">{missingCriteria.length}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center w-28">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Compliance</span>
              <p className="text-2xl font-black text-blue-700">{readiness}%</p>
            </div>
          </div>
        </div>

        {/* Global Alert for Incomplete Criteria */}
        {missingCriteria.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-950 shadow-xs">
            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-sm">Action Needed: {missingCriteria.length} Required Document(s) Not Yet Uploaded</p>
              <p className="text-xs text-rose-700 mt-1">
                Pending uploads: {missingCriteria.map(m => `"${m.title}" (${m.category})`).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Define Criteria Form */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add New Document Requirement / Criteria</h2>
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FolderPlus size={14} /> {showAddCategory ? 'Close' : '+ New Category'}
            </button>
          </div>

          {showAddCategory && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex gap-2">
              <input
                type="text"
                placeholder="New Category Name (e.g. Export Customs, Factory Inspections)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded hover:bg-blue-700 cursor-pointer"
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
              {currentCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Criteria Title (e.g. Fire NOC Certificate)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm md:col-span-1"
              required
            />
            <input
              type="text"
              placeholder="Requirement specifications / notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="border border-slate-300 rounded-lg p-2.5 text-sm"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg py-2.5 cursor-pointer"
            >
              Set Criteria
            </button>
          </form>
        </div>

        {/* Categories and Their Verification Status */}
        {loading ? (
          <p className="text-center text-slate-500 py-10 font-medium">Checking compliance...</p>
        ) : (
          <div className="space-y-6">
            {currentCategories.map((cat) => {
              const categoryItems = items.filter(i => i.category === cat);
              if (categoryItems.length === 0) return null;

              const totalCat = categoryItems.length;
              const fulfilledCat = categoryItems.filter(i => i.document_url !== null).length;
              const missingInCat = categoryItems.filter(i => i.document_url === null);
              const isCategoryFulfilled = totalCat > 0 && fulfilledCat === totalCat;

              return (
                <div key={cat} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900">{cat}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fulfilledCat} of {totalCat} required documents verified
                      </p>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      isCategoryFulfilled 
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isCategoryFulfilled ? 'Category Complete' : `${missingInCat.length} Missing`}
                    </span>
                  </div>

                  {/* Category Alert Banner */}
                  {isCategoryFulfilled ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold">
                      <CheckCircle2 className="text-emerald-600" size={18} />
                      <span>All criteria in "{cat}" have verified uploaded documents!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold">
                      <AlertCircle className="text-rose-600" size={18} />
                      <span>
                        CRITERIA NOT UPDATED: Missing uploads for {missingInCat.map(m => `"${m.title}"`).join(', ')}.
                      </span>
                    </div>
                  )}

                  {/* Checklist of Criteria */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {categoryItems.map((item) => {
                      const isUploaded = item.document_url !== null;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                            isUploaded
                              ? 'bg-white border-slate-200'
                              : 'bg-rose-50/70 border-rose-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {isUploaded ? (
                                <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                              ) : (
                                <AlertCircle className="text-rose-600 shrink-0" size={18} />
                              )}
                              <span className={`text-sm ${isUploaded ? 'font-medium text-slate-900' : 'font-bold text-rose-950'}`}>
                                {item.title}
                              </span>
                              {!isUploaded && (
                                <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                  NOT UPLOADED
                                </span>
                              )}
                            </div>
                            {item.notes && <p className="text-xs text-slate-500 ml-6">{item.notes}</p>}
                            {isUploaded && item.file_name && (
                              <p className="text-xs text-emerald-700 font-medium ml-6 flex items-center gap-1">
                                <FileText size={12} /> {item.file_name} (Uploaded)
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {isUploaded ? (
                              <>
                                <a
                                  href={item.document_url!}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline mr-2"
                                >
                                  View Doc <ExternalLink size={12} />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => removeDocument(item.id)}
                                  className="text-xs text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Remove attachment"
                                >
                                  Remove File
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={uploadingId === item.id}
                                onClick={() => triggerUpload(item.id)}
                                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
                              >
                                <Upload size={14} />
                                {uploadingId === item.id ? 'Uploading...' : 'Upload Document'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => deleteCriteria(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                              title="Delete Criteria"
                            >
                              <Trash2 size={15} />
                            </button>
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
