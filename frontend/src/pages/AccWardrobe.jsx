import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/AccLayout';
import { AccessoryCard } from '../components/AccAccessoryCard';
import { AddEditModal } from '../components/AccAddEditModal';
import { useWardrobe } from '../context/WardrobeContext';
import { ACC_CATEGORIES, ACC_COLORS, ACC_GENDERS, ACC_USAGES } from '../data/mockData';
import { Plus, Search, SlidersHorizontal, Heart, X, AlertCircle, Loader2,
         RefreshCw, Trash2, Calendar, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';


const SELECT = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className="px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/20 focus:border-[#8B5A5A] appearance-none cursor-pointer">
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

// ── Look Preview Modal ──
function LookPreviewModal({ look, onClose }) {
  const accs = look.accessory_data || [];
  const [imgIdx, setImgIdx] = useState(0);
  const allImages = [
    look.dress_image && { src: look.dress_image, label: '👗 Dress' },
    ...accs.map(a => ({ src: a.image || '', label: `💎 ${a.category || a.name}` })),
  ].filter(Boolean);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E0D8]">
            <div>
              <h2 className="font-serif text-base font-semibold text-[#2C2C2C]">{look.name}</h2>
              <div className="flex gap-2 mt-1">
                {look.occasion && <span className="text-[10px] px-2 py-0.5 bg-[#F5F2EE] text-gray-500 rounded-full">{look.occasion}</span>}
                {look.gender   && <span className="text-[10px] px-2 py-0.5 bg-[#F5F2EE] text-gray-500 rounded-full">{look.gender}</span>}
                <span className="text-[10px] px-2 py-0.5 bg-[#F5F2EE] text-gray-500 rounded-full flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(look.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#F5F2EE] rounded-full transition-colors">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="p-5 flex gap-5">
            {/* Left — image carousel */}
            <div className="flex-1 space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-[#F5F2EE] h-72">
                {allImages[imgIdx]?.src ? (
                  <img src={allImages[imgIdx].src} alt={allImages[imgIdx].label}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
                )}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2.5 py-0.5 rounded-full">
                  {allImages[imgIdx]?.label}
                </div>
                {allImages.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx(p => (p - 1 + allImages.length) % allImages.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white transition-colors">
                      <ChevronLeft className="h-4 w-4 text-[#2C2C2C]" />
                    </button>
                    <button onClick={() => setImgIdx(p => (p + 1) % allImages.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white transition-colors">
                      <ChevronRight className="h-4 w-4 text-[#2C2C2C]" />
                    </button>
                  </>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={cn('flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all',
                        i === imgIdx ? 'border-[#8B5A5A]' : 'border-transparent hover:border-[#E5E0D8]')}>
                      {img.src ? (
                        <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#F5F2EE] flex items-center justify-center text-[8px] text-gray-400 text-center p-1">{img.label}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right — accessories list */}
            <div className="w-48 space-y-2">
              <p className="text-xs font-semibold text-[#2C2C2C] mb-2">Items in this look</p>
              {accs.length === 0 ? (
                <p className="text-xs text-gray-400">No accessories saved</p>
              ) : accs.map((acc, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 bg-[#FAF8F5] rounded-xl border border-[#E5E0D8]">
                  {acc.image ? (
                    <img src={acc.image} alt={acc.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#E8E4DE] flex items-center justify-center flex-shrink-0 text-[10px] text-gray-400">{(acc.category||'?')[0]}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[#2C2C2C] truncate">{acc.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{acc.category}</p>
                    <p className="text-[10px] text-gray-400">{acc.color}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SavedLookCard({ look, onDelete, onPreview }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const accs = look.accessory_data || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#E5E0D8] shadow-sm overflow-hidden cursor-pointer group hover:shadow-md hover:border-[#8B5A5A]/30 transition-all"
      onClick={() => onPreview(look)}
    >
      <div className="relative flex gap-0.5 h-36 bg-[#F5F2EE]">
        {look.dress_image && (
          <img src={look.dress_image} alt="Dress"
            className="w-1/3 h-full object-cover flex-shrink-0" />
        )}
        {accs.slice(0, 4).map((acc, i) => (
          <img key={i}
            src={acc.image || `https://placehold.co/200x200/FAF8F5/8B5A5A?text=${encodeURIComponent(acc.category || 'Item')}`}
            alt={acc.name || acc.category}
            className="flex-1 h-full object-cover" />
        ))}
        {accs.length === 0 && !look.dress_image && (
          <div className="w-full flex items-center justify-center text-gray-300 text-sm">No preview</div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex items-center gap-1.5 bg-white/90 text-[#2C2C2C] text-xs font-medium px-3 py-1.5 rounded-full shadow">
            <Eye className="h-3.5 w-3.5" /> Preview Look
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-serif text-sm font-medium text-[#2C2C2C] truncate flex-1 mr-2">{look.name}</h3>
          {confirmDel ? (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => { onDelete(look.id); setConfirmDel(false); }}
                className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded-full">Yes</button>
              <button onClick={() => setConfirmDel(false)}
                className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">No</button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); setConfirmDel(true); }}
              className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
          {look.occasion && <span className="px-1.5 py-0.5 bg-[#F5F2EE] rounded-full">{look.occasion}</span>}
          {look.gender   && <span className="px-1.5 py-0.5 bg-[#F5F2EE] rounded-full">{look.gender}</span>}
          <span className="flex items-center gap-0.5">
            <Calendar className="h-2.5 w-2.5" />
            {new Date(look.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        {accs.length > 0 && (
          <p className="text-[10px] text-gray-400 mt-1 truncate">
            {accs.map(a => a.category || a.name).join(', ')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function WardrobePage() {
  const { wardrobe, loading, error, fetchWardrobe,
          addItem, updateItem, deleteItem, toggleFavourite, toggleAvailability } = useWardrobe();

  const [activeTab, setActiveTab]       = useState('wardrobe');
  const [previewLook, setPreviewLook]   = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [showFav, setShowFav]           = useState(false);
  const [search, setSearch]             = useState('');
  const [filterCat, setFilterCat]       = useState('');
  const [filterColor, setFilterColor]   = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterUsage, setFilterUsage]   = useState('');
  const [saving, setSaving]             = useState(false);
  const [looks, setLooks]               = useState([]);
  const [looksLoading, setLooksLoading] = useState(false);

  // ── Fix: /api/looks is a unique accessories route — gateway routes it
  //         directly to :5001. No scoping prefix needed.
  const fetchLooks = useCallback(async () => {
    setLooksLoading(true);
    try {
      const res = await fetch(`${API}/api/looks`);
      if (res.ok) setLooks(await res.json());
    } catch { /* backend offline */ }
    finally { setLooksLoading(false); }
  }, []);

  useEffect(() => { fetchLooks(); }, [fetchLooks]);

  // ── Fix: /api/looks/<id> DELETE — unique route, no scoping needed
  const handleDeleteLook = async (id) => {
    try {
      await fetch(`${API}/api/looks/${id}`, { method: 'DELETE' });
      setLooks(prev => prev.filter(l => l.id !== id));
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const filtered = useMemo(() => wardrobe.filter(item => {
    if (showFav && !item.isFavourite) return false;
    if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) &&
        !item.category?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat    && item.category !== filterCat)    return false;
    if (filterColor  && item.color    !== filterColor)  return false;
    if (filterGender && item.gender   !== filterGender) return false;
    if (filterUsage  && item.usage    !== filterUsage)  return false;
    return true;
  }), [wardrobe, showFav, search, filterCat, filterColor, filterGender, filterUsage]);

  const hasFilters = search || filterCat || filterColor || filterGender || filterUsage;
  const clearFilters = () => {
    setSearch(''); setFilterCat(''); setFilterColor('');
    setFilterGender(''); setFilterUsage('');
  };

  const handleEdit = (item) => { setEditItem(item); setModalOpen(true); };
  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editItem) await updateItem(editItem.id, data);
      else          await addItem(data);
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); setEditItem(null); }
  };
  const handleDelete = async (id) => {
    try { await deleteItem(id); } catch (e) { alert('Delete failed: ' + e.message); }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#2C2C2C]">My Wardrobe</h1>
          <p className="text-gray-500 mt-1">
            {wardrobe.length} accessories · {looks.length} saved looks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchWardrobe(); fetchLooks(); }} disabled={loading}
            className="p-2.5 border border-[#E5E0D8] rounded-xl text-gray-400 hover:text-[#2C2C2C] hover:bg-[#F5F2EE] transition-colors">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          {activeTab === 'wardrobe' && (
            <button onClick={() => { setEditItem(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2C2C2C] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add Accessory
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F5F2EE] rounded-2xl p-1 w-fit">
        {[
          { key: 'wardrobe', label: 'Accessories', emoji: '👜' },
          { key: 'looks',    label: 'Saved Looks', emoji: '✨' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white text-[#2C2C2C] shadow-sm'
                : 'text-gray-500 hover:text-[#2C2C2C]'
            )}>
            <span>{tab.emoji}</span>
            {tab.label}
            {tab.key === 'looks' && looks.length > 0 && (
              <span className="bg-[#8B5A5A] text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                {looks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Backend error banner */}
      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error} — Start Flask backend:
          <code className="ml-1 font-mono bg-amber-100 px-1.5 py-0.5 rounded">python app.py</code>
        </div>
      )}

      {/* ── ACCESSORIES TAB ── */}
      {activeTab === 'wardrobe' && (
        <>
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or category..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/20 focus:border-[#8B5A5A]" />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <SlidersHorizontal className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <SELECT value={filterCat}    onChange={setFilterCat}    options={ACC_CATEGORIES} placeholder="All Categories" />
              <SELECT value={filterColor}  onChange={setFilterColor}  options={ACC_COLORS}     placeholder="All Colors" />
              <SELECT value={filterGender} onChange={setFilterGender} options={ACC_GENDERS}    placeholder="All Genders" />
              <SELECT value={filterUsage}  onChange={setFilterUsage}  options={ACC_USAGES}     placeholder="All Usages" />
              <button onClick={() => setShowFav(!showFav)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                  showFav ? 'bg-[#8B5A5A] text-white border-[#8B5A5A]' : 'bg-white text-gray-500 border-[#E5E0D8] hover:border-[#8B5A5A]')}>
                <Heart className={cn('h-3.5 w-3.5', showFav && 'fill-current')} /> Favourites
              </button>
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#8B5A5A] hover:text-[#2C2C2C] transition-colors">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading wardrobe…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-4">👜</p>
              <p className="font-serif text-lg text-[#2C2C2C]">No items found</p>
              <p className="text-sm mt-1">{hasFilters ? 'Try clearing your filters' : 'Add your first accessory!'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filtered.map((item, i) => (
                <AccessoryCard
                  key={item.id} item={item} index={i}
                  onToggleFavourite={toggleFavourite}
                  onToggleAvailability={toggleAvailability}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SAVED LOOKS TAB ── */}
      {activeTab === 'looks' && (
        looksLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading saved looks…</span>
          </div>
        ) : looks.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">✨</p>
            <p className="font-serif text-lg text-[#2C2C2C]">No saved looks yet</p>
            <p className="text-sm mt-2">
              Go to <strong className="text-[#2C2C2C]">Discover</strong> → get recommendations →
              click <span className="mx-1 px-2 py-0.5 bg-[#2C2C2C] text-white rounded-lg text-xs font-medium">Complete & Save Look</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {looks.map(look => (
              <SavedLookCard key={look.id} look={look} onDelete={handleDeleteLook} onPreview={setPreviewLook} />
            ))}
          </div>
        )
      )}

      <AddEditModal
        open={modalOpen} item={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={handleSave}
      />
      {previewLook && (
        <LookPreviewModal look={previewLook} onClose={() => setPreviewLook(null)} />
      )}
    </Layout>
  );
}