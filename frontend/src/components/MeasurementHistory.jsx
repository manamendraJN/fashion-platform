import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus, History, Activity } from 'lucide-react';
import { apiService } from '../services/api';

const MeasurementHistory = ({ userIdentifier = 'default' }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState('chest');

  useEffect(() => {
    fetchHistory();
  }, [userIdentifier]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMeasurementHistory(userIdentifier);
      
      if (response.success && response.data.measurements) {
        setHistory(response.data.measurements);
        calculateAnalytics(response.data.measurements);
      }
    } catch (error) {
      console.error('Error fetching measurement history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (measurements) => {
    if (measurements.length < 2) {
      setAnalytics(null);
      return;
    }

    // Get the most recent and oldest measurements
    const latest = measurements[0];
    const oldest = measurements[measurements.length - 1];

    // Calculate changes for each measurement type
    const changes = {};
    Object.keys(latest.measurements).forEach(key => {
      if (oldest.measurements[key]) {
        const change = latest.measurements[key] - oldest.measurements[key];
        const percentChange = ((change / oldest.measurements[key]) * 100).toFixed(1);
        changes[key] = {
          value: change.toFixed(2),
          percent: percentChange,
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
      }
    });

    setAnalytics({
      totalRecords: measurements.length,
      dateRange: {
        from: oldest.measured_at,
        to: latest.measured_at
      },
      changes
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend) => {
    if (trend === 'up') return 'text-green-600 bg-green-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-[#8B5A5A]" />
          <h3 className="text-lg font-semibold text-[#2C2C2C]">Measurement History</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#8B5A5A] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading history...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-[#8B5A5A]" />
          <h3 className="text-lg font-semibold text-[#2C2C2C]">Measurement History</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No measurement history yet</p>
          <p className="text-sm text-gray-400">Your past measurements will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      {analytics && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-[#8B5A5A]" />
            <h3 className="text-lg font-semibold text-[#2C2C2C]">Measurement Analytics</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#FAF8F5] p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Records</p>
              <p className="text-2xl font-bold text-[#2C2C2C]">{analytics.totalRecords}</p>
            </div>
            <div className="bg-[#FAF8F5] p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">First Measurement</p>
              <p className="text-sm font-medium text-[#2C2C2C]">{formatDate(analytics.dateRange.from)}</p>
            </div>
            <div className="bg-[#FAF8F5] p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Latest Measurement</p>
              <p className="text-sm font-medium text-[#2C2C2C]">{formatDate(analytics.dateRange.to)}</p>
            </div>
          </div>

          {/* Measurement Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Measurement to Analyze
            </label>
            <select
              value={selectedMeasurement}
              onChange={(e) => setSelectedMeasurement(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] focus:border-transparent"
            >
              {Object.keys(analytics.changes).map((key) => (
                <option key={key} value={key}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Measurement Trend */}
          {analytics.changes[selectedMeasurement] && (
            <div className={`p-4 rounded-lg ${getTrendColor(analytics.changes[selectedMeasurement].trend)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTrendIcon(analytics.changes[selectedMeasurement].trend)}
                  <div>
                    <p className="font-semibold">
                      {selectedMeasurement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-sm">
                      {analytics.changes[selectedMeasurement].trend === 'up' ? 'Increased' : 
                       analytics.changes[selectedMeasurement].trend === 'down' ? 'Decreased' : 'No Change'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {analytics.changes[selectedMeasurement].value > 0 ? '+' : ''}
                    {analytics.changes[selectedMeasurement].value} cm
                  </p>
                  <p className="text-sm">
                    ({analytics.changes[selectedMeasurement].percent > 0 ? '+' : ''}
                    {analytics.changes[selectedMeasurement].percent}%)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Measurement History List */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-[#8B5A5A]" />
          <h3 className="text-lg font-semibold text-[#2C2C2C]">All Measurements</h3>
          <span className="text-sm text-gray-500">({history.length} records)</span>
        </div>

        <div className="space-y-4">
          {history.map((record, index) => (
            <div
              key={record.user_id}
              className="border border-[#E5E5E5] rounded-lg p-4 hover:bg-[#FAF8F5] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8B5A5A]" />
                  <span className="font-medium text-[#2C2C2C]">{formatDate(record.measured_at)}</span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                      Latest
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{record.age_days} days ago</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {Object.entries(record.measurements).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 px-3 py-2 rounded">
                    <p className="text-xs text-gray-600 capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm font-medium text-[#2C2C2C]">{value} cm</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeasurementHistory;
