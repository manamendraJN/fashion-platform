import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ComprehensiveView } from '../components/ComprehensiveView';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Package, Grid, Ruler, Users, Search, X, Plus, Check, AlertCircle, Table, Trash2 } from 'lucide-react';

// Modal Component (extracted to prevent re-creation on every render)
const Modal = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E5E0D8]">
              <h3 className="text-xl font-serif text-[#2C2C2C]">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comprehensive'); // 'comprehensive' or 'detailed'
  
  // Search states for each table
  const [brandSearch, setBrandSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [sizeChartSearch, setSizeChartSearch] = useState('');
  const [sizeSearch, setSizeSearch] = useState('');
  
  // Modal states
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSizeChartModal, setShowSizeChartModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  
  // Form states
  const [brandForm, setBrandForm] = useState({ brand_name: '', country: '', size_system: 'US', website: '' });
  const [categoryForm, setCategoryForm] = useState({ category_name: '', gender: 'Men', description: '' });
  const [sizeChartForm, setSizeChartForm] = useState({ brand_id: '', category_id: '', fit_type: 'Regular', notes: '' });
  const [sizeForm, setSizeForm] = useState({ 
    chart_id: '', 
    size_label: '', 
    size_order: 1,
    chest_min: '', chest_max: '', 
    waist_min: '', waist_max: '', 
    hip_min: '', hip_max: '',
    shoulder_breadth_min: '', shoulder_breadth_max: '',
    arm_length_min: '', arm_length_max: '',
    bicep_min: '', bicep_max: '',
    leg_length_min: '', leg_length_max: '',
    thigh_min: '', thigh_max: '',
    height_min: '', height_max: ''
  });
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Form submission loading states
  const [submitting, setSubmitting] = useState(false);
  
  // Delete confirmation states
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: null, name: '' });

  useEffect(() => {
    fetchDatabaseOverview();
  }, []);

  const fetchDatabaseOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/database-overview');
      if (!response.ok) {
        throw new Error('Failed to fetch database overview');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filteredBrands = data?.brands?.filter(brand => 
    brand.brand_name.toLowerCase().includes(brandSearch.toLowerCase()) ||
    brand.country?.toLowerCase().includes(brandSearch.toLowerCase()) ||
    brand.size_system.toLowerCase().includes(brandSearch.toLowerCase())
  ) || [];

  const filteredCategories = data?.categories?.filter(category =>
    category.category_name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    category.gender?.toLowerCase().includes(categorySearch.toLowerCase()) ||
    category.description?.toLowerCase().includes(categorySearch.toLowerCase())
  ) || [];

  const filteredSizeCharts = data?.size_charts?.filter(chart =>
    chart.brand_name.toLowerCase().includes(sizeChartSearch.toLowerCase()) ||
    chart.category_name.toLowerCase().includes(sizeChartSearch.toLowerCase()) ||
    chart.fit_type?.toLowerCase().includes(sizeChartSearch.toLowerCase())
  ) || [];

  const filteredSizes = data?.sample_sizes?.filter(size =>
    size.brand_name.toLowerCase().includes(sizeSearch.toLowerCase()) ||
    size.category_name.toLowerCase().includes(sizeSearch.toLowerCase()) ||
    size.size_label.toLowerCase().includes(sizeSearch.toLowerCase())
  ) || [];

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Delete handlers
  const handleDelete = async () => {
    const { type, id } = deleteConfirm;
    setSubmitting(true);
    
    try {
      const endpoints = {
        brand: `/api/admin/brands/${id}`,
        category: `/api/admin/categories/${id}`,
        sizeChart: `/api/admin/size-charts/${id}`,
        size: `/api/admin/sizes/${id}`
      };
      
      const response = await fetch(`http://localhost:5000${endpoints[type]}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        showToast(result.message, 'success');
        setDeleteConfirm({ show: false, type: '', id: null, name: '' });
        fetchDatabaseOverview();
      } else {
        showToast(result.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Form submission handlers
  const handleCreateBrand = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandForm)
      });
      const result = await response.json();
      
      if (result.success) {
        showToast(`Brand "${brandForm.brand_name}" created successfully!`);
        setShowBrandModal(false);
        setBrandForm({ brand_name: '', country: '', size_system: 'US', website: '' });
        fetchDatabaseOverview(); // Refresh data
      } else {
        showToast(result.error || 'Failed to create brand', 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });
      const result = await response.json();
      
      if (result.success) {
        showToast(`Category "${categoryForm.category_name}" created successfully!`);
        setShowCategoryModal(false);
        setCategoryForm({ category_name: '', gender: 'Men', description: '' });
        fetchDatabaseOverview(); // Refresh data
      } else {
        showToast(result.error || 'Failed to create category', 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSizeChart = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/size-charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: parseInt(sizeChartForm.brand_id),
          category_id: parseInt(sizeChartForm.category_id),
          fit_type: sizeChartForm.fit_type,
          notes: sizeChartForm.notes
        })
      });
      const result = await response.json();
      
      if (result.success) {
        showToast('Size chart created successfully!');
        setShowSizeChartModal(false);
        setSizeChartForm({ brand_id: '', category_id: '', fit_type: 'Regular', notes: '' });
        fetchDatabaseOverview(); // Refresh data
      } else {
        showToast(result.error || 'Failed to create size chart', 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSize = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Build measurements object from form (only include non-empty values)
      const measurements = {};
      const fields = ['chest', 'waist', 'hip', 'shoulder_breadth', 'arm_length', 'bicep', 'leg_length', 'thigh', 'height'];
      
      fields.forEach(field => {
        const minVal = parseFloat(sizeForm[`${field}_min`]);
        const maxVal = parseFloat(sizeForm[`${field}_max`]);
        if (!isNaN(minVal) && !isNaN(maxVal)) {
          measurements[field] = [minVal, maxVal];
        }
      });

      const response = await fetch('http://localhost:5000/api/admin/sizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chart_id: parseInt(sizeForm.chart_id),
          size_label: sizeForm.size_label,
          size_order: parseInt(sizeForm.size_order),
          measurements: measurements
        })
      });
      const result = await response.json();
      
      if (result.success) {
        showToast(`Size "${sizeForm.size_label}" created successfully!`);
        setShowSizeModal(false);
        setSizeForm({ 
          chart_id: '', size_label: '', size_order: 1,
          chest_min: '', chest_max: '', waist_min: '', waist_max: '', 
          hip_min: '', hip_max: '', shoulder_breadth_min: '', shoulder_breadth_max: '',
          arm_length_min: '', arm_length_max: '', bicep_min: '', bicep_max: '',
          leg_length_min: '', leg_length_max: '', thigh_min: '', thigh_max: '',
          height_min: '', height_max: ''
        });
        fetchDatabaseOverview(); // Refresh data
      } else {
        showToast(result.error || 'Failed to create size', 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5A5A] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading database overview...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <p className="font-medium">Error loading database overview</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Modal */}
      <Modal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} title="Add New Brand">
        <form onSubmit={handleCreateBrand} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
            <input
              type="text"
              required
              value={brandForm.brand_name}
              onChange={(e) => setBrandForm({ ...brandForm, brand_name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
              placeholder="e.g., Nike, Zara"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={brandForm.country}
              onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
              placeholder="e.g., USA, Japan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size System</label>
            <select
              value={brandForm.size_system}
              onChange={(e) => setBrandForm({ ...brandForm, size_system: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
            >
              <option value="US">US</option>
              <option value="EU">EU</option>
              <option value="UK">UK</option>
              <option value="JP">JP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={brandForm.website}
              onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
              placeholder="https://example.com"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowBrandModal(false)}
              className="flex-1 px-4 py-2 border border-[#E5E0D8] text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Brand'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Add New Category">
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={categoryForm.category_name}
              onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
              placeholder="e.g., T-Shirt, Jeans"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={categoryForm.gender}
              onChange={(e) => setCategoryForm({ ...categoryForm, gender: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
            >
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
              rows="3"
              placeholder="Optional description"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="flex-1 px-4 py-2 border border-[#E5E0D8] text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Size Chart Modal */}
      <Modal isOpen={showSizeChartModal} onClose={() => setShowSizeChartModal(false)} title="Add New Size Chart">
        <form onSubmit={handleCreateSizeChart} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
            <select
              required
              value={sizeChartForm.brand_id}
              onChange={(e) => setSizeChartForm({ ...sizeChartForm, brand_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
            >
              <option value="">Select a brand</option>
              {data?.brands?.map(brand => (
                <option key={brand.brand_id} value={brand.brand_id}>{brand.brand_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              required
              value={sizeChartForm.category_id}
              onChange={(e) => setSizeChartForm({ ...sizeChartForm, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
            >
              <option value="">Select a category</option>
              {data?.categories?.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name} ({cat.gender})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fit Type</label>
            <select
              value={sizeChartForm.fit_type}
              onChange={(e) => setSizeChartForm({ ...sizeChartForm, fit_type: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
            >
              <option value="Regular">Regular</option>
              <option value="Slim">Slim</option>
              <option value="Relaxed">Relaxed</option>
              <option value="Oversized">Oversized</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={sizeChartForm.notes}
              onChange={(e) => setSizeChartForm({ ...sizeChartForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
              rows="3"
              placeholder="Optional notes"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowSizeChartModal(false)}
              className="flex-1 px-4 py-2 border border-[#E5E0D8] text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Size Chart'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Size Modal */}
      <Modal isOpen={showSizeModal} onClose={() => setShowSizeModal(false)} title="Add New Size">
        <form onSubmit={handleCreateSize} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size Chart *</label>
            <select
              required
              value={sizeForm.chart_id}
              onChange={(e) => setSizeForm({ ...sizeForm, chart_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
            >
              <option value="">Select a size chart</option>
              {data?.size_charts?.map(chart => (
                <option key={chart.chart_id} value={chart.chart_id}>
                  {chart.brand_name} - {chart.category_name} ({chart.fit_type})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size Label *</label>
              <input
                type="text"
                required
                value={sizeForm.size_label}
                onChange={(e) => setSizeForm({ ...sizeForm, size_label: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
                placeholder="e.g., S, M, L, XL, 32"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order *</label>
              <input
                type="number"
                required
                min="1"
                value={sizeForm.size_order}
                onChange={(e) => setSizeForm({ ...sizeForm, size_order: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A]"
                placeholder="1, 2, 3..."
              />
            </div>
          </div>
          
          <div className="border-t border-[#E5E0D8] pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Body Measurements (cm)</h4>
            <p className="text-xs text-gray-500 mb-3">Enter min and max values. Leave blank if not applicable.</p>
            
            {/* Chest */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chest Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.chest_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, chest_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="85"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chest Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.chest_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, chest_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="90"
                />
              </div>
            </div>
            
            {/* Waist */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Waist Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.waist_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, waist_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Waist Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.waist_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, waist_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="75"
                />
              </div>
            </div>
            
            {/* Hip */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hip Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.hip_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, hip_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hip Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.hip_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, hip_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="95"
                />
              </div>
            </div>
            
            {/* Shoulder Breadth */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Shoulder Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.shoulder_breadth_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, shoulder_breadth_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Shoulder Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.shoulder_breadth_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, shoulder_breadth_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="45"
                />
              </div>
            </div>
            
            {/* Arm Length */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Arm Length Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.arm_length_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, arm_length_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="58"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Arm Length Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.arm_length_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, arm_length_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="62"
                />
              </div>
            </div>
            
            {/* Bicep */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bicep Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.bicep_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, bicep_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="28"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bicep Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.bicep_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, bicep_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="32"
                />
              </div>
            </div>
            
            {/* Leg Length */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leg Length Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.leg_length_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, leg_length_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="75"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leg Length Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.leg_length_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, leg_length_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="80"
                />
              </div>
            </div>
            
            {/* Thigh */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Thigh Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.thigh_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, thigh_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="52"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Thigh Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.thigh_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, thigh_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="56"
                />
              </div>
            </div>
            
            {/* Height */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Height Min</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.height_min}
                  onChange={(e) => setSizeForm({ ...sizeForm, height_min: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="165"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Height Max</label>
                <input
                  type="number"
                  step="0.1"
                  value={sizeForm.height_max}
                  onChange={(e) => setSizeForm({ ...sizeForm, height_max: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] text-sm"
                  placeholder="175"
                />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowSizeModal(false)}
              className="flex-1 px-4 py-2 border border-[#E5E0D8] text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Size'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="mb-10">
        <h1 className="text-3xl font-serif text-[#2C2C2C] mb-2">Database Management</h1>
        <p className="text-gray-600">View and manage all database contents.</p>
        
        {/* Tab Navigation */}
        <div className="flex space-x-2 mt-6 border-b border-[#E5E0D8]">
          <button
            onClick={() => setActiveTab('comprehensive')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'comprehensive'
                ? 'text-[#8B5A5A] border-b-2 border-[#8B5A5A]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Table className="w-4 h-4" />
              <span>Comprehensive View</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'detailed'
                ? 'text-[#8B5A5A] border-b-2 border-[#8B5A5A]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Detailed Tables</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'comprehensive' ? (
        <ComprehensiveView />
      ) : (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
        {[
          { label: 'Brands', value: data?.summary?.total_brands || 0, icon: Package, color: 'bg-[#8B5A5A]' },
          { label: 'Categories', value: data?.summary?.total_categories || 0, icon: Grid, color: 'bg-[#2C2C2C]' },
          { label: 'Size Charts', value: data?.summary?.total_size_charts || 0, icon: Database, color: 'bg-[#7A9B8E]' },
          { label: 'Total Sizes', value: data?.summary?.total_sizes || 0, icon: Ruler, color: 'bg-[#A8A8A8]' },
          { label: 'Users', value: data?.summary?.total_users || 0, icon: Users, color: 'bg-[#B4A49D]' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-xl border border-[#E5E0D8] shadow-sm flex items-center space-x-4"
          >
            <div className={`p-3 rounded-full ${stat.color} text-white`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-serif font-medium text-[#2C2C2C]">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-8">
        {/* Brands Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl border border-[#E5E0D8] shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-serif text-[#2C2C2C]">Brands</h3>
              <span className="text-sm text-gray-500">
                {filteredBrands.length} of {data?.brands?.length || 0} brands
              </span>
            </div>
            <button
              onClick={() => setShowBrandModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Brand</span>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by brand name, country, or size system..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] focus:border-transparent text-sm"
            />
            {brandSearch && (
              <button
                onClick={() => setBrandSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D8]">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Brand Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Country</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Size System</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Website</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.length > 0 ? (
                  filteredBrands.map((brand, i) => (
                    <tr key={brand.brand_id} className="border-b border-[#E5E0D8] hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#2C2C2C]">{brand.brand_name}</td>
                      <td className="py-3 px-4 text-gray-600">{brand.country || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#E5E0D8] text-gray-700 rounded text-xs">
                          {brand.size_system}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-blue-600 text-xs truncate max-w-xs">
                        {brand.website ? (
                          <a href={brand.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {brand.website}
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDeleteConfirm({ show: true, type: 'brand', id: brand.brand_id, name: brand.brand_name })}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                          title="Delete brand"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No brands found matching "{brandSearch}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Categories Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-2xl border border-[#E5E0D8] shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-serif text-[#2C2C2C]">Garment Categories</h3>
              <span className="text-sm text-gray-500">
                {filteredCategories.length} of {data?.categories?.length || 0} categories
              </span>
            </div>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by category name, gender, or description..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] focus:border-transparent text-sm"
            />
            {categorySearch && (
              <button
                onClick={() => setCategorySearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D8]">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Gender</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category, i) => (
                    <tr key={category.category_id} className="border-b border-[#E5E0D8] hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#2C2C2C]">{category.category_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          category.gender === 'Men' ? 'bg-blue-100 text-blue-700' :
                          category.gender === 'Women' ? 'bg-pink-100 text-pink-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {category.gender || 'Unisex'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{category.description || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDeleteConfirm({ show: true, type: 'category', id: category.category_id, name: category.category_name })}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500">
                      No categories found matching "{categorySearch}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Size Charts Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-2xl border border-[#E5E0D8] shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-serif text-[#2C2C2C]">Size Charts</h3>
              <span className="text-sm text-gray-500">
                {filteredSizeCharts.length} of {data?.size_charts?.length || 0} charts
              </span>
            </div>
            <button
              onClick={() => setShowSizeChartModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Size Chart</span>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by brand, category, or fit type..."
              value={sizeChartSearch}
              onChange={(e) => setSizeChartSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] focus:border-transparent text-sm"
            />
            {sizeChartSearch && (
              <button
                onClick={() => setSizeChartSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D8]">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Brand</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Fit Type</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Size Count</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSizeCharts.length > 0 ? (
                  filteredSizeCharts.map((chart, i) => (
                    <tr key={chart.size_chart_id} className="border-b border-[#E5E0D8] hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#2C2C2C]">{chart.brand_name}</td>
                      <td className="py-3 px-4 text-gray-600">{chart.category_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#E5E0D8] text-gray-700 rounded text-xs">
                          {chart.fit_type || 'Regular'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#8B5A5A] text-white rounded-full text-xs font-bold">
                          {chart.size_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{chart.notes || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDeleteConfirm({ show: true, type: 'sizeChart', id: chart.chart_id, name: `${chart.brand_name} - ${chart.category_name}` })}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                          title="Delete size chart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      No size charts found matching "{sizeChartSearch}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Sample Sizes Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-8 rounded-2xl border border-[#E5E0D8] shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-serif text-[#2C2C2C]">Sizes</h3>
              <span className="text-sm text-gray-500">
                {filteredSizes.length} of {data?.sample_sizes?.length || 0} sizes
              </span>
            </div>
            <button
              onClick={() => setShowSizeModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#7A4A4A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Size</span>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by brand, category, or size label..."
              value={sizeSearch}
              onChange={(e) => setSizeSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-[#E5E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] focus:border-transparent text-sm"
            />
            {sizeSearch && (
              <button
                onClick={() => setSizeSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D8]">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Brand</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Size Label</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Measurements</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSizes.length > 0 ? (
                  filteredSizes.map((size, i) => (
                    <tr key={i} className="border-b border-[#E5E0D8] hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#2C2C2C]">{size.brand_name}</td>
                      <td className="py-3 px-4 text-gray-600">{size.category_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#2C2C2C] text-white rounded font-bold">
                          {size.size_label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          {size.chest_min && (
                            <span className="text-xs text-gray-600">
                              Chest: {size.chest_min}-{size.chest_max}cm
                            </span>
                          )}
                          {size.waist_min && (
                            <span className="text-xs text-gray-600">
                              Waist: {size.waist_min}-{size.waist_max}cm
                            </span>
                          )}
                          {size.hip_min && (
                            <span className="text-xs text-gray-600">
                              Hip: {size.hip_min}-{size.hip_max}cm
                            </span>
                          )}
                          {size.shoulder_breadth_min && (
                            <span className="text-xs text-gray-600">
                              Shoulder: {size.shoulder_breadth_min}-{size.shoulder_breadth_max}cm
                            </span>
                          )}
                          {size.leg_length_min && (
                            <span className="text-xs text-gray-600">
                              Leg: {size.leg_length_min}-{size.leg_length_max}cm
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDeleteConfirm({ show: true, type: 'size', id: size.size_id, name: size.size_label })}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                          title="Delete size"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No sizes found matching "{sizeSearch}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
      </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-serif text-[#2C2C2C]">Confirm Deletion</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {deleteConfirm.type === 'sizeChart' ? 'size chart' : deleteConfirm.type}{' '}
              <span className="font-semibold text-[#2C2C2C]">"{deleteConfirm.name}"</span>?
              {(deleteConfirm.type === 'brand' || deleteConfirm.type === 'category' || deleteConfirm.type === 'sizeChart') && (
                <span className="block mt-2 text-sm text-red-600">
                  This will also delete all related {deleteConfirm.type === 'brand' ? 'size charts and sizes' : deleteConfirm.type === 'category' ? 'size charts and sizes' : 'sizes'}.
                </span>
              )}
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, type: '', id: null, name: '' })}
                className="flex-1 px-4 py-2 border border-[#E5E0D8] text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteConfirm({ show: false, type: '', id: null, name: '' });
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
