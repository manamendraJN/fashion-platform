import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { WardrobeUpload } from '../components/WardrobeUpload';
import { ItemCard } from '../components/ItemCard';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';

const FEATURES = [
  { title: 'AI Classification', desc: 'Auto-detects clothing type, color & fabric from any photo.' },
  { title: 'Event Scoring', desc: 'Rates each piece for office, casual, wedding & more.' },
  { title: 'Smart Pairing', desc: 'Suggests perfect outfit combos from your own wardrobe.' },
  { title: 'Style Analytics', desc: 'Tracks wear frequency & evolving personal style.' },
];

export function UploadPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All Items');

  const fetchWardrobe = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/wardrobe');
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else if (data?.items && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Failed to fetch wardrobe:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardrobe();
  }, []);

  const handleUploadComplete = () => {
    fetchWardrobe();
  };

  const handleTypeUpdate = (id, type, scores) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, type, eventScores: scores } : i))
    );
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRecalculateAll = async () => {
    if (!window.confirm('Recalculate event scores for all items? This may take a moment.')) return;

    try {
      const res = await fetch('http://localhost:5000/api/wardrobe/recalculate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message || 'Scores updated successfully!'}`);
        fetchWardrobe();
      } else {
        alert('❌ Failed to recalculate scores');
      }
    } catch (err) {
      alert('❌ Error during recalculation');
      console.error(err);
    }
  };

  const filteredItems = filter === 'All Items' ? items : items.filter((item) => item.type?.includes(filter));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#E8E4DE] text-[#8B5A5A] text-sm font-medium tracking-wide uppercase mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Wardrobe Fashion AI System
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#2C2C2C] leading-tight">
            Digitize your wardrobe.
            <br />
            <span className="text-[#8B5A5A] italic">Unlock your AURA.</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your clothing items — our AI will instantly classify them, score suitability for events, and help build your personal style profile.
          </p>
        </motion.div>

        {/* Upload Section - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto mb-12"
        >
          <WardrobeUpload onUploadComplete={handleUploadComplete} />
        </motion.div>

        {/* Features Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {FEATURES.map(({ icon, title, desc }, i) => (
            <div
              key={title}
              className="flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-[#EDE8E0] hover:border-[#C8A8A8] hover:shadow-md transition-all duration-300"
            >
              <span className="text-3xl mb-3">{icon}</span>
              <h4 className="text-base font-semibold text-[#2C2C2C] mb-2">{title}</h4>
              <p className="text-sm text-[#9A9088]">{desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Wardrobe Grid */}
        <div className="border-t border-[#E5E0D8] pt-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif text-[#2C2C2C]">Your Wardrobe</h2>
              <p className="text-gray-600 mt-1">
                {loading ? 'Loading items...' : `${filteredItems.length} items analyzed and cataloged`}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRecalculateAll}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8B5A5A] to-[#A67676] text-white rounded-lg hover:shadow-md transition-all disabled:opacity-60 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Update Scores
              </button>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white border border-[#E5E0D8] text-sm rounded-lg px-4 py-2.5 text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]/30"
              >
                <option>All Items</option>
                <option>Ethnic Wear</option>
                <option>Formal</option>
                <option>Casual</option>
                <option>Active</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#8B5A5A]" />
              <p>Loading your wardrobe...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredItems.map((item, index) => (
                <ItemCard
                  key={item.id || index}
                  item={{ ...item, image: `http://localhost:5000${item.url || item.image}` }}
                  index={index}
                  onTypeUpdate={handleTypeUpdate}
                  onDelete={handleDelete}
                  showWearHistory={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-[#E5E0D8]">
              <div className="w-16 h-16 rounded-full bg-[#F0EBE4] flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👗</span>
              </div>
              <h3 className="text-xl font-serif text-[#2C2C2C] mb-2">Your wardrobe is empty</h3>
              <p className="text-gray-600 mb-6">Upload some clothing items above to get started</p>
              <button
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                className="px-6 py-3 bg-[#2C2C2C] text-white rounded-full hover:bg-black transition-colors"
              >
                Upload Now
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}