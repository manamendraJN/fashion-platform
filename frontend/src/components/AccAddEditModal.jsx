import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Loader2, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { ACC_CATEGORIES, ACC_COLORS, ACC_GENDERS, ACC_SEASONS, ACC_USAGES } from '../data/mockData';
import { cn } from '../lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// ── Category + Color → allowed seasons ──────────────────────
const DARK_COLORS = ['Black','Navy Blue','Brown','Maroon','Burgundy','Dark Green',
                     'Coffee','Charcoal','Dark Grey','Grey','Olive','Purple','Teal'];

function getAllowedSeasons(category, color) {
  const cat = (category || '').toLowerCase();
  const isSunglasses = cat.includes('sunglass') || cat.includes('eyewear');
  const isHatCap     = cat.includes('hat') || cat.includes('headwear') || cat.includes('cap');

  if (isSunglasses) {
    // Sunglasses → Summer & Fall only
    return ['Summer', 'Fall'];
  }
  if (isHatCap) {
    // Dark color hats → Winter only
    // Light color hats → Summer only
    // If no color selected yet → show all
    if (!color) return null; // no restriction yet
    const isDark = DARK_COLORS.includes(color);
    return isDark ? ['Winter'] : ['Summer'];
  }
  return null; // no restriction — show all seasons
}

const FIELD = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

const SELECT = ({ value, onChange, options, placeholder, highlight }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className={cn(
      'w-full px-3 py-2.5 border rounded-xl text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/30 focus:border-[#8B5A5A] appearance-none cursor-pointer transition-all',
      highlight ? 'bg-green-50 border-green-300' : 'bg-[#FAF8F5] border-[#E5E0D8]'
    )}>
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const INPUT = ({ value, onChange, placeholder, type = 'text' }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/30 focus:border-[#8B5A5A]" />
);

export function AddEditModal({ open, item, onClose, onSave }) {
  const blank = { name:'', category:'', color:'', gender:'', usage:'', season:'', brand:'', image:'' };
  const [form, setForm]             = useState(blank);
  const [imagePreview, setImagePreview] = useState('');
  const [detecting, setDetecting]   = useState(false);
  const [detected, setDetected]     = useState(false);
  const [detectError, setDetectError] = useState('');
  const [autoFields, setAutoFields] = useState([]);
  const [topColors, setTopColors]     = useState([]);  // top-3 from model

  useEffect(() => {
    if (item) { setForm({ ...item }); setImagePreview(item.image || ''); }
    else      { setForm(blank); setImagePreview(''); setDetected(false); setAutoFields([]); setDetectError(''); setTopColors([]); }
  }, [item, open]);

  const set = key => val => setForm(prev => {
    const next = { ...prev, [key]: val };
    // Auto-clear season if new category/color makes it invalid
    if (key === 'category' || key === 'color') {
      const allowed = getAllowedSeasons(
        key === 'category' ? val : next.category,
        key === 'color'    ? val : next.color
      );
      if (allowed && next.season && !allowed.includes(next.season)) {
        next.season = ''; // reset invalid season
      }
    }
    return next;
  });

  // Compute allowed seasons for current form state
  const allowedSeasons = getAllowedSeasons(form.category, form.color);
  const seasonOptions  = allowedSeasons
    ? (ACC_SEASONS || []).filter(s => allowedSeasons.includes(s))
    : (ACC_SEASONS || []);
  const seasonHint = allowedSeasons
    ? `Only: ${allowedSeasons.join(' & ')}`
    : null;

  const processFile = useCallback(async (file) => {
    if (!file) return;
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    setImagePreview(base64);
    setForm(prev => ({ ...prev, image: base64 }));
    setDetected(false);
    setDetectError('');
    setAutoFields([]);
    setTopColors([]);

    setDetecting(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetch(`${API}/api/classify-accessory`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Detection failed');
      const filled = [];
      setForm(prev => {
        const next = { ...prev };
        if (data.category) { next.category = data.category; filled.push('category'); }
        if (data.color)    { next.color    = data.color;    filled.push('color');    }
        if (data.gender)   { next.gender   = data.gender;   filled.push('gender');   }
        if (data.usage)    { next.usage    = data.usage;    filled.push('usage');    }
        if (data.season) {
          // Only apply AI season if it's allowed for this category+color
          const aiAllowed = getAllowedSeasons(next.category, next.color);
          if (!aiAllowed || aiAllowed.includes(data.season)) {
            next.season = data.season; filled.push('season');
          } else if (aiAllowed?.length > 0) {
            next.season = aiAllowed[0]; filled.push('season'); // snap to first valid
          }
        }
        return next;
      });
      setAutoFields(filled);
      setDetected(true);
      // Store top-1 color prediction for display
      if (data.top_colors && data.top_colors.length > 0) {
        setTopColors(data.top_colors.slice(0, 1));
      }
    } catch (err) {
      setDetectError('Backend not connected — fill fields manually.');
    } finally {
      setDetecting(false);
    }
  }, []);

  const handleImage = (e) => { processFile(e.target.files[0]); };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback(files => { if (files[0]) processFile(files[0]); }, [processFile]),
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    noClick: true,   // click handled by hidden file input label below
  });

  const handleSave = () => {
    if (!form.name || !form.category) return alert('Name and Category are required.');
    onSave({ ...form });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
              <h2 className="font-serif text-lg font-semibold text-[#2C2C2C]">
                {item ? 'Edit Accessory' : 'Add New Accessory'}
              </h2>
              <button onClick={onClose} className="p-1.5 hover:bg-[#F5F2EE] rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

              {/* Image + auto-detect */}
              <FIELD label="Item Photo">
                <div {...getRootProps()} className={cn(
                  'w-full h-40 border-2 border-dashed rounded-xl overflow-hidden transition-all relative',
                  isDragActive
                    ? 'border-[#8B5A5A] bg-[#8B5A5A]/5 scale-[1.01]'
                    : 'border-[#E5E0D8] hover:border-[#8B5A5A]/50 hover:bg-[#FAF8F5]'
                )}>
                  <input {...getInputProps()} />
                  {imagePreview ? (
                    <label className="block w-full h-full cursor-pointer">
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">Click or drop to change</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                    </label>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer gap-2">
                      {isDragActive ? (
                        <>
                          <Upload className="h-7 w-7 text-[#8B5A5A] animate-bounce" />
                          <span className="text-sm font-medium text-[#8B5A5A]">Drop image here</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-gray-400" />
                          <span className="text-xs text-gray-400">Drop image here, or <span className="text-[#8B5A5A] underline underline-offset-2">click to browse</span></span>
                          <span className="text-[10px] text-gray-300">AI auto-fills category, color, gender & more</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                    </label>
                  )}
                </div>

                <AnimatePresence>
                  {detecting && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      className="mt-2 flex items-center gap-2 text-xs text-[#8B5A5A] bg-[#FFF5F0] px-3 py-2 rounded-lg border border-[#F0D8D0]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Running...
                    </motion.div>
                  )}
                  {/* {detected && !detecting && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      AI filled: <strong>{autoFields.join(', ')}</strong> — green fields are auto-detected. Edit if needed.
                    </motion.div>
                  )} */}
                  {detectError && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                      className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                      ⚠️ {detectError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </FIELD>

              <FIELD label="Item Name">
                <INPUT value={form.name} onChange={set('name')} placeholder="e.g. Gold Pearl Necklace" />
              </FIELD>

              <div className="grid grid-cols-2 gap-3">
                <FIELD label={autoFields.includes('category') ? 'Category ✦ AI' : 'Category'}>
                  <SELECT value={form.category} onChange={set('category')} options={ACC_CATEGORIES}
                    placeholder="Select category" highlight={autoFields.includes('category')} />
                </FIELD>
                <FIELD label={autoFields.includes('color') ? 'Color ✦ AI — verify below' : 'Color'}>
                  <SELECT value={form.color} onChange={set('color')} options={ACC_COLORS}
                    placeholder="Select color" highlight={autoFields.includes('color')} />
                  {/* Top-3 AI color suggestions — click to apply */}
                  {/* {topColors.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Sparkles className="h-2.5 w-2.5 text-[#8B5A5A] flex-shrink-0" />
                      <span className="text-[10px] text-gray-400">AI detected:</span>
                      <span className="text-[10px] font-medium text-[#8B5A5A]">
                        {topColors[0].label} ({Math.round(topColors[0].score * 100)}%)
                      </span>
                      <span className="text-[10px] text-gray-300">— change above if wrong</span>
                    </div>
                  )} */}
                </FIELD>
                <FIELD label={autoFields.includes('gender') ? 'Gender ✦ AI' : 'Gender'}>
                  <SELECT value={form.gender} onChange={set('gender')} options={ACC_GENDERS}
                    placeholder="Select gender" highlight={autoFields.includes('gender')} />
                </FIELD>
                <FIELD label={autoFields.includes('usage') ? 'Usage ✦ AI' : 'Usage'}>
                  <SELECT value={form.usage} onChange={set('usage')} options={ACC_USAGES}
                    placeholder="Select usage" highlight={autoFields.includes('usage')} />
                </FIELD>
                <FIELD label={autoFields.includes('season') ? 'Season ✦ AI' : (seasonHint ? `Season — ${seasonHint}` : 'Season')}>
                  <SELECT value={form.season} onChange={set('season')} options={seasonOptions}
                    placeholder="Select season" highlight={autoFields.includes('season')} />
                </FIELD>
                <FIELD label="Brand">
                  <INPUT value={form.brand} onChange={set('brand')} placeholder="e.g. Fossil" />
                </FIELD>

              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-[#E5E0D8]">
              <button onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium text-[#6B6B6B] bg-[#F5F2EE] rounded-xl hover:bg-[#E8E4DE] transition-colors">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-[#2C2C2C] rounded-xl hover:bg-black transition-colors">
                {item ? 'Save Changes' : 'Add to Wardrobe'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}