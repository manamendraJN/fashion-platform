import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { ChatMessage } from '../components/ChatMessage';
import { UserStyleProfile } from '../components/UserStyleProfile';
import {
  Send,
  Sparkles,
  User,
  ChevronRight,
  Shirt,
  Briefcase,
  Music,
  Heart,
  Dumbbell,
  Waves,
  ShoppingBag,
  Church,
  Users,
  Sun,
  CloudRain,
  Snowflake,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_CATEGORIES = [
  {
    label: 'Occasions',
    events: [
      { name: 'Tamil Wedding', icon: '💍', color: 'from-rose-500 to-pink-600', query: 'Tamil wedding' },
      { name: 'Western Wedding', icon: '👰', color: 'from-purple-500 to-violet-600', query: 'Western wedding' },
      { name: 'Party', icon: '🎉', color: 'from-orange-400 to-pink-500', query: 'party tonight' },
      { name: 'Date Night', icon: '❤️', color: 'from-red-400 to-rose-500', query: 'date night' },
      { name: 'Family Gathering', icon: '👨‍👩‍👧', color: 'from-amber-400 to-orange-500', query: 'family gathering' },
      { name: 'Religious', icon: '🙏', color: 'from-yellow-500 to-amber-600', query: 'religious event temple' },
    ],
  },
  {
    label: 'Work & Daily',
    events: [
      { name: 'Office', icon: '💼', color: 'from-slate-500 to-gray-600', query: 'office meeting' },
      { name: 'Interview', icon: '🎯', color: 'from-blue-500 to-indigo-600', query: 'job interview' },
      { name: 'Casual', icon: '☀️', color: 'from-teal-400 to-cyan-500', query: 'casual weekend outing' },
      { name: 'Shopping', icon: '🛍️', color: 'from-green-400 to-emerald-500', query: 'shopping mall' },
      { name: 'Lunch', icon: '🍽️', color: 'from-lime-400 to-green-500', query: 'lunch outing' },
      { name: 'Travel', icon: '✈️', color: 'from-sky-400 to-blue-500', query: 'travel comfortable' },
    ],
  },
  {
    label: 'Active & Sports',
    events: [
      { name: 'Gym', icon: '💪', color: 'from-[#8B5A5A] to-[#A67676]', query: 'gym workout' },
      { name: 'Running', icon: '🏃', color: 'from-orange-500 to-red-500', query: 'running jogging' },
      { name: 'Yoga', icon: '🧘', color: 'from-purple-400 to-pink-400', query: 'yoga pilates' },
      { name: 'Beach', icon: '🏖️', color: 'from-cyan-400 to-blue-400', query: 'beach swimming pool' },
      { name: 'Hiking', icon: '🥾', color: 'from-green-500 to-teal-500', query: 'hiking outdoor' },
      { name: 'Sports', icon: '⚽', color: 'from-yellow-400 to-orange-400', query: 'sports athletic' },
    ],
  },
];

const WEATHER_OPTIONS = [
  { label: 'Hot', icon: <Sun className="w-3.5 h-3.5" />, color: 'bg-orange-100 text-orange-700 border-orange-200', query: 'hot weather' },
  { label: 'Cold', icon: <Snowflake className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700 border-blue-200', query: 'cold weather' },
  { label: 'Rainy', icon: <CloudRain className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700 border-slate-200', query: 'rainy weather' },
];

// Sample quick-start queries (shown when chat is empty)
const SAMPLE_QUERIES = [
  "What should I wear to a Tamil wedding?",
  "Office meeting tomorrow – suggestions?",
  "Casual weekend outfit",
  "Gym session this evening",
];

export function ChatPage() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [wardrobe, setWardrobe] = useState([]);
  const [showStyleProfile, setShowStyleProfile] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [selectedWeather, setSelectedWeather] = useState(null);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      timestamp: new Date(),
      suggestions: [],
      content:
        "Hello! 👋 I've analyzed your wardrobe and I'm ready to help.\n\nTell me what's on your calendar — pick an event below or type anything. I'll suggest the best outfits from your wardrobe, considering what you've worn recently.",
    },
  ]);

  // Fetch wardrobe once on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/wardrobe')
      .then((r) => r.json())
      .then(setWardrobe)
      .catch((err) => console.error('Failed to load wardrobe:', err));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Simple occasion extractor
  function extractOccasionOrActivity(text) {
    const t = text.toLowerCase();
    if (t.includes('tamil wedding') || t.includes('indian wedding')) return { value: 'Tamil Wedding', display: 'Tamil Wedding' };
    if (t.includes('western wedding') || (t.includes('wedding') && !t.includes('tamil'))) return { value: 'Western Wedding', display: 'Western Wedding' };
    if (t.includes('interview')) return { value: 'Office', display: 'Interview' };
    if (t.includes('office') || t.includes('meeting') || t.includes('business')) return { value: 'Office', display: 'Office' };
    if (t.includes('party') || t.includes('club') || t.includes('night out')) return { value: 'Party', display: 'Party' };
    if (t.includes('date') || t.includes('romantic') || t.includes('dinner')) return { value: 'Date Night', display: 'Date Night' };
    if (t.includes('family') || t.includes('reunion')) return { value: 'Family Gathering', display: 'Family Gathering' };
    if (t.includes('temple') || t.includes('church') || t.includes('religious')) return { value: 'Religious', display: 'Religious Event' };
    if (t.includes('shopping') || t.includes('mall')) return { value: 'Shopping', display: 'Shopping' };
    if (t.includes('lunch') || t.includes('brunch')) return { value: 'Casual', display: 'Lunch' };
    if (t.includes('travel')) return { value: 'Casual', display: 'Travel' };
    if (t.includes('gym') || t.includes('workout')) return { value: 'Gym', display: 'Gym' };
    if (t.includes('running') || t.includes('jogging')) return { value: 'Sports', display: 'Running' };
    if (t.includes('yoga') || t.includes('pilates')) return { value: 'Sports', display: 'Yoga' };
    if (t.includes('beach') || t.includes('swim') || t.includes('pool')) return { value: 'Beach', display: 'Beach' };
    if (t.includes('hiking') || t.includes('outdoor')) return { value: 'Sports', display: 'Hiking' };
    if (t.includes('sports') || t.includes('athletic')) return { value: 'Sports', display: 'Sports' };
    if (t.includes('casual') || t.includes('weekend') || t.includes('chill') || t.includes('relax') || t.includes('outing')) return { value: 'Casual', display: 'Casual' };
    return null;
  }

  // Weather detector
  function extractWeather(text) {
    const t = text.toLowerCase();
    if (t.includes('cold') || t.includes('winter') || t.includes('chilly')) return 'cold';
    if (t.includes('hot') || t.includes('summer') || t.includes('warm')) return 'hot';
    if (t.includes('rain') || t.includes('rainy') || t.includes('wet')) return 'rainy';
    return selectedWeather;
  }

  const handleSend = async (text = input) => {
    const msg = text.trim();
    if (!msg) return;

    // Add user message
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date(), suggestions: [] }]);
    setInput('');
    setIsTyping(true);

    const occasion = extractOccasionOrActivity(msg);
    const weather = extractWeather(msg);

    let responseContent = '';
    let suggestions = [];

    if (occasion) {
      try {
        const res = await fetch('http://localhost:5000/api/recommend-smart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ occasion: occasion.value, weather: weather || null }),
        });

        if (!res.ok) throw new Error('Recommendation failed');

        const data = await res.json();

        if (data.success && data.recommendations?.length > 0) {
          suggestions = data.recommendations.map((i) => ({ ...i, image: `http://localhost:5000${i.url}` }));

          const weatherLine = weather ? ` · ${weather === 'cold' ? '❄️ Cold' : weather === 'hot' ? '☀️ Hot' : '🌧️ Rainy'} weather` : '';

          responseContent = `✨ Best picks for **${occasion.display}**${weatherLine}:\n\n`;

          if (data.recentlyWorn?.length > 0) {
            responseContent += `📝 Excluded ${data.recentlyWorn.length} recently worn item(s) for variety.\n\n`;
          }

          suggestions.slice(0, 4).forEach((item) => {
            responseContent += `• ${item.type} — ${item.reason || 'Great match'}\n`;
          });
        } else {
          responseContent = `😕 No strong matches for "${occasion.display}". Try uploading more items!`;
        }
      } catch (err) {
        console.error(err);
        responseContent = "Couldn't fetch smart recommendations right now. Showing general matches instead...";
        // Fallback to local filter
        suggestions = wardrobe
          .filter((item) => item.eventScores?.[occasion.value] > 0.65)
          .map((i) => ({ ...i, image: `http://localhost:5000${i.url}` }));
      }
    } else {
      responseContent =
        "I couldn't identify a specific occasion. Try one of the quick buttons below, or type something like:\n\n• \"Tamil wedding this weekend\"\n• \"Office meeting tomorrow\"\n• \"Gym session\"";
    }

    // Simulate slight thinking delay for natural feel
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          suggestions,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col" style={{ height: '100vh' }}>
      <Layout>
        <div className="flex gap-6 h-[calc(100vh-96px)]">
          {/* Left Sidebar – Events & Weather */}
          <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 gap-4 overflow-hidden">
            {/* Style Profile Button */}
            <button
              onClick={() => setShowStyleProfile(true)}
              className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-[#8B5A5A] to-[#A67676] text-white rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">My Style Profile</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            {/* Weather Filter */}
            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-3">
              <p className="text-[10px] font-semibold text-[#A0998F] uppercase tracking-wider mb-2 px-1">Weather Filter</p>
              <div className="flex flex-col gap-1.5">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w.label}
                    onClick={() => setSelectedWeather((prev) => (prev === w.label.toLowerCase() ? null : w.label.toLowerCase()))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      selectedWeather === w.label.toLowerCase()
                        ? w.color + ' shadow-sm'
                        : 'border-transparent text-[#6B6B6B] hover:bg-[#F5F0EB]'
                    }`}
                  >
                    {w.icon} {w.label}
                    {selectedWeather === w.label.toLowerCase() && <span className="ml-auto text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Categories */}
            <div className="flex-1 overflow-y-auto scrollbar-hide bg-white rounded-2xl border border-[#EDE8E0] p-3">
              {EVENT_CATEGORIES.map((cat) => (
                <div key={cat.label} className="mb-4 last:mb-0">
                  <p className="text-[10px] font-semibold text-[#A0998F] uppercase tracking-wider mb-2 px-1">{cat.label}</p>
                  <div className="flex flex-col gap-1">
                    {cat.events.map((ev) => (
                      <button
                        key={ev.name}
                        onClick={() => handleSend(`What should I wear for ${ev.query}?`)}
                        disabled={isTyping}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-[#3C3C3C] hover:bg-[#F5F0EB] transition-all disabled:opacity-40 group"
                      >
                        <span className="text-base leading-none">{ev.icon}</span>
                        <span>{ev.name}</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-[#EDE8E0] overflow-hidden">
            {/* Chat Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#F0EBE3] bg-[#FDFAF7]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#2C2C2C] rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-serif text-[15px] font-semibold text-[#1E1E1E]">Style Assistant</h2>
                  <p className="text-[11px] text-[#9A9A9A]">AI-powered outfit recommendations</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-[11px] text-[#9A9A9A]">Online</span>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-5 space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} {...msg} />
              ))}

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 ml-11">
                  <div className="flex gap-1.5 bg-[#F5F0EB] px-5 py-3.5 rounded-2xl rounded-tl-none">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2.5 h-2.5 bg-[#8B5A5A] rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Mobile Event Pills */}
            <div className="lg:hidden flex-shrink-0 px-4 py-3 border-t border-[#F0EBE3] overflow-x-auto scrollbar-hide bg-[#FDFAF7]">
              <div className="flex gap-2 pb-1">
                {EVENT_CATEGORIES.flatMap((c) => c.events).map((ev) => (
                  <button
                    key={ev.name}
                    onClick={() => handleSend(`What should I wear for ${ev.query}?`)}
                    disabled={isTyping}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#EDE8E0] rounded-full text-xs font-medium hover:border-[#8B5A5A] transition-colors disabled:opacity-50"
                  >
                    <span>{ev.icon}</span> {ev.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 px-5 py-5 border-t border-[#F0EBE3] bg-[#FDFAF7]">
              {selectedWeather && (
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-xs text-[#8B7A6A] bg-[#F5EFE8] px-3 py-1 rounded-full border border-[#E8DFD4]">
                    {selectedWeather === 'cold' ? '❄️' : selectedWeather === 'hot' ? '☀️' : '🌧️'} Filtering for {selectedWeather} weather
                  </span>
                  <button onClick={() => setSelectedWeather(null)} className="text-xs text-[#A0998F] hover:text-[#6B6B6B]">
                    ✕ Clear
                  </button>
                </div>
              )}

              {/* Quick start queries when chat is new */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 mb-4 justify-center">
                  {SAMPLE_QUERIES.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSend(query)}
                      className="px-4 py-2 bg-white border border-[#E5E0D8] rounded-full text-sm text-[#6B6B6B] hover:border-[#8B5A5A] hover:text-[#8B5A5A] transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 items-end">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                  disabled={isTyping}
                  placeholder="Ask about an outfit... e.g. 'Tamil wedding this weekend'"
                  className="flex-1 px-5 py-3.5 bg-[#F5F0EB] border border-transparent rounded-2xl focus:outline-none focus:border-[#8B5A5A] focus:bg-white transition-all text-[13px] text-[#2C2C2C] placeholder:text-[#B0A898] disabled:opacity-50 resize-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isTyping || !input.trim()}
                  className="flex-shrink-0 w-12 h-12 bg-[#2C2C2C] text-white rounded-2xl flex items-center justify-center hover:bg-black disabled:bg-[#C8C0B8] disabled:cursor-not-allowed transition-all hover:scale-105 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-center text-[#C0B8B0] mt-3">
                AI suggestions may vary · Always dress for the occasion 🌸
              </p>
            </div>
          </div>

          {/* Right Sidebar – Wardrobe Stats */}
          <aside className="hidden xl:flex flex-col w-64 flex-shrink-0 gap-4 overflow-hidden">
            {/* Wardrobe Overview */}
            <div className="bg-white rounded-2xl border border-[#EDE8E0] p-5">
              <p className="text-[10px] font-semibold text-[#A0998F] uppercase tracking-wider mb-3">Your Wardrobe</p>
              <div className="text-center">
                <p className="text-4xl font-serif font-bold text-[#2C2C2C]">{wardrobe.length}</p>
                <p className="text-sm text-[#9A9A9A] mt-1">items cataloged</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="text-center bg-[#FAF8F5] rounded-xl p-3">
                  <p className="text-lg font-semibold text-[#8B5A5A]">{wardrobe.filter((i) => i.isFavorite).length}</p>
                  <p className="text-[10px] text-[#9A9A9A]">favourites</p>
                </div>
                <div className="text-center bg-[#FAF8F5] rounded-xl p-3">
                  <p className="text-lg font-semibold text-[#7A9B8E]">
                    {wardrobe.filter((i) => !i.wearCount || i.wearCount === 0).length}
                  </p>
                  <p className="text-[10px] text-[#9A9A9A]">unworn</p>
                </div>
              </div>
            </div>

            {/* Recent Uploads */}
            {wardrobe.length > 0 && (
              <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-[#EDE8E0] p-4">
                <p className="text-[10px] font-semibold text-[#A0998F] uppercase tracking-wider mb-3">Recent Uploads</p>
                <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide h-full">
                  {wardrobe.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSend(`Suggest outfits with my ${item.type}`)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F5F0EB] transition-colors text-left group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F5F0EB] flex-shrink-0 border border-[#EDE8E0]">
                        <img
                          src={`http://localhost:5000${item.url}`}
                          alt={item.type}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C2C2C] truncate">{item.type}</p>
                        <p className="text-xs text-[#9A9A9A]">{item.wearCount || 0}× worn</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C8C0B8] opacity-0 group-hover:opacity-70 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pro Tip */}
            <div className="bg-gradient-to-br from-[#F5EFE8] to-[#EDE5DC] rounded-2xl border border-[#E5DDD4] p-5">
              <p className="text-sm font-semibold text-[#8B7A6A] mb-2">💡 Pro Tip</p>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                Mark items as worn after wearing them — it helps me give you better variety next time.
              </p>
            </div>
          </aside>
        </div>
      </Layout>

      {/* Style Profile Modal */}
      <AnimatePresence>
        {showStyleProfile && <UserStyleProfile onClose={() => setShowStyleProfile(false)} />}
      </AnimatePresence>
    </div>
  );
}