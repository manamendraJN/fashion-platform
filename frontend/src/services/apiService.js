
// ─────────────────────────────────────────────
// BASE URL  (set VITE_API_URL in frontend/.env)
// ─────────────────────────────────────────────
const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5000';

// Scoped prefix used for accessories' conflicting routes.
// The gateway strips this prefix before forwarding to :5001.
//   e.g. /api/accessories/wardrobe → :5001/api/wardrobe
const ACC_SCOPE = '/api/accessories';

// ─────────────────────────────────────────────
// LOW-LEVEL HELPERS
// ─────────────────────────────────────────────
async function doFetch(input, init) {
  const res  = await fetch(input, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

function jsonPost(endpoint, body) {
  return doFetch(`${BASE_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

function formPost(endpoint, form) {
  return doFetch(`${BASE_URL}${endpoint}`, { method: 'POST', body: form });
}

// ─────────────────────────────────────────────
// WARDROBE CRUD
// Internally:  accessories service → /api/wardrobe/...
// Via gateway: frontend calls     → /api/accessories/wardrobe/...
// ─────────────────────────────────────────────

/** GET /api/accessories/wardrobe?<params> */
function getWardrobe(params = {}) {
  const q = new URLSearchParams(params).toString();
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe${q ? '?' + q : ''}`);
}

/** GET /api/accessories/wardrobe/:id */
function getItem(id) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe/${id}`);
}

/** POST /api/accessories/wardrobe */
function addItem(item) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(item),
  });
}

/** PUT /api/accessories/wardrobe/:id */
function updateItem(id, updates) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(updates),
  });
}

/** DELETE /api/accessories/wardrobe/:id */
function deleteItem(id) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe/${id}`, { method: 'DELETE' });
}

/** PATCH /api/accessories/wardrobe/:id/favourite */
function toggleFavourite(id) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe/${id}/favourite`, { method: 'PATCH' });
}

/** PATCH /api/accessories/wardrobe/:id/availability */
function toggleAvailability(id, isAvailable) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe/${id}/availability`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ isAvailable }),
  });
}

/** PATCH /api/accessories/wardrobe/:id/use */
function incrementUsage(id) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/wardrobe/${id}/use`, { method: 'PATCH' });
}

// ─────────────────────────────────────────────
// ANALYTICS & ACTIVITY
// Internally:  accessories service → /api/analytics
// Via gateway: frontend calls     → /api/accessories/analytics
// ─────────────────────────────────────────────

/** GET /api/accessories/analytics */
function getAnalytics() {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/analytics`);
}

/** GET /api/accessories/analytics/activity?limit=<n>
 *  Falls back to /api/activity if the accessories service exposes it there.
 *  Adjust the path to match your actual Flask route if needed.
 */
function getActivity(limit = 20) {
  return doFetch(`${BASE_URL}${ACC_SCOPE}/analytics/activity?limit=${limit}`);
}

// ─────────────────────────────────────────────
// MODEL ENDPOINTS — unique to accessories service
// No scoping needed — gateway routes these directly to :5001
// ─────────────────────────────────────────────

/** Health check — gateway status endpoint */
function checkHealth() {
  return doFetch(`${BASE_URL}/api/gateway/status`);
}

/**
 * Model 1 — classify accessory image
 * POST /api/classify-accessory  →  :5001
 */
function classifyAccessory(imageFile) {
  const form = new FormData();
  form.append('image', imageFile);
  return formPost('/api/classify-accessory', form);
}

/**
 * Model 2 — extract dress attributes from image
 * POST /api/extract-dress-attributes  →  :5001
 */
function extractDressAttributes(imageFile) {
  const form = new FormData();
  form.append('image', imageFile);
  return formPost('/api/extract-dress-attributes', form);
}

/**
 * Model 3 — fuse dress features + metadata
 * POST /api/fuse-features  →  :5001
 */
function fuseFeatures(params) {
  return jsonPost('/api/fuse-features', params);
}

/**
 * Model 4 — DQN accessory recommendations
 * POST /api/recommend  →  :5001
 */
function getRecommendations(params) {
  return jsonPost('/api/recommend', params);
}

/**
 * Full pipeline — one call used by the Discover page
 * POST /api/full-pipeline  →  :5001
 */
function runFullPipeline(params) {
  const form = new FormData();
  form.append('image',    params.imageFile);
  form.append('occasion', params.occasion);
  form.append('religion', params.religion ?? 'None');
  form.append('gender',   params.gender);
  form.append('budget',   String(params.budget ?? 5000));
  form.append('wardrobe', JSON.stringify(params.wardrobe ?? []));
  return formPost('/api/full-pipeline', form);
}

/**
 * Explain a specific recommendation
 * POST /api/explain  →  :5001
 */
function explainItem(params) {
  return jsonPost('/api/explain', params);
}

/**
 * Explainable AI chat
 * POST /api/chat  →  :5001
 */
function chat(message, context) {
  return jsonPost('/api/chat', { message, context });
}

/**
 * Get accessory → dress mappings
 * GET /api/mappings  →  :5001
 */
function getMappings() {
  return doFetch(`${BASE_URL}/api/mappings`);
}

/**
 * Get curated looks
 * GET /api/looks  →  :5001
 */
function getLooks() {
  return doFetch(`${BASE_URL}/api/looks`);
}

// ─────────────────────────────────────────────
// UNIFIED api OBJECT
// ─────────────────────────────────────────────
export const api = {
  // Wardrobe CRUD (routed via /api/accessories/wardrobe/...)
  getWardrobe,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  toggleFavourite,
  toggleAvailability,
  incrementUsage,

  // Analytics & activity (routed via /api/accessories/analytics)
  getAnalytics,
  getActivity,

  // Model endpoints (unique routes — direct to :5001)
  checkHealth,
  classifyAccessory,
  extractDressAttributes,
  fuseFeatures,
  getRecommendations,
  recommend: runFullPipeline,   // alias used by Discover page
  explainItem,
  chat,
  getMappings,
  getLooks,
};

export default api;