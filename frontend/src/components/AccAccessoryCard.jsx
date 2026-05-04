import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Pencil, Trash2, Tag, CheckCircle, XCircle, Activity, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export function AccessoryCard({ item, index = 0, onToggleFavourite, onToggleAvailability, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showUsage, setShowUsage]         = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group relative bg-white rounded-2xl overflow-hidden border border-[#E5E0D8] shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-[#F5F2EE] relative">
        <img
          src={item.image || `https://placehold.co/400x400/FAF8F5/8B5A5A?text=${encodeURIComponent(item.category)}`}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Favourite button */}
        <button
          onClick={() => onToggleFavourite?.(item.id)}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-200 shadow-sm',
            item.isFavourite
              ? 'bg-[#8B5A5A] text-white'
              : 'bg-white/80 text-gray-400 hover:text-[#8B5A5A]'
          )}
        >
          <Heart className={cn('h-3.5 w-3.5', item.isFavourite && 'fill-current')} />
        </button>

        {/* Category badge */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-[#2C2C2C]">
          {item.category}
        </div>

        {/* Availability badge */}
        {item.isAvailable === false && (
          <div className="absolute bottom-3 right-3 bg-red-500/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-white">
            Unavailable
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className=" text-base font-medium text-[#2C2C2C] truncate mb-1">{item.name}</h3>
        <p className="text-xs text-gray-500 mb-2">
          {[item.brand, item.color, item.gender].filter(Boolean).join(' · ')}
        </p>

        {/* Usage tag + tracker button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Tag className="h-3 w-3 text-[#8B5A5A]" />
            <span className="text-xs text-gray-500">{item.usage}</span>
          </div>
          <button
            onClick={() => setShowUsage(v => !v)}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
              showUsage
                ? 'bg-[#8B5A5A] text-white'
                : 'bg-[#F5F2EE] text-[#8B5A5A] hover:bg-[#EDE8E3]'
            )}
          >
            <Activity className="h-2.5 w-2.5" />
            {item.usage_count ?? 0}× used
          </button>
        </div>

        {/* Usage detail panel */}
        <AnimatePresence>
          {showUsage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl px-3 py-2.5 mb-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Activity className="h-3 w-3 text-[#8B5A5A]" />
                  <span className="text-gray-600">Total uses:</span>
                  <span className="font-semibold text-[#2C2C2C]">{item.usage_count ?? 0} times</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-[#8B5A5A]" />
                  <span className="text-gray-600">Last used:</span>
                  <span className="font-semibold text-[#2C2C2C]">
                    {item.last_used_date ? formatDate(item.last_used_date) : 'Never used'}
                  </span>
                </div>
                {item.added_date && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 ml-5">Added: {formatDate(item.added_date)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-[#F0ECE8]">
          <button onClick={() => onEdit?.(item)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#2C2C2C] hover:bg-[#F5F2EE] rounded-lg transition-colors">
            <Pencil className="h-3 w-3" /> Edit
          </button>

          <button
            onClick={() => onToggleAvailability?.(item.id, !item.isAvailable)}
            title={item.isAvailable === false ? 'Mark available' : 'Mark unavailable'}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg transition-colors',
              item.isAvailable === false
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
            )}>
            {item.isAvailable === false
              ? <><CheckCircle className="h-3 w-3" /> Avail.</>
              : <><XCircle className="h-3 w-3" /> Unavail.</>}
          </button>

          {confirmDelete ? (
            <div className="flex gap-1 flex-1">
              <button onClick={() => { onDelete?.(item.id); setConfirmDelete(false); }}
                className="flex-1 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg">Yes</button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}