import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Package, Users, TrendingUp } from 'lucide-react';

export function ComprehensiveView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBrands, setExpandedBrands] = useState({});
  const [selectedGender, setSelectedGender] = useState('All');

  useEffect(() => {
    fetchComprehensiveData();
  }, []);

  const fetchComprehensiveData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/comprehensive-view');
      if (!response.ok) {
        throw new Error('Failed to fetch comprehensive data');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        // Expand all brands by default
        const expanded = {};
        result.data.brand_summary.forEach(brand => {
          expanded[brand.brand_id] = true;
        });
        setExpandedBrands(expanded);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBrand = (brandId) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brandId]: !prev[brandId]
    }));
  };

  // Group data by brand and category
  const groupedData = React.useMemo(() => {
    if (!data?.comprehensive_data) return {};
    
    const grouped = {};
    data.comprehensive_data.forEach(row => {
      if (!row.brand_name) return;
      
      if (!grouped[row.brand_name]) {
        grouped[row.brand_name] = {
          brand_id: row.brand_id,
          country: row.country,
          size_system: row.size_system,
          categories: {}
        };
      }
      
      if (row.category_name) {
        const catKey = `${row.category_name} (${row.gender})`;
        if (!grouped[row.brand_name].categories[catKey]) {
          grouped[row.brand_name].categories[catKey] = {
            category_name: row.category_name,
            gender: row.gender,
            chart_id: row.chart_id,
            fit_type: row.fit_type,
            sizes: []
          };
        }
        
        if (row.size_id && row.size_label) {
          grouped[row.brand_name].categories[catKey].sizes.push({
            size_id: row.size_id,
            size_label: row.size_label,
            size_order: row.size_order,
            measurements: {
              chest: row.chest_min && row.chest_max ? `${row.chest_min}-${row.chest_max}` : '-',
              waist: row.waist_min && row.waist_max ? `${row.waist_min}-${row.waist_max}` : '-',
              hip: row.hip_min && row.hip_max ? `${row.hip_min}-${row.hip_max}` : '-',
              shoulder: row.shoulder_breadth_min && row.shoulder_breadth_max ? `${row.shoulder_breadth_min}-${row.shoulder_breadth_max}` : '-',
              arm: row.arm_length_min && row.arm_length_max ? `${row.arm_length_min}-${row.arm_length_max}` : '-',
              bicep: row.bicep_min && row.bicep_max ? `${row.bicep_min}-${row.bicep_max}` : '-',
              leg: row.leg_length_min && row.leg_length_max ? `${row.leg_length_min}-${row.leg_length_max}` : '-',
              thigh: row.thigh_min && row.thigh_max ? `${row.thigh_min}-${row.thigh_max}` : '-',
              height: row.height_min && row.height_max ? `${row.height_min}-${row.height_max}` : '-',
            }
          });
        }
      }
    });
    
    return grouped;
  }, [data]);

  // Filter by search and gender
  const filteredData = React.useMemo(() => {
    let filtered = { ...groupedData };
    
    // Filter by search term
    if (searchTerm) {
      filtered = Object.entries(filtered).reduce((acc, [brandName, brandData]) => {
        if (brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            brandData.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            Object.keys(brandData.categories).some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))) {
          acc[brandName] = brandData;
        }
        return acc;
      }, {});
    }
    
    // Filter by gender
    if (selectedGender !== 'All') {
      filtered = Object.entries(filtered).reduce((acc, [brandName, brandData]) => {
        const filteredCategories = Object.entries(brandData.categories).reduce((catAcc, [catKey, catData]) => {
          if (catData.gender === selectedGender) {
            catAcc[catKey] = catData;
          }
          return catAcc;
        }, {});
        
        if (Object.keys(filteredCategories).length > 0) {
          acc[brandName] = { ...brandData, categories: filteredCategories };
        }
        return acc;
      }, {});
    }
    
    return filtered;
  }, [groupedData, searchTerm, selectedGender]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5A5A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comprehensive view...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">Error loading comprehensive view</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.brand_summary && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Brands</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{data.brand_summary.length}</p>
                </div>
                <Package className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Categories</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">
                    {data.brand_summary.reduce((sum, b) => sum + (b.total_categories || 0), 0)}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500 opacity-50" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Sizes</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">
                    {data.brand_summary.reduce((sum, b) => sum + (b.total_sizes || 0), 0)}
                  </p>
                </div>
                <Users className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search brands, countries, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
          />
        </div>
        
        <div className="flex gap-2">
          {['All', 'Men', 'Women', 'Unisex'].map(gender => (
            <button
              key={gender}
              onClick={() => setSelectedGender(gender)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGender === gender
                  ? 'bg-[#8B5A5A] text-white'
                  : 'bg-white border border-[#E5E0D8] text-gray-700 hover:bg-gray-50'
              }`}
            >
              {gender}
            </button>
          ))}
        </div>
      </div>

      {/* Comprehensive Table */}
      <div className="space-y-4">
        {Object.entries(filteredData).map(([brandName, brandData]) => (
          <motion.div
            key={brandName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-[#E5E0D8] overflow-hidden"
          >
            {/* Brand Header */}
            <button
              onClick={() => toggleBrand(brandData.brand_id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8B5A5A] to-[#6B4A4A] rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  {brandName.charAt(0)}
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-serif font-bold text-[#2C2C2C]">{brandName}</h3>
                  <p className="text-sm text-gray-600">
                    {brandData.country} • {brandData.size_system} Sizing • {Object.keys(brandData.categories).length} Categories
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Gender Distribution Badges */}
                {data?.brand_summary && (
                  <div className="flex gap-2">
                    {(() => {
                      const summary = data.brand_summary.find(b => b.brand_id === brandData.brand_id);
                      return (
                        <>
                          {summary?.men_categories > 0 && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              ♂ {summary.men_categories} Men
                            </span>
                          )}
                          {summary?.women_categories > 0 && (
                            <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
                              ♀ {summary.women_categories} Women
                            </span>
                          )}
                          {summary?.unisex_categories > 0 && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                              ⚥ {summary.unisex_categories} Unisex
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {expandedBrands[brandData.brand_id] ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedBrands[brandData.brand_id] && (
              <div className="border-t border-[#E5E0D8]">
                {Object.entries(brandData.categories).map(([catKey, catData]) => (
                  <div key={catKey} className="border-b border-[#E5E0D8] last:border-b-0">
                    {/* Category Header */}
                    <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          catData.gender === 'Men' ? 'bg-blue-100 text-blue-700' :
                          catData.gender === 'Women' ? 'bg-pink-100 text-pink-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {catData.gender}
                        </span>
                        <h4 className="font-semibold text-gray-800">{catData.category_name}</h4>
                        {catData.fit_type && (
                          <span className="text-sm text-gray-500">({catData.fit_type})</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">{catData.sizes.length} sizes</span>
                    </div>

                    {/* Sizes Table */}
                    {catData.sizes.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Size</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Chest (cm)</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Waist (cm)</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Hip (cm)</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Shoulder</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Arm</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Leg</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Height</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catData.sizes.map((size, idx) => (
                              <tr key={size.size_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 font-medium text-gray-900">{size.size_label}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{size.measurements.chest}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{size.measurements.waist}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{size.measurements.hip}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{size.measurements.shoulder}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{size.measurements.arm}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{size.measurements.leg}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{size.measurements.height}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {Object.keys(filteredData).length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No data found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
