import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import { motion } from 'framer-motion';
import { Shirt, Calendar, Target, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';

// Mock fallback data (in case backend is down)
const MOCK_DATA = {
  stats: {
    totalItems: 42,
    eventsCovered: 12,
    totalEvents: 12,
    avgWearCount: 4.5,
    unwornItems: 8,
  },
  charts: {
    composition: [
      { name: 'Tops', value: 28, fill: '#8B5A5A' },
      { name: 'Bottoms', value: 15, fill: '#2C2C2C' },
      { name: 'Dresses', value: 9, fill: '#A8A8A8' },
      { name: 'Outerwear', value: 6, fill: '#7A9B8E' },
    ],
    wearFrequency: [
      { name: 'White Shirt', count: 18 },
      { name: 'Black Jeans', count: 15 },
      { name: 'Blue Top', count: 12 },
      { name: 'Red Dress', count: 9 },
    ],
    eventCoverage: [
      { subject: 'Casual', A: 95 },
      { subject: 'Office', A: 82 },
      { subject: 'Party', A: 68 },
      { subject: 'Wedding', A: 75 },
      { subject: 'Gym', A: 45 },
    ],
    learningProgress: [
      { month: 'Jan', accuracy: 65 },
      { month: 'Feb', accuracy: 78 },
      { month: 'Mar', accuracy: 85 },
      { month: 'Apr', accuracy: 92 },
    ],
  },
};

const COLORS = ['#8B5A5A', '#2C2C2C', '#A8A8A8', '#7A9B8E', '#E8E4DE', '#D4AF37'];

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Could not load real analytics. Showing sample data.');
      setAnalytics(MOCK_DATA); // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#8B5A5A]" />
          <p>Loading your wardrobe insights...</p>
        </div>
      </Layout>
    );
  }

  const stats = analytics?.stats || MOCK_DATA.stats;
  const compositionData = analytics?.charts?.composition || MOCK_DATA.charts.composition;
  const wearFrequency = analytics?.charts?.wearFrequency || MOCK_DATA.charts.wearFrequency;
  const eventCoverage = analytics?.charts?.eventCoverage || MOCK_DATA.charts.eventCoverage;
  const learningProgress = analytics?.charts?.learningProgress || MOCK_DATA.charts.learningProgress;

  return (
    <Layout>
      <div className="mb-10 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-[#2C2C2C] mb-2">
            Wardrobe Analytics
          </h1>
          <p className="text-gray-600">
            Insights into your style patterns, usage and AI learning progress.
          </p>
          {error && <p className="text-sm text-orange-600 mt-2">{error}</p>}
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#6B4545] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Items', value: stats.totalItems, icon: Shirt, color: 'bg-[#8B5A5A]' },
          {
            label: 'Events Covered',
            value: `${stats.eventsCovered || stats.totalEvents}/${stats.totalEvents || 12}`,
            icon: Target,
            color: 'bg-[#2C2C2C]',
          },
          {
            label: 'Avg. Wear/Item',
            value: (stats.avgWearCount || 0).toFixed(1) + '×',
            icon: Calendar,
            color: 'bg-[#7A9B8E]',
          },
          {
            label: 'Unworn Items',
            value: stats.unwornItems || 0,
            icon: TrendingUp,
            color: 'bg-[#A8A8A8]',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white p-6 rounded-xl border border-[#E5E0D8] shadow-sm flex items-center gap-4"
          >
            <div className={`p-4 rounded-full ${stat.color} text-white`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl md:text-3xl font-serif font-medium text-[#2C2C2C]">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wardrobe Composition (Pie) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 md:p-8 rounded-2xl border border-[#E5E0D8] shadow-sm"
        >
          <h3 className="text-xl font-serif mb-6 text-[#2C2C2C]">Wardrobe Composition</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Most Worn Items (Bar) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 md:p-8 rounded-2xl border border-[#E5E0D8] shadow-sm"
        >
          <h3 className="text-xl font-serif mb-6 text-[#2C2C2C]">Most Worn Items</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={wearFrequency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E0D8" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#FAF8F5' }} />
                <Bar dataKey="count" fill="#2C2C2C" radius={[0, 6, 6, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Event Suitability Coverage (Radar) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 md:p-8 rounded-2xl border border-[#E5E0D8] shadow-sm lg:col-span-2"
        >
          <h3 className="text-xl font-serif mb-6 text-[#2C2C2C]">Event Suitability Coverage</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={eventCoverage}>
                <PolarGrid stroke="#E5E0D8" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6B6B6B' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Coverage"
                  dataKey="A"
                  stroke="#8B5A5A"
                  strokeWidth={2.5}
                  fill="#8B5A5A"
                  fillOpacity={0.25}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* AI Learning Curve (Line) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 md:p-8 rounded-2xl border border-[#E5E0D8] shadow-sm lg:col-span-2"
        >
          <h3 className="text-xl font-serif mb-6 text-[#2C2C2C]">AI Learning Progress</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <LineChart data={learningProgress}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D8" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#2C2C2C"
                  strokeWidth={3}
                  dot={{ fill: '#2C2C2C', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-gray-500 mt-4">
            Accuracy improves as you interact with recommendations
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}