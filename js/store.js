/* store.js – LocalStorage abstraction layer */
const Store = (() => {
  const KEYS = { cart:'hn_cart', wishlist:'hn_wishlist', reviews:'hn_reviews', layouts:'hn_layouts', theme:'hn_theme', profile:'hn_profile', orders:'hn_orders' };

  const get = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
  const set = (k,v) => localStorage.setItem(k, JSON.stringify(v));

  /* CART */
  const getCart = () => get(KEYS.cart) || [];
  const setCart = c => set(KEYS.cart, c);
  const addToCart = (product, qty=1) => {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === product.id);
    if (idx > -1) cart[idx].qty += qty;
    else cart.push({ id:product.id, name:product.name, price:product.price, seller:product.seller, image:product.image, qty });
    setCart(cart); return cart;
  };
  const removeFromCart = id => { const c = getCart().filter(i => i.id !== id); setCart(c); return c; };
  const updateQty = (id, qty) => {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx > -1) { if (qty <= 0) cart.splice(idx,1); else cart[idx].qty = qty; }
    setCart(cart); return cart;
  };
  const clearCart = () => setCart([]);

  /* WISHLIST */
  const getWishlist = () => get(KEYS.wishlist) || [];
  const toggleWishlist = id => {
    let w = getWishlist();
    const i = w.indexOf(id);
    if (i > -1) w.splice(i,1); else w.push(id);
    set(KEYS.wishlist, w); return w;
  };
  const isWishlisted = id => (getWishlist()).includes(id);

  /* REVIEWS */
  const getReviews = () => get(KEYS.reviews) || {};
  const addReview = (productId, review) => {
    const all = getReviews();
    if (!all[productId]) all[productId] = [];
    all[productId].unshift({ ...review, date: new Date().toISOString().split('T')[0] });
    set(KEYS.reviews, all); return all[productId];
  };
  const getProductReviews = productId => (getReviews())[productId] || [];

  /* ROOM LAYOUTS */
  const getLayouts = () => get(KEYS.layouts) || [];
  const saveLayout = (name, data) => {
    const layouts = getLayouts();
    const idx = layouts.findIndex(l => l.name === name);
    const layout = { name, data, savedAt: new Date().toISOString() };
    if (idx > -1) layouts[idx] = layout; else layouts.push(layout);
    set(KEYS.layouts, layouts); return layouts;
  };
  const deleteLayout = name => { const l = getLayouts().filter(x => x.name !== name); set(KEYS.layouts, l); return l; };

  /* THEME */
  const getTheme = () => get(KEYS.theme) || 'light';
  const setTheme = t => set(KEYS.theme, t);

  /* PROFILE */
  const getProfile = () => get(KEYS.profile) || {};
  const saveProfile = p => { set(KEYS.profile, p); return p; };

  /* ORDERS */
  const getOrders = () => get(KEYS.orders) || [];
  const addOrder = order => { const o = getOrders(); o.unshift(order); set(KEYS.orders, o); return o; };

  /* CLEAR ALL */
  const clearAll = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));

  return { getCart, addToCart, removeFromCart, updateQty, clearCart, getWishlist, toggleWishlist, isWishlisted, getReviews, addReview, getProductReviews, getLayouts, saveLayout, deleteLayout, getTheme, setTheme, getProfile, saveProfile, getOrders, addOrder, clearAll };
})();
