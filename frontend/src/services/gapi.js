import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.133:5000/';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const predictImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/predict', formData);
  return response.data;
};

export const predictNail = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/predict-nail', formData);
  return response.data;
};

export const predictDental = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/predict-dental', formData);
  return response.data;
};

/**
 * @typedef {Object} HairStyle
 * @property {string} key
 * @property {string} display
 * @property {boolean} available
 */

export const getHairStyles = async () => {
  const response = await apiClient.get('/api/hair/styles');
  return response.data;
};

export const generateHairImage = async (face, style) => {
  const formData = new FormData();
  formData.append('face', face);
  formData.append('style', style);
  const response = await apiClient.post('/api/hair/generate', formData);
  return response.data;
};

export const analyzeNails = async (file, prompt) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prompt', prompt);
  const response = await apiClient.post('/analyze-nail', formData);
  return response.data;
};

export const analyzeDental = async (file, prompt) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prompt', prompt);
  const response = await apiClient.post('/analyze-dental', formData);
  return response.data;
};

export const checkHealth = async () => {
  try {
    await apiClient.get('/health');
    return true;
  } catch {
    return false;
  }
};
