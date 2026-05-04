import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ChevronDown, ChevronUp, Star, Activity, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export function RecommendCard({ item, index }) {
  const [showExplain, setShowExplain] = useState(false);
  const score = Math.round((item.compatibility_score ?? item.q_value ?? 0.8) * 100);
  const usageCount   = item.usage_count ?? 0;
  const lastUsed     = item.last_used_date ?? item.lastUsedDate ?? null;
  const rank         = (item.rank_in_category ?? (index + 1));
  const rankColors   = ['bg-[#2C2C2C]', 'bg-[#8B5A5A]', 'bg-[#6B8FAB]'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl border border-[#E5E0D8] shadow-sm overflow-hidden"
    >
      {/* Image + badges */}
      <div className="relative">
        <div className="aspect-square overflow-hidden bg-[#F5F2EE]">
          <img
            src={item.image_path || item.image || `https://placehold.co/400x400/FAF8F5/8B5A5A?text=${encodeURIComponent(item.category ?? '')}`}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>



        {/* Rank badge - top left */}
        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-md z-10 ${rankColors[rank - 1] ?? 'bg-gray-400'}`}>
          #{rank}
        </div>

        {/* Score - top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
          <Star className="h-3 w-3 text-[#8B5A5A] fill-[#8B5A5A]" />
          <span className="text-xs font-semibold text-[#2C2C2C]">{score}%</span>
        </div>

        {/* Usage badge */}
        <div className={cn(
          'absolute bottom-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm',
          usageCount === 0
            ? 'bg-green-500/90 text-white'
            : usageCount <= 3
              ? 'bg-white/90 text-[#2C2C2C]'
              : 'bg-amber-500/90 text-white'
        )}>
          <Activity className="h-2.5 w-2.5" />
          {usageCount === 0 ? 'Never used' : `${usageCount}× used`}
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10px] text-[#8B5A5A] font-semibold uppercase tracking-wider mb-0.5">{item.category}</p>
        <h3 className="text-sm font-medium text-[#2C2C2C] mb-1 truncate">{item.name}</h3>
        <p className="text-xs text-gray-500 mb-2">{item.color} · {item.gender}</p>

        {/* Last used date */}
        <div className={cn(
          'flex items-center gap-1.5 text-[10px] rounded-lg px-2.5 py-1.5 mb-3',
          lastUsed
            ? 'bg-[#FAF8F5] text-gray-500 border border-[#E5E0D8]'
            : 'bg-green-50 text-green-700 border border-green-200'
        )}>
          <Calendar className="h-3 w-3 flex-shrink-0" />
          {lastUsed
            ? <span>Last used: <strong className="text-[#2C2C2C]">{formatDate(lastUsed)}</strong></span>
            : <span className="font-medium">Never used — fresh pick!</span>
          }
        </div>

        {/* Match bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Match score</span>
            <span className="font-medium text-[#2C2C2C]">{score}%</span>
          </div>
          <div className="h-1.5 bg-[#F0ECE8] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
              className="h-full bg-gradient-to-r from-[#8B5A5A] to-[#2C2C2C] rounded-full"
            />
          </div>
        </div>

        {/* Why recommended */}
        <button
          onClick={() => setShowExplain(!showExplain)}
          className="w-full flex items-center justify-between text-xs font-medium text-[#8B5A5A] hover:text-[#2C2C2C] transition-colors py-1"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Why recommended?
          </span>
          {showExplain ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showExplain && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 p-3 bg-[#FAF8F5] rounded-xl text-xs text-gray-600 space-y-1"
          >
            {(item.explanation?.reasons ?? [
              `Matches ${item.usage ?? 'your'} occasion perfectly`,
              `${item.color} complements your dress color`,
              `Appropriate for selected gender & season`,
            ]).map((r, i) => (
              <p key={i} className="flex items-start gap-1.5">
                <span className="text-[#8B5A5A] mt-0.5">✓</span> {r}
              </p>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}