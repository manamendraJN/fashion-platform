import React, { useState, useEffect } from 'react';
import { Layout } from '../components/AccLayout';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { Archive, Heart, Sparkles, TrendingUp, Tag, Sun,
         AlertCircle, Loader2, Clock, CheckCircle2, Trash2, Plus } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

const CAT_COLORS = ['#8B5A5A','#2C2C2C','#7A9B8E','#A8A8A8','#C4956A','#6B7FA8','#9B7A8B','#7A8B6B','#A87A6B','#6B9B8E','#8B7AA8','#C4A87A'];
const USE_COLORS = ['#8B5A5A','#2C2C2C','#7A9B8E','#C4956A','#A8A8A8'];
const SEA_COLORS = ['#C4956A','#7A9B8E','#8B5A5A','#6B7FA8'];

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); }
  catch { return d; }
};

const actionIcon = (action) => {
  if (action === 'add')    return <Plus className="h-3 w-3 text-green-500" />;
  if (action === 'delete') return <Trash2 className="h-3 w-3 text-red-400" />;
  if (action === 'used')   return <CheckCircle2 className="h-3 w-3 text-blue-400" />;
  return <Clock className="h-3 w-3 text-gray-400" />;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-[#2C2C2C] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color || '#8B5A5A' }}>
          {p.name || p.dataKey}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export function AccAnalyticsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`${API}/api/accessories/analytics`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Backend not connected.'); setLoading(false); });
  }, []);

  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 text-[#8B5A5A] animate-spin" />
        <p className="text-sm text-gray-400">Loading analytics...</p>
      </div>
    </Layout>
  );

  if (error || !data) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-[#2C2C2C]">Backend not connected</p>
        <p className="text-xs text-gray-400">Start Flask server to view analytics</p>
      </div>
    </Layout>
  );

  const { summary, category_distribution, color_distribution,
          usage_distribution, season_distribution,
          most_used, recent_activity } = data;

  const catData = (category_distribution || []).map((r, i) => ({
    name: r.category, count: r.cnt, fill: CAT_COLORS[i % CAT_COLORS.length]
  }));
  const useData = (usage_distribution || []).map((r, i) => ({
    name: r.usage || 'Unknown', value: r.cnt, fill: USE_COLORS[i % USE_COLORS.length]
  }));
  const seaData = (season_distribution || []).map((r, i) => ({
    name: r.season || 'Unknown', value: r.cnt, fill: SEA_COLORS[i % SEA_COLORS.length]
  }));
  const colData = (color_distribution || []).map((r, i) => ({
    name: r.color, count: r.cnt, fill: CAT_COLORS[i % CAT_COLORS.length]
  }));

  // Occasion coverage radar — derived from which categories exist in wardrobe
  const OCCASION_CATS = {
    Casual:  ['Belts','Watches','Sunglasses & Eyewear','Hats & Headwear'],
    Formal:  ['Watches','Necklaces & Chains','Earrings','Cufflinks','Ties'],
    Party:   ['Earrings','Necklaces & Chains','Bracelets & Bangles','Rings','Handbags & Clutches'],
    Sports:  ['Hats & Headwear','Sunglasses & Eyewear'],
    Wedding: ['Necklaces & Chains','Earrings','Bracelets & Bangles','Rings','Handbags & Clutches'],
    Office:  ['Watches','Belts','Ties','Cufflinks'],
    Beach:   ['Sunglasses & Eyewear','Hats & Headwear','Handbags & Clutches'],
  };
  const catCountMap = Object.fromEntries((category_distribution || []).map(r => [r.category, r.cnt]));
  const radarData = Object.entries(OCCASION_CATS).map(([occ, cats]) => {
    const have = cats.filter(c => catCountMap[c] > 0).length;
    return { subject: occ, A: cats.length ? Math.round((have / cats.length) * 100) : 0 };
  });

  const stats = [
    { label: 'Total Accessories', value: summary.total,       icon: Archive,   color: 'bg-[#8B5A5A]' },
    { label: 'Favourites',        value: summary.favourites,  icon: Heart,     color: 'bg-[#2C2C2C]' },
    { label: 'Categories',        value: summary.categories,  icon: Sparkles,  color: 'bg-[#7A9B8E]' },
    { label: 'Available',         value: summary.available,   icon: Tag,       color: 'bg-[#C4956A]' },
    { label: 'Unavailable',       value: summary.unavailable, icon: Sun,       color: 'bg-[#A8A8A8]' },
    { label: 'Unique Colors',     value: colData.length,      icon: TrendingUp, color: 'bg-[#6B7FA8]' },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-medium text-[#2C2C2C]">Analytics</h1>
        <p className="text-gray-500 mt-1 text-sm">Real-time insights from your wardrobe database</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white p-4 rounded-2xl border border-[#E5E0D8] shadow-sm flex flex-col gap-2">
            <div className={`p-2 rounded-xl ${s.color} text-white w-fit`}>
              <s.icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-2xl font-serif font-semibold text-[#2C2C2C]">{s.value}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Category Breakdown */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm">
          <h3 className="font-serif text-sm font-semibold text-[#2C2C2C] mb-4">Category Breakdown</h3>
          {catData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-gray-400">No wardrobe items yet</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData} layout="vertical" margin={{ left:0, right:16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0ECE8" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={140}
                    tick={{ fontSize:10, fill:'#6B6B6B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'#FAF8F5' }} />
                  <Bar dataKey="count" radius={[0,6,6,0]} barSize={14}>
                    {catData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Usage Composition */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
          className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm">
          <h3 className="font-serif text-sm font-semibold text-[#2C2C2C] mb-4">Usage Composition</h3>
          {useData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-gray-400">No data yet</div>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={useData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value">
                      {useData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {useData.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.fill }} />
                    {e.name} <span className="text-gray-400">({e.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Occasion Coverage Radar */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm">
          <h3 className="font-serif text-sm font-semibold text-[#2C2C2C] mb-1">Occasion Coverage</h3>
          <p className="text-[10px] text-gray-400 mb-3">% of needed accessory categories present per occasion</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="#E5E0D8" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:10, fill:'#6B6B6B' }} />
                <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false} />
                <Radar dataKey="A" stroke="#8B5A5A" strokeWidth={2} fill="#8B5A5A" fillOpacity={0.15} />
                <Tooltip content={<CustomTooltip />} formatter={v => [`${v}%`]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Season Distribution */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
          className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm">
          <h3 className="font-serif text-sm font-semibold text-[#2C2C2C] mb-4">Season Distribution</h3>
          {seaData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-gray-400">No data yet</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seaData} margin={{ top:4, right:16, left:0, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0ECE8" />
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:'#6B6B6B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:'#6B6B6B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'#FAF8F5' }} />
                  <Bar dataKey="value" radius={[6,6,0,0]} barSize={40}>
                    {seaData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Most Used Items */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
          className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm">
          <h3 className="font-serif text-sm font-semibold text-[#2C2C2C] mb-4">Most Used Items</h3>
          {!most_used?.length ? (
            <p className="text-xs text-gray-400 text-center py-8">No usage data yet — use the recommendation flow to track usage</p>
          ) : (
            <div className="space-y-3">
              {most_used.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#8B5A5A] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#2C2C2C] truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#E5E0D8] w-20 overflow-hidden">
                      <div className="h-full rounded-full bg-[#8B5A5A]"
                        style={{ width: `${Math.min(100, (item.usage_count / (most_used[0]?.usage_count || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-7 text-right">{item.usage_count}×</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
          className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm">
          <h3 className="font-serif text-sm font-semibold text-[#2C2C2C] mb-4">Recent Activity</h3>
          {!recent_activity?.length ? (
            <p className="text-xs text-gray-400 text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-1">
              {recent_activity.map((log, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#F5F2EE] last:border-0">
                  <div className="mt-0.5 flex-shrink-0">{actionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#2C2C2C] truncate">{log.description}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{fmt(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </Layout>
  );
}