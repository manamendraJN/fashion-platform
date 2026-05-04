import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Sparkles, User, X } from 'lucide-react';
import { ItemCard } from './ItemCard';

export function ChatMessage({ role, content, suggestions, timestamp, onTypeUpdate }) {
  const isUser = role === 'user';

  const [localSuggestions, setLocalSuggestions] = useState(suggestions || []);
  const [pairingResults, setPairingResults] = useState(null);
  const [isMarkingPair, setIsMarkingPair] = useState(false);
  const [selectedPairingItem, setSelectedPairingItem] = useState(null);

  const handleTypeUpdate = (itemId, newType, newEventScores) => {
    setLocalSuggestions((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, type: newType, eventScores: newEventScores } : i))
    );

    if (pairingResults) {
      setPairingResults((prev) => ({
        ...prev,
        matches: prev.matches.map((i) => (i.id === itemId ? { ...i, type: newType } : i)),
        selectedItem:
          prev.selectedItem.id === itemId ? { ...prev.selectedItem, type: newType } : prev.selectedItem,
      }));
    }

    if (onTypeUpdate) onTypeUpdate(itemId, newType, newEventScores);
  };

  const handleMarkWorn = async (item) => {
    try {
      const res = await fetch(`http://localhost:5000/api/wardrobe/${item.id}/mark-worn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion: 'Current Event', date: new Date().toISOString() }),
      });

      if (res.ok) {
        setLocalSuggestions((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, lastWorn: new Date().toISOString(), wearCount: (i.wearCount || 0) + 1 }
              : i
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFindPair = async (item) => {
    try {
      const res = await fetch(`http://localhost:5000/api/outfit-pairing/${item.id}`);
      const data = await res.json();

      if (data.success && data.matches?.length > 0) {
        setPairingResults({
          selectedItem: { ...item, image: `http://localhost:5000${item.url || item.image}` },
          category: data.pairingCategory,
          matches: data.matches.map((m) => ({ ...m, image: `http://localhost:5000${m.url}` })),
          message: data.message,
        });
      } else {
        alert(data.message || 'No matching items found in your wardrobe.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkPairAsWorn = async (pairItem) => {
    if (!pairingResults || !window.confirm(`Mark ${pairingResults.selectedItem.type} + ${pairItem.type} as worn together?`)) {
      return;
    }

    setIsMarkingPair(true);
    setSelectedPairingItem(pairItem.id);

    try {
      const res = await fetch('http://localhost:5000/api/wardrobe/mark-pair-worn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [pairingResults.selectedItem.id, pairItem.id],
          occasion: 'Outfit Pairing',
          date: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setPairingResults(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarkingPair(false);
      setSelectedPairingItem(null);
    }
  };

  // Simple markdown-like bold rendering
  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex w-full mb-8', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('flex max-w-[85%] md:max-w-[75%]', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar */}
        <div
          className={cn(
            'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1',
            isUser ? 'bg-[#2C2C2C] ml-3' : 'bg-[#8B5A5A] mr-3'
          )}
        >
          {isUser ? <User className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Message bubble */}
          <div
            className={cn(
              'px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm',
              isUser
                ? 'bg-white text-[#2C2C2C] rounded-tr-none border border-[#E5E0D8]'
                : 'bg-[#2C2C2C] text-[#FAF8F5] rounded-tl-none'
            )}
          >
            {renderContent(content)}
          </div>

          {/* Timestamp */}
          <span
            className={cn('text-[10px] text-gray-400 mt-1.5', isUser ? 'text-right' : 'text-left')}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Suggestions grid */}
          {localSuggestions?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl"
            >
              {localSuggestions.map((item, idx) => (
                <div key={item.id} className="relative">
                  <ItemCard
                    item={item}
                    index={idx}
                    showWearHistory={true}
                    onMarkWorn={handleMarkWorn}
                    onFindPair={handleFindPair}
                    onTypeUpdate={handleTypeUpdate}
                    compact={true}
                  />
                  {item.suitabilityScore && (
                    <div className="absolute -top-1.5 -right-1.5 bg-[#8B5A5A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">
                      {Math.round(item.suitabilityScore * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Pairing results panel */}
          {pairingResults && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-white rounded-2xl border border-[#EDE8E0] shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#F8F5F0] border-b border-[#EDE8E0]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8B5A5A]" />
                  <p className="text-[13px] font-semibold text-[#2C2C2C]">
                    Matching {pairingResults.category} for{' '}
                    <span className="text-[#8B5A5A]">{pairingResults.selectedItem.type}</span>
                  </p>
                </div>
                <button
                  onClick={() => setPairingResults(null)}
                  className="p-1 hover:bg-[#EDE8E0] rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-[#9A9A9A]" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-[11px] text-[#9A9A9A] mb-3">{pairingResults.message}</p>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {/* Selected item */}
                  <div className="flex-shrink-0 w-32">
                    <p className="text-[9px] font-semibold text-[#8B5A5A] uppercase tracking-wider mb-1.5 text-center">
                      Selected
                    </p>
                    <ItemCard
                      item={pairingResults.selectedItem}
                      showWearHistory={false}
                      onTypeUpdate={handleTypeUpdate}
                      compact={true}
                    />
                  </div>

                  {/* Divider */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1 text-[#C8C0B8]">
                      <div className="w-px h-8 bg-[#EDE8E0]"></div>
                      <span className="text-lg">+</span>
                      <div className="w-px h-8 bg-[#EDE8E0]"></div>
                    </div>
                  </div>

                  {/* Matches */}
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                    {pairingResults.matches.map((match, idx) => (
                      <div key={match.id} className="flex-shrink-0 w-32 flex flex-col gap-1.5">
                        <p className="text-[9px] font-semibold text-[#7A9B8E] uppercase tracking-wider text-center">
                          Match {idx + 1}
                        </p>
                        <ItemCard item={match} showWearHistory={false} onTypeUpdate={handleTypeUpdate} compact={true} />
                        <button
                          onClick={() => handleMarkPairAsWorn(match)}
                          disabled={isMarkingPair}
                          className="w-full py-1.5 bg-gradient-to-r from-[#8B5A5A] to-[#A67676] text-white text-[10px] font-semibold rounded-lg hover:shadow-md transition-all disabled:opacity-50"
                        >
                          {isMarkingPair && selectedPairingItem === match.id ? 'Marking…' : 'Wear Together'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Placeholder wrapper (replace with real AnimatePresence from framer-motion later if needed)
function AnimatePresencePairing({ children }) {
  return <>{children}</>;
}