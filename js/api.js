/* api.js – talks to the HomeNest FastAPI backend. Everything else (app.js, cart.js,
   etc.) calls the functions here instead of touching fetch() or the token directly. */

const API_BASE = window.HOMENEST_API_BASE || 'http://127.0.0.1:8000';
const TOKEN_KEY = 'hn_token';

const Api = (() => {
  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
  const clearToken = () => localStorage.removeItem(TOKEN_KEY);

  async function request(method, path, body, { auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getToken();
      if (!token) throw new ApiError('Not logged in', 401);
      headers['Authorization'] = `Bearer ${token}`;
    }
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new ApiError('Could not reach the server. Check your connection.', 0);
    }

    let data = null;
    try { data = await response.json(); } catch { /* no JSON body, e.g. a 204 */ }

    if (!response.ok) {
      const message = (data && data.detail) ? data.detail : `Request failed (${response.status})`;
      throw new ApiError(message, response.status);
    }
    return data;
  }

  class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }

  return {
    // ---- auth ----
    signup: (name, email, password, role = 'buyer') =>
      request('POST', '/auth/signup', { name, email, password, role }).then(saveSession),
    login: (email, password) =>
      request('POST', '/auth/login', { email, password }).then(saveSession),
    googleLogin: (idToken) =>
      request('POST', '/auth/google', { id_token: idToken }).then(saveSession),
    me: () => request('GET', '/auth/me', undefined, { auth: true }),
    logout: () => clearToken(),
    isLoggedIn: () => !!getToken(),

    // ---- seller ----
    setSellerProfile: (shop_name, description) =>
      request('POST', '/seller/profile', { shop_name, description }, { auth: true }),
    myProducts: () => request('GET', '/seller/products', undefined, { auth: true }),
    createProduct: (product) => request('POST', '/seller/products', product, { auth: true }),
    updateProduct: (id, patch) => request('PUT', `/seller/products/${id}`, patch, { auth: true }),
    deleteProduct: (id) => request('DELETE', `/seller/products/${id}`, undefined, { auth: true }),
    mySellerOrders: () => request('GET', '/seller/orders', undefined, { auth: true }),

    // ---- admin ----
    pendingSellers: () => request('GET', '/admin/sellers/pending', undefined, { auth: true }),
    approveSeller: (userId) => request('POST', `/admin/sellers/${userId}/approve`, undefined, { auth: true }),
    rejectSeller: (userId) => request('POST', `/admin/sellers/${userId}/reject`, undefined, { auth: true }),

    // ---- public products ----
    listProducts: (category) => request('GET', `/products${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    getProduct: (id) => request('GET', `/products/${id}`),

    // ---- orders ----
    checkout: (items) => request('POST', '/orders/checkout', { items }, { auth: true }),
    verifyPayment: (order_id, razorpay_payment_id, razorpay_signature) =>
      request('POST', '/orders/verify-payment', { order_id, razorpay_payment_id, razorpay_signature }, { auth: true }),
    cancelOrder: (orderId) => request('POST', `/orders/${orderId}/cancel`, undefined, { auth: true }),
    myOrders: () => request('GET', '/orders/my', undefined, { auth: true }),

    // ---- reviews ----
    createReview: (productId, order_item_id, rating, comment) =>
      request('POST', `/products/${productId}/reviews`, { order_item_id, rating, comment }, { auth: true }),
    productReviews: (productId) => request('GET', `/products/${productId}/reviews`),

    // ---- room designs ----
    suggestLayout: (budget, categories) => request('POST', '/room-designs/suggest', { budget, categories }),
    saveDesign: (name, budget, layout_json) =>
      request('POST', '/room-designs', { name, budget, layout_json }, { auth: true }),
    myDesigns: () => request('GET', '/room-designs/mine', undefined, { auth: true }),
    getSharedDesign: (shareToken) => request('GET', `/room-designs/${shareToken}`),
    deleteDesign: (id) => request('DELETE', `/room-designs/${id}`, undefined, { auth: true }),

    ApiError,
  };

  function saveSession(result) {
    setToken(result.access_token);
    return result.user;
  }
})();
