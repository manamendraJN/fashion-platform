import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Heart, X } from 'lucide-react';

export function UserStyleProfile({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user-profile');
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <p className="text-center text-gray-500">Loading your style profile...</p>
        </div>
      </motion.div>
    );
  }

  if (!profile) return null;

  const getStyleEmoji = (style) => {
    const emojiMap = {
      casual: '👕',
      formal: '👔',
      sporty: '⚽',
      trendy: '✨',
      classic: '🎩',
      bohemian: '🌸',
      minimalist: '⚪'
    };
    return emojiMap[style] || '👗';
  };

  const getPersonalityColor = (personality) => {
    if (personality === 'Established') return 'from-purple-500 to-pink-500';
    if (personality === 'Developing') return 'from-blue-500 to-cyan-500';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif text-[#2C2C2C] flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#8B5A5A]" />
              Your Style Profile
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Style Personality Badge */}
          <div className="mb-6">
            <div className={`bg-gradient-to-r ${getPersonalityColor(profile.stylePersonality)} text-white rounded-xl p-4 text-center`}>
              <p className="text-sm opacity-90">Style Status</p>
              <p className="text-2xl font-bold mt-1">{profile.stylePersonality}</p>
              <p className="text-xs mt-2 opacity-80">
                {profile.totalInteractions} interactions • {profile.favoriteCount} favorites
              </p>
            </div>
          </div>

          {/* Style Preferences */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Style Preferences
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(profile.stylePreferences || {}).map(([style, score]) => (
                <div
                  key={style}
                  className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStyleEmoji(style)}</span>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {style}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#8B5A5A]">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 bg-[#2C2C2C] text-white rounded-lg font-medium hover:bg-black transition-colors"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
