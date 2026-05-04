import axios from 'axios';

// All requests go to the gateway on port 5000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // ── Health ──────────────────────────────────────────────────────────────────
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // ── Model ───────────────────────────────────────────────────────────────────
  getModelInfo: async () => {
    const response = await api.get('/model-info');
    return response.data;
  },

  switchModel: async (modelName) => {
    const response = await api.post('/switch-model', { model_name: modelName });
    return response.data;
  },

  // ── Predictions / Analysis ──────────────────────────────────────────────────
  predictMeasurements: async (frontImage, sideImage) => {
    const formData = new FormData();
    formData.append('front_image', frontImage);
    formData.append('side_image', sideImage);
    const response = await api.post('/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  previewMask: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post('/preview-mask', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  completeAnalysis: async (frontImage, sideImage, weightKg, gender) => {
    const formData = new FormData();
    formData.append('front_image', frontImage);
    formData.append('side_image', sideImage);
    if (weightKg) formData.append('weight_kg', weightKg);
    if (gender)   formData.append('gender', gender);
    const response = await api.post('/complete-analysis', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ── Size / Measurements  (→ /api/size/...) ──────────────────────────────────
  saveMeasurements: async (data) => {
    const response = await api.post('/api/size/measurements/save', data);
    return response.data;
  },

  getLatestMeasurements: async (userIdentifier = 'default', maxAgeDays = 90) => {
    const response = await api.get('/api/size/measurements/latest', {
      params: { user_identifier: userIdentifier, max_age_days: maxAgeDays },
    });
    return response.data;
  },

  getMeasurementHistory: async (userIdentifier = 'default') => {
    const response = await api.get('/api/size/measurements/history', {
      params: { user_identifier: userIdentifier },
    });
    return response.data;
  },

  getSizeRecommendation: async (measurements, brandId, categoryId, fitType = 'Regular') => {
    const response = await api.post('/api/size/recommend', {
      measurements,
      brand_id: brandId,
      category_id: categoryId,
      fit_type: fitType,
    });
    return response.data;
  },

  getMultiBrandRecommendations: async (measurements, categoryId, fitType = 'Regular', minConfidence = 60.0) => {
    const response = await api.post('/api/size/recommend/multiple-brands', {
      measurements,
      category_id: parseInt(categoryId),
      fit_type: fitType,
      min_confidence: minConfidence,
    });
    return response.data;
  },

  // ── Admin  (→ /api/admin/...) ────────────────────────────────────────────────
  getComprehensiveView: async () => {
    const response = await api.get('/api/admin/comprehensive-view');
    return response.data;
  },

  // ── Other microservices ──────────────────────────────────────────────────────
  // Wardrobe service  →  /api/wardrobe/<path>
  // Accessories       →  /api/accessories/<path>
  // Grooming          →  /api/grooming/<path>
};

export default api;