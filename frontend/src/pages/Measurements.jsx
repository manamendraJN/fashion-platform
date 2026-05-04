import React, { useState, useEffect } from 'react';
import { Upload, Activity, Camera, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '../services/api';
import ImageUpload from '../components/ImageUpload';
import MeasurementsDisplay from '../components/MeasurementsDisplay';
import MaskPreview from '../components/MaskPreview';
import MeasurementHistory from '../components/MeasurementHistory';
import { Layout } from '../components/Layout';

export function MeasurementsPage() {
  // State management
  const [frontImage, setFrontImage] = useState(null);
  const [sideImage, setSideImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [sidePreview, setSidePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [showFrontPreview, setShowFrontPreview] = useState(false);
  const [showSidePreview, setShowSidePreview] = useState(false);
  const [frontMaskData, setFrontMaskData] = useState(null);
  const [sideMaskData, setSideMaskData] = useState(null);
  const [processingPreview, setProcessingPreview] = useState(false);

  // Check API health on mount and retry on disconnection
  useEffect(() => {
    checkApiHealth();
    
    // Auto-retry health check every 3 seconds if disconnected
    const interval = setInterval(() => {
      if (apiStatus === 'error') {
        checkApiHealth();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [apiStatus]);

  const checkApiHealth = async () => {
    try {
      const health = await apiService.healthCheck();
      if (health.status === 'healthy' && health.model_loaded) {
        setApiStatus('connected');
        setError(null); // Clear any previous errors
      } else {
        setApiStatus('error');
        setError('Backend API is not ready. Please start the backend server.');
      }
    } catch (err) {
      setApiStatus('error');
      // Only set error message if not already set (avoid spam during auto-retry)
      if (!error || !error.includes('Cannot connect')) {
        setError('Cannot connect to backend API. Retrying...');
      }
    }
  };

  // Handle image uploads
const handleImageUpload = async (e, type) => {
  const file = e.target.files[0];
  if (file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    
    if (type === 'front') {
      setFrontImage(file);
      setFrontPreview(previewUrl);
      
      // Generate preview
      setProcessingPreview(true);
      try {
        const maskData = await apiService.previewMask(file);
        if (maskData.success) {
          setFrontMaskData(maskData.data);
          setShowFrontPreview(true);
        }
      } catch (err) {
        console.error('Preview generation failed:', err);
        setError('Failed to generate preview. You can still proceed with analysis.');
      } finally {
        setProcessingPreview(false);
      }
    } else {
      setSideImage(file);
      setSidePreview(previewUrl);
      
      // Generate preview
      setProcessingPreview(true);
      try {
        const maskData = await apiService.previewMask(file);
        if (maskData.success) {
          setSideMaskData(maskData.data);
          setShowSidePreview(true);
        }
      } catch (err) {
        console.error('Preview generation failed:', err);
        setError('Failed to generate preview. You can still proceed with analysis.');
      } finally {
        setProcessingPreview(false);
      }
    }
    
    setError(null);
  }
};

  // Remove image
  const handleRemoveImage = (type) => {
    if (type === 'front') {
      setFrontImage(null);
      setFrontPreview(null);
    } else {
      setSideImage(null);
      setSidePreview(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!frontImage || !sideImage) {
      setError('Please upload both front and side images');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Call complete analysis API
      const result = await apiService.completeAnalysis(
        frontImage,
        sideImage
      );

      if (result.success) {
        setResults(result.data);
        
        // Save measurements to database
        try {
          // Transform measurements: extract numeric values and convert keys
          const transformedMeasurements = {};
          Object.entries(result.data.measurements).forEach(([key, valueObj]) => {
            // Convert hyphenated keys to underscored (e.g., 'arm-length' -> 'arm_length')
            const dbKey = key.replace(/-/g, '_');
            // Extract numeric value from the object structure
            transformedMeasurements[dbKey] = valueObj.value;
          });
          
          console.log('Transformed measurements for DB:', transformedMeasurements);
          
          // Create timestamp with local time (not UTC) for accurate time recording
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          const localTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
          
          await apiService.saveMeasurements({
            measurements: transformedMeasurements,
            user_identifier: 'default', // Can be updated to use actual user ID
            gender: null,  // Can be collected from user
            measured_at: localTimestamp  // Send client's actual local time
          });
          console.log('Measurements saved successfully to database');
        } catch (saveErr) {
          console.error('Failed to save measurements:', saveErr);
          // Don't show error to user, just log it
        }
        
        // Scroll to results
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      } else {
        setError(result.error || 'Analysis failed. Please try again.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to analyze images. Please check your backend server.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFrontImage(null);
    setSideImage(null);
    setFrontPreview(null);
    setSidePreview(null);
    setResults(null);
    setError(null);
  };

  return (
    <Layout>
      {/* Title Section */}
      <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-[#2C2C2C] mb-4">
            Body Measurements
          </h1>
          <p className="text-[#8B5A5A] text-lg">
            Upload your full-body images to get accurate measurements
          </p>
          
          {/* API Status Indicator */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#E5E5E5]">
              {apiStatus === 'connected' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </>
              )}
              {apiStatus === 'checking' && (
                <>
                  <Loader2 className="w-4 h-4 text-[#8B5A5A] animate-spin" />
                  <span className="text-sm font-medium text-[#8B5A5A]">Checking...</span>
                </>
              )}
              {apiStatus === 'error' && (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Photo Guidelines */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-[#E5E5E5]">
          <div className="flex items-center gap-2 mb-5">
            <Camera className="w-5 h-5 text-[#8B5A5A]" />
            <h4 className="font-serif text-lg text-[#2C2C2C]">Photo Guidelines</h4>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Best Practices Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <h5 className="font-semibold text-sm text-emerald-900">Best Practices</h5>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <span>Plain white or solid background</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <span>Stand straight, arms slightly away</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <span>Wear fitted clothing</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <span>Good, even lighting</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <span>Same distance for both views</span>
                </li>
              </ul>
            </div>

            {/* Avoid Card */}
            <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-rose-600" />
                <h5 className="font-semibold text-sm text-rose-900">Avoid</h5>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                  <span>Cluttered backgrounds</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                  <span>Arms crossed or touching body</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                  <span>Baggy clothing</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                  <span>Poor lighting or shadows</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                  <span>Partial body shots</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8 border border-[#E5E5E5]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl text-[#2C2C2C] flex items-center gap-2">
              <Upload className="w-6 h-6 text-[#8B5A5A]" />
              Upload Images
            </h2>
            {(frontImage || sideImage) && (
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-[#8B5A5A] hover:text-[#704848] font-medium transition-colors"
              >
                Reset All
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Image Uploads */}
            <div className="grid md:grid-cols-2 gap-6">
              <ImageUpload
                label="Front View (Required) *"
                image={frontImage}
                preview={frontPreview}
                onChange={(e) => handleImageUpload(e, 'front')}
                onRemove={() => handleRemoveImage('front')}
              />
              
              <ImageUpload
                label="Side View (Required) *"
                image={sideImage}
                preview={sidePreview}
                onChange={(e) => handleImageUpload(e, 'side')}
                onRemove={() => handleRemoveImage('side')}
              />
            </div>

            {/* Mask Preview Modals */}
            {showFrontPreview && frontMaskData && (
              <MaskPreview
                original={frontPreview}
                preview={frontMaskData.preview}
                mask={frontMaskData.mask}
                onAccept={() => setShowFrontPreview(false)}
                onRetry={() => {
                  setShowFrontPreview(false);
                  handleRemoveImage('front');
                }}
              />
            )}

            {showSidePreview && sideMaskData && (
              <MaskPreview
                original={sidePreview}
                preview={sideMaskData.preview}
                mask={sideMaskData.mask}
                onAccept={() => setShowSidePreview(false)}
                onRetry={() => {
                  setShowSidePreview(false);
                  handleRemoveImage('side');
                }}
              />
            )}

            {processingPreview && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 text-center">
                  <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-semibold">Processing image...</p>
                  <p className="text-sm text-gray-600">Removing background and creating mask</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !frontImage || !sideImage || apiStatus !== 'connected'}
              className="w-full bg-[#8B5A5A] text-white py-3 rounded-lg font-semibold hover:bg-[#704848] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  Analyze Measurements
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Error</p>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results && (
          <div id="results-section" className="space-y-6 animate-in fade-in duration-500">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Analysis Complete</p>
                <p className="text-sm mt-0.5">Your measurements have been successfully analyzed</p>
              </div>
            </div>

            {/* Measurements */}
            {results.measurements && (
              <MeasurementsDisplay measurements={results.measurements} />
            )}

            {/* Model Info */}
            {results.model && (
              <div className="bg-white rounded-lg shadow-sm p-5 border border-[#E5E5E5]">
                <p className="text-sm text-[#8B5A5A]">
                  <span className="font-medium">Model:</span> {results.model}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Measurement History */}
        <MeasurementHistory userIdentifier="default" />
    </Layout>
  );
}
