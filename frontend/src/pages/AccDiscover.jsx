import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Layout } from '../components/AccLayout';
import { RecommendCard } from '../components/AccRecommendCard';
import { ExplainableChat } from '../components/AccExplainableChat';
import { useNavigate } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { OCCASIONS, RELIGIONS, ACC_GENDERS, ACC_SIZES, OCCASION_EXCLUDED, GENDER_EXCLUDED, CASUAL_GENDER_EXCLUDED } from '../data/mockData';
import {
  Upload, Sparkles, ChevronRight, Image as ImageIcon,
  Loader2, CheckCircle2, CheckCheck, RotateCcw, BookMarked
} from 'lucide-react';
import { cn } from '../lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// ── Helpers ──
const DropField = ({ label, value, onChange, options, placeholder, highlight }) => (
  <div>
    <label className={cn('block text-xs font-semibold uppercase tracking-wider mb-1.5',
      highlight ? 'text-green-600' : 'text-[#6B6B6B]')}>
      {label}{highlight && ' ✦ AI'}
    </label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className={cn(
        'w-full px-3 py-2.5 border rounded-xl text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/30 appearance-none cursor-pointer transition-all',
        highlight ? 'bg-green-50 border-green-300 focus:border-green-500' : 'bg-white border-[#E5E0D8] focus:border-[#8B5A5A]'
      )}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// Color compatibility table (mirrors backend)
const COLOR_COMPAT = {
  "Black":     ["Silver","Gold","Red","White","Pink","Blue","Purple","Multi-color","Metallic","Grey","Copper","Burgundy","Teal"],
  "White":     ["Gold","Silver","Blue","Red","Black","Teal","Navy Blue","Multi-color","Copper","Pink","Purple","Beige","Metallic"],
  "Blue":      ["Silver","White","Gold","Teal","Navy Blue","Copper","Metallic","Grey","Black","Brown"],
  "Navy Blue": ["Silver","Gold","White","Copper","Red","Metallic","Beige","Off White","Grey"],
  "Red":       ["Gold","Black","Silver","White","Copper","Metallic","Navy Blue","Burgundy"],
  "Green":     ["Gold","Brown","Copper","Beige","Tan","Silver","White","Metallic","Black"],
  "Pink":      ["Silver","Gold","White","Purple","Metallic","Nude","Beige","Black"],
  "Purple":    ["Silver","Gold","White","Pink","Metallic","Black","Grey","Copper"],
  "Yellow":    ["Gold","Brown","Black","White","Copper","Tan","Beige","Silver"],
  "Orange":    ["Gold","Brown","Copper","Black","Tan","Beige","White","Silver"],
  "Brown":     ["Gold","Copper","Beige","Tan","White","Off White","Silver","Black"],
  "Grey":      ["Silver","Black","Blue","Metallic","White","Navy Blue","Purple","Gold"],
  "Beige":     ["Gold","Brown","Copper","White","Tan","Silver","Nude","Off White","Metallic"],
  "Maroon":    ["Gold","Silver","Copper","Black","Beige","Off White","Metallic","White"],
  "Burgundy":  ["Gold","Silver","Black","White","Copper","Beige","Metallic","Off White"],
  "Teal":      ["Silver","Gold","White","Blue","Copper","Metallic","Navy Blue","Black"],
  "Gold":      ["Black","White","Red","Navy Blue","Maroon","Brown","Burgundy","Purple","Beige"],
  "Silver":    ["Black","Blue","White","Navy Blue","Purple","Grey","Teal","Maroon"],
  "Copper":    ["Brown","Green","Beige","Maroon","Burgundy","Orange","Yellow","Tan"],
  "Metallic":  ["Black","Grey","White","Navy Blue","Blue","Burgundy","Maroon","Purple","Red"],
  "Multi-color":["Gold","Silver","Black","White","Metallic","Beige","Brown","Nude"],
  "Tan":       ["Brown","Gold","Beige","Copper","Off White","White","Green"],
  "Off White": ["Gold","Silver","Blue","Brown","Beige","Nude","Copper","Navy Blue","Black"],
  "Nude":      ["Gold","Brown","Beige","Copper","Pink","Off White","Silver","Tan","White"],
  "Coffee":    ["Gold","Copper","Brown","Beige","Tan","Off White","Silver","White"],
  "Olive":     ["Gold","Brown","Copper","Tan","Beige","Black","White","Silver"],
  "Lavender":  ["Silver","White","Gold","Purple","Pink","Metallic","Grey","Black"],
};
const UNIVERSAL_NEUTRALS = ["Gold","Silver","Metallic","Black","White"];

function colorScore(dressColor, accColor) {
  if (!dressColor || !accColor) return 0.20;
  // Normalize for comparison
  const d = dressColor.trim().toLowerCase();
  const a = accColor.trim().toLowerCase();
  // Same color = monochromatic look — fully valid ✅
  if (d === a) return 0.45;
  // Check compat table (case-insensitive)
  const compat = (COLOR_COMPAT[dressColor] || []).map(x => x.toLowerCase());
  if (compat.includes(a)) return 0.45;
  // Universal neutrals always work
  if (UNIVERSAL_NEUTRALS.map(x => x.toLowerCase()).includes(a)) return 0.30;
  return 0.0; // mismatch
}

// Fallback rule-based: top-3 per eligible category, score > 0.50 only
function generateRecs(wardrobe, { occasion, gender, dressColor }) {
  // Build exclusion list
  const excluded = [
    ...(OCCASION_EXCLUDED[occasion] ?? []),
    ...(GENDER_EXCLUDED[gender] ?? []),
    // For Casual: apply extra gender-specific exclusions
    ...(occasion === 'Casual' ? (CASUAL_GENDER_EXCLUDED[gender] ?? []) : []),
  ];

  const eligible = wardrobe.filter(item =>
    item.isAvailable !== false &&
    !excluded.includes(item.category) &&
    (!gender || item.gender === gender || item.gender === 'Unisex')
  );

  const scored = eligible.map(item => {
    const score = parseFloat(Math.min(0.99, colorScore(dressColor, item.color) + 0.30 + Math.random() * 0.15).toFixed(2));
    return {
      ...item,
      image_path: item.image,
      compatibility_score: score,
      usage_count: item.usage_count ?? 0,
      explanation: {
        reasons: [
          `Matches ${occasion || 'selected'} occasion`,
          `${item.color} color compatible with dress`,
          `${item.gender} — gender appropriate`,
          `Usage: worn ${item.usage_count ?? 0}x`,
        ],
      },
    };
  })
  // Only show items with compatibility score > 50%
  .filter(item => item.compatibility_score > 0.50)
  .sort((a, b) =>
    (b.compatibility_score - (b.usage_count ?? 0) * 0.01) -
    (a.compatibility_score - (a.usage_count ?? 0) * 0.01)
  );

  // Group top-3 per category
  const catMap = {};
  scored.forEach((item, idx) => {
    const cat = item.category;
    if (!catMap[cat]) catMap[cat] = [];
    if (catMap[cat].length < 3) {
      catMap[cat].push({ ...item, wardrobe_index: `${cat}_${idx}`, rank_in_category: catMap[cat].length + 1 });
    }
  });
  return Object.entries(catMap).map(([category, items]) => ({ category, items }));
}


// ── Save Checkbox Component ──
function SaveCheckbox({ selectedCount, checked, onChange }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <div
          onClick={onChange}
          className={cn(
            'w-4 h-4 border-2 rounded cursor-pointer transition-all flex items-center justify-center',
            checked ? 'bg-[#8B5A5A] border-[#8B5A5A]' : 'bg-white border-[#E5E0D8] hover:border-[#8B5A5A]'
          )}>
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-500 group-hover:text-[#2C2C2C] transition-colors leading-relaxed">
        Yes, save this look with <strong className="text-[#2C2C2C]">{selectedCount} selected {selectedCount === 1 ? 'item' : 'items'}</strong> to my Wardrobe's Saved Looks
      </span>
    </label>
  );
}

const TABS = ['Customize', 'Recommendations', 'Generated Look'];

export function DiscoverPage() {
  const { wardrobe, recommendations, setRecommendations,
          dressAttributes, setDressAttributes, setCurrentSession } = useWardrobe();

  const [tab, setTab]               = useState('Customize');
  const [dressPreview, setDressPreview] = useState('');
  const [occasion, setOccasion]     = useState('');
  const [religion, setReligion]     = useState('');
  const [gender, setGender]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genDone, setGenDone]       = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [genderAI, setGenderAI]     = useState(false);
  const [size, setSize]               = useState('');
  const [lookSaved, setLookSaved]     = useState(false);
  const [lookSaving, setLookSaving]   = useState(false);
  const [lookName, setLookName]       = useState('');
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [showToast, setShowToast]     = useState(false);
  const dressFileRef                  = useRef(null);
  const navigate                      = useNavigate();
  const outfitTopRef                  = useRef(null);   // scroll-to-top of Generated Look

  // ── Dress upload ──
  const onDrop = useCallback(async (files) => {
    if (!files[0]) return;
    const url = URL.createObjectURL(files[0]);
    setDressPreview(url);
    setGenderAI(false);
    setLookSaved(false);
    dressFileRef.current = files[0];
    try {
      const fd = new FormData();
      fd.append('image', files[0]);
      const res  = await fetch(`${API}/api/extract-dress-attributes`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setDressAttributes(data);
        if (data.gender && !gender) { setGender(data.gender); setGenderAI(true); }
      }
    } catch { /* backend offline */ }
  }, [gender]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, maxFiles: 1,
  });

  // ── Get Recommendations ──
  const handleRecommend = async () => {
    if (!occasion) return alert('Please select an Occasion.');
    if (!gender)   return alert('Please select Gender.');
    setLoading(true);
    setTab('Recommendations');
    setSelectedItems({});
    setLookSaved(false);
    setSize('');
    const session = { occasion, religion, gender, size, dressColor: dressAttributes?.color || '' };
    setCurrentSession(session);
    try {
      if (dressFileRef.current) {
        const fd = new FormData();
        fd.append('image', dressFileRef.current);
        fd.append('occasion', occasion);
        fd.append('religion', religion || 'None');
        fd.append('gender', gender);
        fd.append('budget', '999999');
        if (size) fd.append('size', size);
        fd.append('wardrobe', JSON.stringify(wardrobe));
        const res = await fetch(`${API}/api/full-pipeline`, { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          if (data.recommendations?.length > 0) {
            setRecommendations(data.recommendations);
            setLoading(false);
            return;
          }
        }
      }
    } catch { /* fallback */ }
    await new Promise(r => setTimeout(r, 1200));
    setRecommendations(generateRecs(wardrobe, session));
    setLoading(false);
  };

  // ── Generate Look ──
  const handleGenerateLook = async () => {
    setTab('Generated Look');
    setGenDone(false);
    setGenLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setGenLoading(false);
    setGenDone(true);
    // Scroll to top of Generated Look after render
    setTimeout(() => outfitTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // ── Save Look ──
  // ── Go Home — reset everything and navigate ──
  const handleGoHome = () => {
    setSelectedItems({});
    setGenDone(false);
    setLookSaved(false);
    setSaveConfirmed(false);
    setLookName('');
    setDressPreview('');
    setRecommendations([]);
    setOccasion('');
    setGender('');
    setReligion('');
    setTab('Customize');
    dressFileRef.current = null;
    navigate('/');
  };

  const handleSaveLook = async () => {
    // Without save (checkbox not ticked) — just scroll to top, stay on page
    if (!saveConfirmed) {
      outfitTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      return;
    }

    // Checkbox ticked — save to wardrobe, scroll to top, stay on page
    setLookSaving(true);
    try {
      let dressBase64 = '';
      if (dressFileRef.current) {
        dressBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(dressFileRef.current);
        });
      } else if (dressPreview && !dressPreview.startsWith('blob:')) {
        dressBase64 = dressPreview;
      }
      const selectedList = Object.values(selectedItems);
      const finalName = lookName.trim() || `${occasion || 'My'} Look — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
      const payload = {
        name:           finalName,
        occasion,
        gender,
        dress_image:    dressBase64,
        accessory_ids:  selectedList.map(i => i.id || i.item_id),
        accessory_data: selectedList.map(i => ({
          id: i.id || i.item_id, name: i.name, category: i.category,
          color: i.color, image: i.image || i.image_path || '',
        })),
      };
      const res = await fetch(`${API}/api/looks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      setLookSaved(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      // Scroll to top to show confirmation — stay on page
      outfitTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      alert('Could not save look: ' + e.message);
    } finally {
      setLookSaving(false);
    }
  };

  const toggleSelect = (item) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      const cur = next[item.category];
      const itemKey = item.wardrobe_index ?? item.item_id ?? item.id;
      const curKey  = cur ? (cur.wardrobe_index ?? cur.item_id ?? cur.id) : null;
      const isSame  = cur && curKey !== null && curKey !== undefined && curKey === itemKey;
      if (isSame) delete next[item.category];
      else next[item.category] = item;
      return next;
    });
  };

  const selectedCount  = Object.keys(selectedItems).length;
  const outfitImages   = [
    dressPreview,
    ...Object.values(selectedItems).map(i => i.image_path || i.image).filter(Boolean),
  ].filter(Boolean);

  return (
    <Layout>
       {/* ── Page Heading ── */}
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-[#2C2C2C]">
          AI Accessory Recommendations
        </h1>

      </div>

      <div className="flex gap-5 h-[calc(100vh-190px)]">

        {/* ── LEFT: Main Panel ── */}
        <div className="flex flex-col flex-[3] min-w-0 overflow-hidden">

          {/* Tabs */}
          <div className="flex gap-1 bg-[#F0ECE8] p-1 rounded-2xl mb-4 flex-shrink-0">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex-1 py-2 text-sm font-medium rounded-xl transition-all relative',
                  tab === t ? 'bg-white text-[#2C2C2C] shadow-sm' : 'text-[#6B6B6B] hover:text-[#2C2C2C]')}>
                {t}
                {t === 'Recommendations' && recommendations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8B5A5A] text-white text-[9px] rounded-full flex items-center justify-center">
                    {recommendations.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ══ CUSTOMIZE ══ */}
            {tab === 'Customize' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-6 h-full">
                <div className="bg-white rounded-2xl border border-[#E5E0D8] p-5 h-full">
                  <p className="text-sm font-semibold text-[#2C2C2C] mb-3">
                    1. Upload Your Dress
                    {/* <span className="ml-2 text-xs text-gray-400 font-normal">(Model 2 auto-detects gender)</span> */}
                  </p>
                  <div {...getRootProps()} className={cn(
                    'border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all',
                    isDragActive ? 'border-[#8B5A5A] bg-[#8B5A5A]/5' : 'border-[#E5E0D8] hover:border-[#8B5A5A]/50'
                  )}>
                    <input {...getInputProps()} />
                    {dressPreview ? (
                      <div className="relative w-auto h-100  items-center justify-center">
                        <img src={dressPreview} alt="dress" className="w-auto h-full object-fill place-self-center" />
                        {/* <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">Click to change</p>
                        </div> */}
                      </div>
                    ) : (
                      <div className="h-100 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Upload className="h-7 w-7" />
                        <p className="text-sm">Drop dress image here</p>
                        <p className="text-xs text-gray-300">AI extracts attributes automatically</p>
                      </div>
                    )}
                  </div>
                  {genderAI && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Model 2 detected gender: <strong>{gender}</strong> — you can change if needed.
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E5E0D8] p-5 flex flex-col justify-between h-full">
                  <div>
                    <p className="text-sm font-semibold text-[#2C2C2C] mb-4">2. Your Preferences</p>
                    <div className="grid grid-cols-2 gap-3">
                      <DropField label="Occasion" value={occasion} onChange={setOccasion} options={OCCASIONS} placeholder="Select occasion" />
                      <DropField label="Gender"   value={gender}   onChange={setGender}   options={ACC_GENDERS} placeholder="Select gender" highlight={genderAI && !!gender} />
                    </div>
                  </div>
                  <button onClick={handleRecommend} disabled={loading || !occasion || !gender}
                    className="w-full py-3.5 bg-[#2C2C2C] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 shadow-sm mt-4">
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing wardrobe...</>
                      : <><Sparkles className="h-4 w-4" /> Get AI Recommendations <ChevronRight className="h-4 w-4" /></>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ RECOMMENDATIONS ══ */}
            {tab === 'Recommendations' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Sparkles className="h-10 w-10 text-[#8B5A5A] animate-pulse" />
                    <p className="font-serif text-lg text-[#2C2C2C]">Analyzing wardrobe...</p>
                    <p className="text-sm text-gray-400">Running DQN recommendation engine</p>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">✨</p>
                    <p className="font-serif text-lg text-[#2C2C2C]">No recommendations yet</p>
                    <p className="text-sm text-gray-400 mt-1">Go to Customize and click Get AI Recommendations</p>
                  </div>
                ) : (
                  <>
                    {/* Tags row */}
                    <div className="flex flex-wrap gap-2">
                      {[occasion, gender, religion].filter(Boolean).map(tag => (
                        <span key={tag} className="text-xs px-3 py-1 bg-[#E8E4DE] text-[#2C2C2C] rounded-full font-medium">{tag}</span>
                      ))}
                      <span className="text-xs px-3 py-1 bg-[#FAF8F5] text-gray-500 rounded-full border border-[#E5E0D8]">
                        {recommendations.length} {recommendations.length === 1 ? 'category' : 'categories'} found
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-[#2C2C2C]">
                      Select your preferred item per category — top 3 matches shown:
                    </p>

                    {/* Category groups */}
                    <div className="space-y-6">
                      {recommendations.map((group) => {
                        const selItem = selectedItems[group.category];
                        return (
                          <div key={group.category} className="bg-white rounded-2xl border border-[#E5E0D8] p-4">
                            {/* Category header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#2C2C2C]">{group.category}</span>
                                <span className="text-[10px] px-2 py-0.5 bg-[#FAF8F5] text-gray-500 rounded-full border border-[#E5E0D8]">
                                  Top {group.items.length}
                                </span>
                              </div>
                              {selItem && (
                                <span className="flex items-center gap-1 text-[10px] text-[#8B5A5A] font-medium">
                                  <CheckCircle2 className="h-3 w-3" /> {selItem.name}
                                </span>
                              )}
                            </div>

                            {/* 3 cards in a row */}
                            <div className="grid grid-cols-3 gap-3">
                              {group.items.map((item, i) => {
                                // Use strict unique key: wardrobe_index must match AND be defined
                                const itemKey = item.wardrobe_index ?? item.item_id ?? item.id;
                                const selKey  = selItem ? (selItem.wardrobe_index ?? selItem.item_id ?? selItem.id) : null;
                                const isSelected = selItem !== undefined && selKey !== null && selKey !== undefined && selKey === itemKey && selItem.category === item.category;
                                return (
                                  <div key={item.wardrobe_index ?? item.item_id ?? i}
                                    onClick={() => toggleSelect(item)}
                                    className={cn(
                                      'cursor-pointer rounded-xl transition-all duration-200 ring-2 relative overflow-hidden',
                                      isSelected
                                        ? 'ring-[#8B5A5A] shadow-lg scale-[1.02]'
                                        : 'ring-transparent hover:ring-[#E5E0D8] hover:shadow-sm'
                                    )}>
                                    <RecommendCard item={item} index={i} />
                                    {/* Selected overlay — only shown after click */}
                                    {isSelected && (
                                      <div className="flex items-center justify-center gap-1 py-1.5 bg-[#8B5A5A] text-white text-[10px] font-medium">
                                        <CheckCircle2 className="h-3 w-3" /> Selected
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

                    {/* Selected summary */}
                    {selectedCount > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl p-4 space-y-2">
                        <p className="text-sm font-semibold text-[#2C2C2C]">Your Selection ({selectedCount})</p>
                        {Object.values(selectedItems).map(item => (
                          <div key={item.item_id || item.id} className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">{item.category}</span>
                            <span className="font-medium text-[#2C2C2C]">{item.name}</span>
                            <span className="text-[#8B5A5A] font-medium">{Math.round((item.compatibility_score ?? 0) * 100)}%</span>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    <button onClick={handleGenerateLook} disabled={selectedCount === 0}
                      className="w-full py-3 border-2 border-dashed border-[#8B5A5A]/50 text-[#8B5A5A] rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#8B5A5A]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <ImageIcon className="h-4 w-4" />
                      {selectedCount === 0 ? 'Select one item per category to generate look' : `Generate AI Outfit Preview (${selectedCount} items)`}
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* ══ GENERATED LOOK ══ */}
            {tab === 'Generated Look' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {genLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <ImageIcon className="h-10 w-10 text-[#8B5A5A] animate-pulse" />
                    <p className="font-serif text-lg text-[#2C2C2C]">Generating outfit preview…</p>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-2 h-2 bg-[#8B5A5A] rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                ) : genDone ? (
                  <>
                    {/* Scroll anchor */}
                    <div ref={outfitTopRef} />

                    {/* Title row with Back to Home button */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#2C2C2C]">Your Complete Outfit</p>
                      <button
                        onClick={handleGoHome}
                        className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-[#2C2C2C] text-white rounded-xl hover:bg-black transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Back to Home
                      </button>
                    </div>

                    {outfitImages.length > 0 ? (
                      <div className="grid grid-cols-5 gap-6 h-full">
                        {/* Dress — left col */}
                        <div className="col-span-2 h-full">
                          <div className="rounded-2xl overflow-hidden border border-[#E5E0D8] shadow-sm bg-[#F5F2EE]">
                            <img src={outfitImages[0]} alt="Dress" className="w-full h-140 object-cover" />
                            <p className="text-center text-xs text-gray-400 py-2">👗 Dress</p>
                          </div>
                        </div>
                        {/* Accessories — right 3 cols, 3-per-row grid */}
                        <div className="col-span-3 grid grid-cols-3 gap-8">
                          {outfitImages.slice(1).map((src, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden border border-[#E5E0D8] shadow-sm bg-[#F5F2EE] h-70">
                              <img src={src} alt={`Accessory ${i + 1}`} className="w-full h-60 object-cover" />
                              <div className="flex items-center justify-center py-2">
                                <p className="text-center text-xs text-gray-400">
                                  💎 {Object.values(selectedItems)[i]?.category ?? 'Accessory'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 rounded-2xl bg-gradient-to-br from-[#FAF8F5] to-[#E8E4DE] flex items-center justify-center border border-[#E5E0D8]">
                        <div className="text-center">
                          <p className="text-4xl mb-2">✨</p>
                          <p className="text-sm font-medium text-[#2C2C2C]">Outfit Preview</p>
                          <p className="text-xs text-gray-400 mt-1">Upload dress image to see combined look</p>
                        </div>
                      </div>
                    )}

                    {Object.values(selectedItems).length > 0 && (
                      <div className="bg-[#FAF8F5] rounded-xl border border-[#E5E0D8] p-4">
                        <p className="text-xs font-semibold text-[#2C2C2C] mb-2">Complete Look Details</p>
                        {Object.values(selectedItems).map(item => (
                          <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-[#F0ECE8] last:border-0">
                            <div>
                              <p className="text-xs font-medium text-[#2C2C2C]">{item.name}</p>
                              <p className="text-[10px] text-gray-400">{item.category} · {item.color}</p>
                            </div>
                            <p className="text-[10px] text-gray-400">{Math.round((item.compatibility_score ?? 0.8) * 100)}% match</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom row: left=save panel, right=Complete Outfit button */}
                    <div className="flex flex-col gap-4 items-start">

                      {/* LEFT — Save panel with checkbox */}
                      <div className="flex-1 w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-[#2C2C2C]">Save this look to Wardrobe</p>

                        {/* Look name input */}
                        <input
                          type="text"
                          value={lookName}
                          onChange={e => setLookName(e.target.value)}
                          placeholder={`${occasion || 'My'} Look — ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' })}`}
                          className="w-full px-3 py-2 text-xs border border-[#E5E0D8] rounded-lg bg-white text-[#2C2C2C] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/20 focus:border-[#8B5A5A]"
                        />

                        {/* Confirm checkbox */}
                        {!lookSaved ? (
                          <>
                            <SaveCheckbox
                              selectedCount={selectedCount}
                              checked={saveConfirmed}
                              onChange={() => setSaveConfirmed(p => !p)}
                            />
                            {lookSaving && (
                              <div className="flex items-center gap-2 text-xs text-[#8B5A5A]">
                                <Loader2 className="h-3 w-3 animate-spin" /> Saving your look...
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-green-700">
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span>Saved! View in <strong>Wardrobe → Saved Looks</strong></span>
                          </div>
                        )}
                      </div>

                      {/* RIGHT — Complete Outfit button (tall, right-aligned) */}
                      <button
                        onClick={handleSaveLook}
                        disabled={lookSaving || lookSaved || selectedCount === 0}
                        className={cn(
                          'flex items-center justify-center gap-2 px-6 py-5 rounded-xl font-medium text-sm transition-colors self-stretch min-w-[140px]',
                          lookSaved
                            ? 'bg-green-500 text-white cursor-default'
                            : lookSaving
                              ? 'bg-[#2C2C2C]/60 text-white cursor-wait'
                              : selectedCount === 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#2C2C2C] text-white hover:bg-black'
                        )}>
                        {lookSaved
                          ? <><CheckCheck className="h-5 w-5" /><span>Saved!</span></>
                          : lookSaving
                            ? <><Loader2 className="h-5 w-5 animate-spin" /><span>Saving…</span></>
                            : <><BookMarked className="h-5 w-5" /><span>Complete</span><span>Outfit</span></>
                        }
                      </button>
                    </div>

                    <div className="text-xs text-gray-400 bg-[#FAF8F5] rounded-lg p-3 border border-[#E5E0D8]">
                      💡 Connect a generative AI API (e.g. Stability AI / Replicate) to <strong>compose the dress + accessories into a single outfit image</strong>. Current view shows individual images side by side.
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <ImageIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Select items in Recommendations tab first, then click Generate</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Explainable AI Chat — only on Recommendations tab ── */}
        {tab === 'Recommendations' && (
          <div className="flex-[2] min-w-0 min-h-0">
            <ExplainableChat
              recommendations={recommendations}
              dressAttributes={dressAttributes}
              session={{ occasion, gender, religion }}
            />
          </div>
        )}
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#2C2C2C] text-white px-5 py-3.5 rounded-2xl shadow-2xl">
            <CheckCheck className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">{lookSaved ? 'Look saved to Wardrobe!' : 'Outfit completed!'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{lookSaved ? 'View in Wardrobe → Saved Looks' : 'Click "Back to Home" when you are done.'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}