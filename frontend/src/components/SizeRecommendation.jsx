import React, { useState, useEffect } from 'react';
import { CheckCircle, Info, AlertTriangle, Ruler, TrendingUp, Shirt } from 'lucide-react';
import { apiService } from '../services/api';

const SizeRecommendation = ({ measurements, selectedBrand, selectedCategory }) => {
  const [recommendation, setRecommendation]               = useState(null);
  const [loading, setLoading]                             = useState(false);
  const [error, setError]                                 = useState(null);
  const [multipleRecommendations, setMultipleRecommendations] = useState([]);

  // ── Single-brand recommendation ────────────────────────────────────────────
  const getRecommendation = async () => {
    if (!measurements || !selectedBrand || !selectedCategory) {
      setError('Please provide measurements, brand, and category');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getSizeRecommendation(
        measurements, selectedBrand, selectedCategory, 'Regular'
      );
      if (data.success) {
        setRecommendation(data.data.recommendation);
        setMultipleRecommendations([]);
      } else {
        setError(data.error || 'Failed to get recommendation');
      }
    } catch (err) {
      setError('Network error. Please check if the backend server is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Multi-brand recommendations ────────────────────────────────────────────
  const getMultipleBrandRecommendations = async () => {
    if (!measurements || !selectedCategory) {
      setError('Please provide measurements and category');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMultiBrandRecommendations(
        measurements, selectedCategory, 'Regular', 60.0
      );
      if (data.success) {
        setMultipleRecommendations(data.data.recommendations);
        setRecommendation(null);
      } else {
        setError(data.error || 'Failed to get recommendations');
      }
    } catch (err) {
      setError('Network error. Please check if the backend server is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when parameters are available
  useEffect(() => {
    if (measurements && selectedBrand && selectedCategory) {
      getRecommendation();
    }
  }, [selectedBrand, selectedCategory]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getConfidenceBadgeStyle = (confidence) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getFitIcon = (fit) => {
    switch (fit) {
      case 'perfect':           return <CheckCircle  className="w-4 h-4 text-green-600" />;
      case 'slightly_small':
      case 'slightly_large':    return <Info         className="w-4 h-4 text-blue-600"  />;
      case 'too_small':
      case 'too_large':         return <AlertTriangle className="w-4 h-4 text-red-600"  />;
      default:                  return <Info         className="w-4 h-4 text-gray-600"  />;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[#8B5A5A] p-2.5 rounded-lg">
            <Shirt className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-serif text-2xl text-[#2C2C2C]">Size Recommendation</h2>
        </div>

        <div className="flex gap-3">
          <button
            onClick={getRecommendation}
            disabled={loading || !selectedBrand || !selectedCategory}
            className="px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#704848] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading…' : 'Get Size for Selected Brand'}
          </button>
          <button
            onClick={getMultipleBrandRecommendations}
            disabled={loading || !selectedCategory}
            className="px-4 py-2 border border-[#8B5A5A] text-[#8B5A5A] rounded-lg hover:bg-[#FAF8F5] disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading…' : 'Compare All Brands'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Single Brand Result */}
      {recommendation && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif text-xl text-[#2C2C2C]">
                {recommendation.brand_name} – {recommendation.category_name}
              </h3>
              <p className="text-sm text-gray-500">{recommendation.fit_type} Fit</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConfidenceBadgeStyle(recommendation.confidence)}`}>
              {recommendation.confidence.toFixed(1)}% Confidence
            </span>
          </div>

          <div className="text-center p-8 bg-gradient-to-br from-[#FAF8F5] to-[#F5F1E9] rounded-lg mb-6 border border-[#E5E0D8]">
            <p className="text-sm text-[#8B5A5A] uppercase tracking-wide font-medium mb-2">Recommended Size</p>
            <p className="text-6xl font-bold text-[#8B5A5A] mb-2">{recommendation.recommended_size}</p>
            <p className="text-sm text-gray-600">Match Score: {recommendation.match_score.toFixed(1)}%</p>
          </div>

          {recommendation.fit_advice?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-[#2C2C2C] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#8B5A5A]" /> Fit Advice
              </h4>
              <div className="space-y-2">
                {recommendation.fit_advice.map((advice, i) => (
                  <div key={i} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">{advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendation.match_details?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-[#2C2C2C] mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#8B5A5A]" /> Measurement Details
              </h4>
              <div className="space-y-2">
                {recommendation.match_details.map((detail, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#FAF8F5] rounded-lg border border-[#E5E0D8] hover:border-[#8B5A5A] transition-colors">
                    <div className="flex items-center gap-3">
                      {getFitIcon(detail.fit)}
                      <span className="font-medium text-[#2C2C2C] capitalize">
                        {detail.measurement.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Your: <span className="font-medium">{detail.user_value} cm</span> |{' '}
                      Size: <span className="font-medium">{detail.size_range}</span>
                    </div>
                    <span className="px-2 py-1 bg-white border border-[#E5E0D8] rounded text-sm font-medium text-[#8B5A5A]">
                      {detail.score.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendation.alternatives?.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#2C2C2C] mb-3">Alternative Sizes</h4>
              <div className="grid grid-cols-3 gap-3">
                {recommendation.alternatives.map((alt, i) => (
                  <div key={i} className="p-4 border border-[#E5E5E5] rounded-lg text-center hover:border-[#8B5A5A] hover:shadow-sm transition-all">
                    <p className="text-2xl font-bold text-[#2C2C2C]">{alt.size}</p>
                    <p className="text-sm text-[#8B5A5A] font-medium">{alt.score.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">{alt.fit_note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Brand Results */}
      {multipleRecommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
          <h3 className="font-serif text-xl text-[#2C2C2C] mb-4">Your Size Across Brands</h3>
          <div className="space-y-3">
            {multipleRecommendations.map((rec, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-[#E5E5E5] rounded-lg hover:border-[#8B5A5A] hover:bg-[#FAF8F5] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#8B5A5A] to-[#704848] rounded-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{rec.recommended_size}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#2C2C2C]">{rec.brand_name}</p>
                    <p className="text-sm text-gray-600">{rec.category_name}</p>
                    <p className="text-xs text-gray-500">Match: {rec.match_score.toFixed(1)}%</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceBadgeStyle(rec.confidence)}`}>
                  {rec.confidence.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && multipleRecommendations.length === 0 && !recommendation && measurements && selectedCategory && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">No Size Recommendations Available</h4>
              <p className="text-sm text-yellow-800 mb-3">
                We couldn't find any sizes that match your measurements for the selected category. This could mean:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Your measurements fall outside the available size ranges</li>
                <li>There are no size charts configured for this category and brand combination</li>
                <li>The selected category may need extended or plus-size options</li>
              </ul>
              <p className="text-sm text-yellow-800 mt-3">
                <strong>Tip:</strong> Try selecting a different category or contact admin to add more size ranges.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SizeRecommendation;