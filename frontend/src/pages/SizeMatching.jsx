import React, { useState, useEffect } from 'react';
import { Upload, Ruler, Shirt, CheckCircle, Calendar, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SizeRecommendation from '../components/SizeRecommendation';
import { Layout } from '../components/Layout';

/**
 * SizeMatching Page
 * Complete workflow for getting size recommendations
 */
const SizeMatching = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [measurements, setMeasurements] = useState(null);
  const [measurementDate, setMeasurementDate] = useState(null);
  const [measurementAgeDays, setMeasurementAgeDays] = useState(null);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);

  // Fetch latest measurements, brands and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingMeasurements(true);
      try {
        const [measurementsRes, brandsRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:5000/api/size/measurements/latest?user_identifier=default&max_age_days=90'),
          fetch('http://localhost:5000/api/size/brands'),
          fetch('http://localhost:5000/api/size/categories')
        ]);

        const measurementsData = await measurementsRes.json();
        const brandsData = await brandsRes.json();
        const categoriesData = await categoriesRes.json();

        // Load measurements if available
        if (measurementsData.success && measurementsData.data.measurements) {
          setMeasurements(measurementsData.data.measurements);
          setMeasurementDate(measurementsData.data.measured_at);
          setMeasurementAgeDays(measurementsData.data.age_days);
          setStep(2); // Skip to selection step if measurements exist
        }

        if (brandsData.success) {
          setBrands(brandsData.data.brands);
        }
        if (categoriesData.success) {
          setCategories(categoriesData.data.categories);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingMeasurements(false);
      }
    };

    fetchData();
  }, []);

  // Handle measurements received
  const handleMeasurementsReceived = (data) => {
    setMeasurements(data);
    setStep(2);
  };

  // Use sample measurements for demo
  const useSampleMeasurements = () => {
    const sampleData = {
      chest: 95,
      waist: 82,
      hip: 98,
      shoulder_breadth: 45,
      height: 175
    };
    setMeasurements(sampleData);
    setMeasurementDate(new Date().toISOString());
    setMeasurementAgeDays(0);
    setStep(2);
  };

  // Navigate to measurements page
  const goToMeasurements = () => {
    navigate('/measurements');
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get measurement status
  const getMeasurementStatus = () => {
    if (!measurementAgeDays) return { color: 'green', text: 'Recent' };
    if (measurementAgeDays <= 30) return { color: 'green', text: 'Recent' };
    if (measurementAgeDays <= 60) return { color: 'yellow', text: 'Moderate' };
    if (measurementAgeDays <= 90) return { color: 'orange', text: 'Aging' };
    return { color: 'red', text: 'Outdated' };
  };

  // Progress indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {/* Step 1 */}
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            step >= 1 ? 'bg-[#8B5A5A] text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Measurements</span>
        </div>
        
        <div className="w-16 h-0.5 bg-gray-300"></div>

        {/* Step 2 */}
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            step >= 2 ? 'bg-[#8B5A5A] text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Selection</span>
        </div>

        <div className="w-16 h-0.5 bg-gray-300"></div>

        {/* Step 3 */}
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            step >= 3 ? 'bg-[#8B5A5A] text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Recommendations</span>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-[#2C2C2C] mb-2">
            Find Your Perfect Size
          </h1>
          <p className="text-gray-600">
            Get personalized size recommendations based on your body measurements
          </p>
        </div>

        <StepIndicator />

        {/* Step 1: Get Measurements */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-8 border border-[#E5E5E5]">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#8B5A5A] p-2.5 rounded-lg">
                <Ruler className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-serif text-2xl text-[#2C2C2C]">
                Step 1: Provide Body Measurements
              </h2>
            </div>

            {loadingMeasurements ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-[#8B5A5A] mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading your measurements...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* No measurements found message */}
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-1">No Recent Measurements Found</h3>
                      <p className="text-sm text-amber-800 mb-3">
                        We couldn't find any body measurements from the last 3 months. 
                        Please measure your body first to get accurate size recommendations.
                      </p>
                      <button
                        onClick={goToMeasurements}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#704848] transition-colors"
                      >
                        <Ruler className="w-4 h-4" />
                        Go to Body Measurement Page
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-4">OR</p>
                  <button
                    onClick={useSampleMeasurements}
                    className="px-6 py-3 border border-[#8B5A5A] text-[#8B5A5A] rounded-lg hover:bg-[#FAF8F5] transition-colors"
                  >
                    Use Sample Measurements for Demo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Brand and Category */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Measurement Status Card */}
            {measurements && measurementDate && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-[#E5E5E5]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-green-100 p-2.5 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#2C2C2C] mb-1">
                        Using Your Recorded Measurements
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Last measured: <span className="font-medium text-[#2C2C2C]">{formatDate(measurementDate)}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          getMeasurementStatus().color === 'green' ? 'bg-green-100 text-green-800' :
                          getMeasurementStatus().color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          getMeasurementStatus().color === 'orange' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {measurementAgeDays} days ago • {getMeasurementStatus().text}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 text-xs">
                        {Object.entries(measurements).map(([key, value]) => (
                          <div key={key} className="bg-[#FAF8F5] px-2 py-1.5 rounded">
                            <span className="text-gray-600 block capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-medium text-[#2C2C2C]">{value} cm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={goToMeasurements}
                    className="ml-4 px-4 py-2 border border-[#8B5A5A] text-[#8B5A5A] rounded-lg hover:bg-[#FAF8F5] transition-colors flex items-center gap-2 shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Update Measurements
                  </button>
                </div>
              </div>
            )}

            {/* Selection Card */}
            <div className="bg-white rounded-lg shadow-sm p-8 border border-[#E5E5E5]">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#8B5A5A] p-2.5 rounded-lg">
                  <Shirt className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-serif text-2xl text-[#2C2C2C]">
                  Step 2: Select Garment Details
                </h2>
              </div>

              <div className="space-y-6">
              {/* Brand Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] focus:border-transparent"
                >
                  <option value="">Choose a brand...</option>
                  {brands.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.brand_name} ({brand.brand_country})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Garment Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5A5A] focus:border-transparent"
                >
                  <option value="">Choose a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name} ({cat.gender})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={goToMeasurements}
                  className="px-6 py-2 border border-[#8B5A5A] text-[#8B5A5A] rounded-lg hover:bg-[#FAF8F5] transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Measurements
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedBrand || !selectedCategory}
                  className="flex-1 px-6 py-2 bg-[#8B5A5A] text-white rounded-lg hover:bg-[#704848] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Get Size Recommendation
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Step 3: View Recommendations */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Measurement Info Banner */}
            {measurements && measurementDate && (
              <div className="bg-gradient-to-r from-[#8B5A5A]/10 to-[#704848]/10 border border-[#8B5A5A]/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#8B5A5A]" />
                    <div>
                      <p className="text-sm font-medium text-[#2C2C2C]">
                        Recommendations based on measurements from {formatDate(measurementDate)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {measurementAgeDays} days ago • {getMeasurementStatus().text}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={goToMeasurements}
                      className="px-3 py-1.5 text-sm border border-[#8B5A5A] text-[#8B5A5A] rounded-lg hover:bg-white transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Update
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="px-3 py-1.5 text-sm border border-[#8B5A5A] text-[#8B5A5A] rounded-lg hover:bg-white transition-colors"
                    >
                      Change Selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            <SizeRecommendation
              measurements={measurements}
              selectedBrand={selectedBrand}
              selectedCategory={selectedCategory}
            />
            
            {/* Back Navigation */}
            <div className="mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-[#8B5A5A] text-[#8B5A5A] rounded-lg hover:bg-[#FAF8F5] transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Selection
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SizeMatching;
