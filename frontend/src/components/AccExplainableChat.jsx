import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, User, ShoppingBag, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

const STORES = [
  { name: 'Daraz',      base: 'https://www.daraz.lk/catalog/?q=' },
  { name: 'Temu',       base: 'https://www.temu.com/search_result.html?search_key=' },
  { name: 'AliExpress', base: 'https://www.aliexpress.com/wholesale?SearchText=' },
  { name: 'eBay',       base: 'https://www.ebay.com/sch/i.html?_nkw=' },
];

function MarketCard({ category, budget }) {
  const query = encodeURIComponent(category ?? 'accessory');
  return (
    <div className="bg-white border border-[#E5E0D8] rounded-xl p-3 space-y-2 mt-1">
      <div>
        <p className="text-xs font-semibold text-[#2C2C2C]">
          🛍 Searching for: <em>{category}</em>
        </p>
        {budget && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Budget: Rs. {budget.toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STORES.map(s => (
          <a key={s.name} href={`${s.base}${query}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 bg-[#2C2C2C] text-white rounded-lg hover:bg-[#8B5A5A] transition-colors">
            <ShoppingBag className="h-2.5 w-2.5" /> {s.name}
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Flow states ──
const FLOW = {
  IDLE:        'idle',
  ASK_WHICH:   'ask_which',   // ask which CATEGORY to replace
  ASK_BUDGET:  'ask_budget',  // ask budget
};

function flattenRecs(recommendations) {
  if (!recommendations?.length) return [];
  if (recommendations[0]?.items) {
    return recommendations.flatMap(g => g.items);
  }
  return recommendations;
}

// Get unique categories from recommendations (preserving order)
function getUniqueCategories(flatRecs) {
  const seen = new Set();
  const cats = [];
  for (const r of flatRecs) {
    if (r.category && !seen.has(r.category)) {
      seen.add(r.category);
      cats.push(r.category);
    }
  }
  return cats;
}

function matchCategory(text, categories) {
  if (!categories?.length) return null;
  const t = text.toLowerCase().trim();
  // Number match (1, 2, 3...)
  const numMatch = text.match(/\b([1-9])\b/);
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1;
    if (idx >= 0 && idx < categories.length) return categories[idx];
  }
  // Category name match
  return categories.find(c =>
    c.toLowerCase().includes(t) || t.includes(c.toLowerCase())
  ) ?? null;
}

function buildReply(msg, state, recommendations, dressAttrs, session, setState, setTargetCategory, targetCategory) {
  const t = text => text.toLowerCase().trim();
  const input = t(msg);
  const flatRecs = flattenRecs(recommendations);
  const categories = getUniqueCategories(flatRecs);

  // ── Negative feedback → ask WHICH CATEGORY ──
  const negWords = ["don't like","dont like","not like","hate","bad","wrong",
                    "no good","not good","dislike","don't want","not suitable",
                    "not matching","change","replace","switch"];
  if (negWords.some(w => input.includes(w)) && state === FLOW.IDLE) {
    setState(FLOW.ASK_WHICH);
    if (!categories.length) {
      return `I'm sorry to hear that! 😊 Please run a recommendation first from the **Customize** tab, then I can help you find alternatives.`;
    }
    const list = categories.map((c, i) => `  ${i + 1}. **${c}**`).join('\n');
    return `I'm sorry to hear that! 😊 Which **category** would you like to replace?\n\n${list}\n\n_Type the number (e.g. "1") or category name (e.g. "Watch")_`;
  }

  // ── Category identified → ask budget ──
  if (state === FLOW.ASK_WHICH) {
    const found = matchCategory(msg, categories);
    if (found) {
      setTargetCategory(found);
      setState(FLOW.ASK_BUDGET);
      return `Got it! Let's find a **${found}** from the online market. 🛍\n\nWhat is your **budget** for this? _(e.g. Rs. 2000, Rs. 5000 — or type "any")_`;
    } else {
      const list = categories.map((c, i) => `  ${i + 1}. **${c}**`).join('\n');
      return `__ERROR__Sorry, I couldn't match that category. Please pick from the list below:\n\n${list}\n\n_Type the number or category name._`;
    }
  }

  // ── Budget given → show market card ──
  if (state === FLOW.ASK_BUDGET) {
    const isAny = input === 'any' || input === 'anything' || input === 'no budget' || input === 'no limit';
    const numMatch = msg.match(/[\d,]+/);
    if (!isAny && !numMatch) {
      return `__ERROR__Please enter a valid budget amount.\n\n_Example: **Rs. 2000** or just **5000**, or type **"any"**_`;
    }
    const budget = isAny ? null : parseInt(numMatch[0].replace(',', ''));
    setState(FLOW.IDLE);
    return `__MARKET_CARD__:${budget ?? 0}:any=${isAny}`;
  }

  // ── Direct market/shop request ──
  if ((input.includes('market') || input.includes('buy') || input.includes('shop') ||
       input.includes('online') || input.includes('daraz')) && state === FLOW.IDLE) {
    setState(FLOW.ASK_WHICH);
    if (!categories.length) {
      return `Please run a recommendation first from the **Customize** tab, then I can help you search online! 🛍`;
    }
    const list = categories.map((c, i) => `  ${i + 1}. **${c}**`).join('\n');
    return `Sure! Which **category** would you like to search for online?\n\n${list}\n\n_Type the number or category name._`;
  }

  // ── Why recommended ──
  if (input.includes('why') || input.includes('reason') || input.includes('recommended')) {
    const top = flatRecs?.[0];
    if (!top) return 'Run a recommendation first from the **Customize** tab!';
    return `🔍 **Why "${top.name}" was recommended:**\n\n• Matches your **${session?.occasion ?? 'selected'}** occasion\n• ${top.color} color complements your dress\n• Compatible with **${session?.gender ?? 'your'}** gender preference\n• Compatibility score: **${Math.round((top.compatibility_score ?? 0.85) * 100)}%**\n• Worn **${top.usage_count ?? 0}×** — lower usage = higher rotation priority`;
  }

  // ── Usage history ──
  if (input.includes('usage') || input.includes('worn') || input.includes('times') ||
      input.includes('how many') || input.includes('history')) {
    if (!flatRecs?.length) return 'No recommendations yet. Go to **Customize** tab first!';
    const list = flatRecs.map((r, i) =>
      `${i + 1}. **${r.name}** (${r.category})\n   → Worn **${r.usage_count ?? 0}×** · Last used: **${r.last_used_date ? new Date(r.last_used_date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'Never'}**`
    ).join('\n');
    return `📊 **Usage History of Recommended Items:**\n\n${list}\n\n_Items worn fewer times are prioritised for better wardrobe rotation._`;
  }

  // ── Alternatives ──
  if (input.includes('alternative') || input.includes('other') || input.includes('different') || input.includes('else')) {
    if ((flatRecs?.length ?? 0) < 2) return 'Add more items to your wardrobe for more alternatives!';
    return `Here are alternative recommendations:\n\n${flatRecs.slice(1, 4).map((r, i) =>
      `${i + 2}. **${r.name}** (${r.category}) — ${Math.round((r.compatibility_score ?? 0.7) * 100)}% match, worn ${r.usage_count ?? 0}×`
    ).join('\n')}\n\nWant me to search online for any of these categories?`;
  }

  // ── Occasion info ──
  if (input.includes('occasion') || input.includes('suitable') || input.includes('appropriate')) {
    return `🎯 **Occasion: ${session?.occasion ?? 'Not selected'}**\n\n${
      session?.occasion === 'Formal' || session?.occasion === 'Office'
        ? '✅ Preferred: Watches, Belts, Cufflinks, Ties\n❌ Excluded: Sunglasses, Hats'
        : session?.occasion === 'Wedding'
        ? '✅ Preferred: Necklaces, Earrings, Bracelets, Rings\n❌ Excluded: Sunglasses, Hats'
        : session?.occasion === 'Interview'
        ? '✅ Preferred: Watches, Belts\n❌ Excluded: Sunglasses, Hats, Earrings, Bangles, Rings, Necklaces'
        : '✅ Most accessories are appropriate for this occasion'
    }`;
  }

  // ── Default ──
  return `I can help you with your outfit! Try asking:\n• **"Why was this recommended?"**\n• **"Show usage history"**\n• **"I don't like this accessory"** → replace a category online\n• **"Search in market"** → browse Daraz, Temu & more\n• **"Suggest alternatives"**`;
}

export function ExplainableChat({ recommendations, dressAttributes, session }) {
  const [messages, setMessages] = useState([{
    id: '0', role: 'assistant', timestamp: new Date(),
    content: `Hi! 👋 I'm your **Explainable AI** assistant.\n\nI can explain why items were recommended, show usage history, and if you don't like a recommendation — I'll ask which **category** you want to replace and search **Daraz, Temu, AliExpress & eBay** for you!`,
  }]);
  const [input, setInput]               = useState('');
  const [typing, setTyping]             = useState(false);
  const [flowState, setFlowState]       = useState(FLOW.IDLE);
  const [targetCategory, setTargetCategory] = useState(null);
  const [inputError, setInputError]     = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const QUICK = [
    "Why was this recommended?",
    "Show usage history",
    "I don't like this accessory",
  ];

  const send = (text = input) => {
    if (!text.trim()) {
      setInputError('Please type a message before sending.');
      return;
    }
    setInputError('');
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setTyping(true);

    let localCategory = null;
    const raw = buildReply(
      text, flowState, recommendations, dressAttributes, session,
      setFlowState,
      (cat) => { localCategory = cat; setTargetCategory(cat); },
      targetCategory
    );

    setTimeout(() => {
      const isMarket = raw.startsWith('__MARKET_CARD__:');
      let budget = null;
      let isAny  = false;

      if (isMarket) {
        // parse __MARKET_CARD__:5000:any=false  OR  __MARKET_CARD__:0:any=true
        const parts = raw.split(':');
        budget = parseInt(parts[1]);
        isAny  = raw.includes('any=true');
      }

      const usedCategory = localCategory ?? targetCategory;
      const content = isMarket
        ? `Here are online stores for **${usedCategory ?? 'accessories'}**${isAny ? '' : ` within **Rs. ${budget?.toLocaleString()}**`}. Click a store to search!\n\n_Say "I don't like this accessory" anytime to search another category._`
        : raw;

      setMessages(p => [...p, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        marketCategory: isMarket ? usedCategory : null,
        budget: isMarket && !isAny ? budget : null,
      }]);
      setTyping(false);
    }, 900);
  };

  const isErrorMsg = (text) => text.startsWith('__ERROR__');
  const stripError = (text) => text.replace(/^__ERROR__/, '');

  const renderContent = (text) =>
    stripError(text).split('\n').map((line, i) => {
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="mb-0.5 last:mb-0" dangerouslySetInnerHTML={{ __html: html }} />;
    });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#E5E0D8] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#E5E0D8] bg-[#FAF8F5] flex-shrink-0">
        <div className="bg-[#8B5A5A] p-1.5 rounded-full">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#2C2C2C]">Explainable AI</p>
          <p className="text-[10px] text-gray-400">Why recommended · Usage history · Market search</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5',
              msg.role === 'user' ? 'bg-[#2C2C2C]' : isErrorMsg(msg.content) ? 'bg-red-400' : 'bg-[#8B5A5A]'
            )}>
              {msg.role === 'user'
                ? <User className="h-3.5 w-3.5 text-white" />
                : <Sparkles className="h-3.5 w-3.5 text-white" />}
            </div>
            <div className="max-w-[88%] space-y-2">
              <div className={cn(
                'px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[#2C2C2C] text-white rounded-tr-sm'
                  : isErrorMsg(msg.content)
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-sm'
                    : 'bg-[#FAF8F5] text-[#2C2C2C] border border-[#E5E0D8] rounded-tl-sm'
              )}>
                {isErrorMsg(msg.content) && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-red-600 font-semibold">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Invalid input</span>
                  </div>
                )}
                {renderContent(msg.content)}
              </div>
              {/* Market card — category level */}
              {msg.marketCategory && (
                <MarketCard category={msg.marketCategory} budget={msg.budget} />
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-[#8B5A5A] flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
            </div>
            <div className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex gap-1 items-center">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-[#8B5A5A] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick replies */}
      <div className="px-4 pt-1 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)}
            className="text-[10px] px-2.5 py-1 bg-[#FAF8F5] border border-[#E5E0D8] rounded-full text-[#6B6B6B] hover:border-[#8B5A5A] hover:text-[#8B5A5A] transition-colors whitespace-nowrap">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        {inputError && (
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {inputError}
          </div>
        )}
        <div className="relative">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); if (inputError) setInputError(''); }}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask anything about recommendations..."
            className={cn(
              'w-full pl-4 pr-10 py-2.5 bg-[#FAF8F5] rounded-full text-xs text-[#2C2C2C] placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all',
              inputError
                ? 'border border-red-300 focus:ring-red-200 focus:border-red-400'
                : 'border border-[#E5E0D8] focus:ring-[#8B5A5A]/20 focus:border-[#8B5A5A]'
            )}
          />
          <button onClick={() => send()} disabled={!input.trim() || typing}
            className="absolute right-1.5 top-1.5 p-1.5 bg-[#2C2C2C] rounded-full text-white disabled:opacity-40 hover:bg-black transition-colors">
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}