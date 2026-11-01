/* app.js – SPA Router, theme, search, countdown, profile, global init */

/* ===== GLOBAL TOAST ===== */
function showToast(msg, type='info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s cubic-bezier(0.4,0,0.2,1) forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

/* ===== NAVIGATION / ROUTER ===== */
let currentPage = 'home';
let prevPage = null;

function navigateTo(page) {
  if (page === currentPage) return;
  prevPage = currentPage;

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const target = document.getElementById(`page-${page}`);
  if (!target) return;
  target.classList.add('active');
  currentPage = page;

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Close mobile nav
  document.getElementById('nav-links').classList.remove('open');

  // Page-specific init
  onPageEnter(page);
}

/* ===== AUTH & DASHBOARD LOGIC ===== */
let currentUser = null; // { id, name, email, role, seller_status } from the backend, or null

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').style.display = 'flex';
  switchAuthTab(tab);
}
function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab[data-auth]').forEach(t => t.classList.toggle('active', t.dataset.auth === tab));
  document.querySelectorAll('.auth-panel[id^="auth-"]').forEach(p => p.classList.toggle('active', p.id === `auth-${tab}`));
}
function switchDashTab(tab) {
  document.querySelectorAll('.seller-dash-tabs .auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.seller-dash-modal .auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`dash-${tab}`).classList.add('active');
  if (tab === 'my-products') renderSellerDashProducts();
  if (tab === 'orders') renderSellerOrders();
}

async function renderSellerOrders() {
  const el = document.getElementById('seller-orders-list');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-3);padding:20px;text-align:center">Loading…</p>';
  try {
    const rows = await Api.mySellerOrders();
    el.innerHTML = rows.length
      ? rows.map(r => `
        <div class="saved-layout-item">
          <span class="sli-name">#${r.order_id} · ${r.product_name} × ${r.quantity}
            <span style="font-weight:400;color:var(--text-3)">· ${formatPrice(r.price_at_purchase * r.quantity)} · ${r.order_status}</span>
          </span>
        </div>`).join('')
      : '<p style="color:var(--text-3);padding:20px;text-align:center">No orders yet.</p>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--text-3);padding:20px;text-align:center">${err.message}</p>`;
  }
}

/* Runs a button's onclick handler as an async action: disables the button and shows
   "..." while the request is in flight, re-enables it after, and turns any ApiError
   into a toast instead of a silent failure or a raw console error. */
async function withButtonLoading(button, label, action) {
  if (!button) return action();
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    await action();
  } catch (err) {
    showToast(err.message || 'Something went wrong', 'error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showToast('Enter email and password', 'error');
  withButtonLoading(event.target, 'Signing in…', async () => {
    currentUser = await Api.login(email, password);
    finishAuth();
  });
}

function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) return showToast('Fill in all fields', 'error');
  if (password.length < 8) return showToast('Password must be at least 8 characters', 'error');
  withButtonLoading(event.target, 'Creating account…', async () => {
    currentUser = await Api.signup(name, email, password, 'buyer');
    finishAuth();
  });
}

function handleSellerRegister() {
  const shopName = document.getElementById('seller-shop-name').value.trim();
  const location = document.getElementById('seller-location').value.trim();
  const email = document.getElementById('seller-email').value.trim();
  const password = document.getElementById('seller-password').value;
  const phone = document.getElementById('seller-phone').value.trim();
  const sellerType = document.getElementById('seller-type').value;
  if (!shopName || !email || !password) return showToast('Fill in shop name, email and password', 'error');
  if (password.length < 8) return showToast('Password must be at least 8 characters', 'error');

  withButtonLoading(event.target, 'Registering…', async () => {
    currentUser = await Api.signup(shopName, email, password, 'seller');
    const description = [location && `Based in ${location}`, phone && `Contact: ${phone}`, sellerType === 'branded' ? 'Branded store' : 'Local seller']
      .filter(Boolean).join(' · ');
    await Api.setSellerProfile(shopName, description);
    closeAuthModal();
    updateNavAuth();
    showToast('Shop registered! An admin will review and approve your account before you can list products.', 'success');
  });
}

function finishAuth() {
  closeAuthModal();
  showToast(`Welcome, ${currentUser.name}!`, 'success');
  updateNavAuth();
}

function handleLogout() {
  Api.logout();
  currentUser = null;
  updateNavAuth();
  showToast('Signed out', 'info');
  navigateTo('home');
}

/* On page load, if a token is saved from a previous visit, check it's still valid and
   silently restore the session instead of asking the person to log in again. */
async function restoreSession() {
  if (!Api.isLoggedIn()) return;
  try {
    currentUser = await Api.me();
  } catch {
    Api.logout(); // saved token was invalid/expired
  }
  updateNavAuth();
}

function updateNavAuth() {
  const signinBtn = document.getElementById('nav-signin-btn');
  const profileBtn = document.getElementById('nav-profile');
  if (currentUser) {
    if (signinBtn) signinBtn.style.display = 'none';
    if (profileBtn) {
      profileBtn.style.display = 'flex';
      profileBtn.innerHTML = currentUser.role === 'admin' ? '<span>🛡️</span>' : currentUser.role === 'seller' ? '<span>🏪</span>' : '<span>👤</span>';
      profileBtn.onclick = (e) => {
        if (currentUser.role === 'admin') {
          e.preventDefault(); e.stopPropagation();
          document.getElementById('admin-dashboard-modal').style.display = 'flex';
          renderAdminPendingSellers();
          return;
        }
        if (currentUser.role !== 'seller') return; // buyers just navigate to the profile page as normal
        e.preventDefault(); e.stopPropagation();
        if (currentUser.seller_status === 'approved') {
          document.getElementById('seller-dashboard-modal').style.display = 'flex';
          renderSellerDashProducts();
        } else if (currentUser.seller_status === 'pending') {
          showToast('Your seller account is still awaiting admin approval.', 'info');
        } else {
          showToast('Your seller application was not approved. Contact support.', 'error');
        }
      };
    }
  } else {
    if (signinBtn) signinBtn.style.display = 'inline-flex';
    if (profileBtn) profileBtn.style.display = 'none';
  }
}

async function handleAddProduct() {
  const name = document.getElementById('dp-name').value.trim();
  const price = parseFloat(document.getElementById('dp-price')?.value);
  const stock = parseInt(document.getElementById('dp-stock')?.value, 10);
  const category = document.getElementById('dp-category')?.value || null;
  const description = document.getElementById('dp-desc').value.trim();
  const imageUrl = document.getElementById('dp-image')?.value.trim() || null;
  if (!name || !price || price <= 0) return showToast('Enter a name and a valid price', 'error');

  await withButtonLoading(event.target, 'Adding…', async () => {
    await Api.createProduct({
      name, description, price, stock_qty: isNaN(stock) ? 0 : stock, category, image_url: imageUrl,
    });
    showToast(`${name} added successfully!`, 'success');
    document.getElementById('dp-name').value = '';
    document.getElementById('dp-desc').value = '';
    if (document.getElementById('dp-price')) document.getElementById('dp-price').value = '';
    if (document.getElementById('dp-stock')) document.getElementById('dp-stock').value = '';
    if (document.getElementById('dp-image')) document.getElementById('dp-image').value = '';
    renderSellerDashProducts();
  });
}

async function renderSellerDashProducts() {
  const el = document.getElementById('seller-my-products-list');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-3);padding:20px;text-align:center">Loading…</p>';
  try {
    const products = await Api.myProducts();
    el.innerHTML = products.length
      ? products.map(p => `
        <div class="saved-layout-item" data-id="${p.id}">
          <span class="sli-name">${p.name} <span style="font-weight:400;color:var(--text-3)">· ${formatPrice(p.price)} · Stock: ${p.stock_qty}</span></span>
          <div class="sli-actions"><button class="sli-btn" onclick="handleDeleteProduct(${p.id})" title="Delete">🗑</button></div>
        </div>`).join('')
      : '<p style="color:var(--text-3);padding:20px;text-align:center">No products added yet.</p>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--text-3);padding:20px;text-align:center">${err.message}</p>`;
  }
}

async function handleDeleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await Api.deleteProduct(id);
    showToast('Product deleted', 'info');
    renderSellerDashProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function onPageEnter(page) {
  switch (page) {
    case 'home':
      renderProductGrid(allProducts.slice().sort((a,b)=>b.rating-a.rating).slice(0,4), 'home-top-rated');
      renderSellersMini('home-sellers-row');
      renderHomepageReviews(allProducts);
      break;
    case 'categories':
      applyFilters();
      break;
    case 'deals':
      const deals = allProducts.filter(p => p.originalPrice && (1-p.price/p.originalPrice) >= 0.2).sort((a,b)=>(1-a.price/a.originalPrice)-(1-b.price/b.originalPrice)).reverse();
      renderProductGrid(deals, 'deals-products-grid');
      break;
    case 'sellers':
      renderSellersGrid('all');
      break;
    case 'wishlist':
      renderWishlist();
      break;
    case 'cart':
      renderCart();
      break;
    case 'profile':
      renderProfile();
      break;
    case 'planner':
      setTimeout(() => Planner.init(), 100);
      break;
  }
}

function refreshCurrentPage() {
  onPageEnter(currentPage);
}

/* ===== LINK DELEGATION ===== */
function initNavigation() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-page]');
    if (el) { e.preventDefault(); navigateTo(el.dataset.page); }
  });

  document.getElementById('product-back-btn')?.addEventListener('click', () => {
    navigateTo(prevPage || 'categories');
  });

  // Category cards on home
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      navigateTo('categories');
      setTimeout(() => {
        const radio = document.querySelector(`input[name="filter-cat"][value="${cat}"]`);
        if (radio) { radio.checked = true; applyFilters(); }
      }, 100);
    });
  });

  // Hamburger
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });

  // Scroll header shadow
  window.addEventListener('scroll', () => {
    document.getElementById('nav-header').classList.toggle('scrolled', window.scrollY > 10);
  });
}

/* ===== THEME ===== */
function initTheme() {
  const saved = Store.getTheme();
  applyTheme(saved);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Store.setTheme(next);
  });

  const settingsDark = document.getElementById('settings-dark-toggle');
  if (settingsDark) {
    settingsDark.checked = saved === 'dark';
    settingsDark.addEventListener('change', () => {
      const next = settingsDark.checked ? 'dark' : 'light';
      applyTheme(next);
      Store.setTheme(next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  const toggle = document.getElementById('settings-dark-toggle');
  if (toggle) toggle.checked = theme === 'dark';
}

/* ===== SEARCH ===== */
function initSearch() {
  const searchIcon = document.getElementById('search-bar-toggle');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-overlay-input');
  const closeBtn = document.getElementById('search-close');
  const results = document.getElementById('search-results');

  // Also watch the inline search input
  const inlineInput = document.getElementById('global-search');
  inlineInput?.addEventListener('click', () => { overlay.classList.add('open'); input.focus(); });

  searchIcon?.addEventListener('click', () => { overlay.classList.add('open'); input.focus(); });
  closeBtn?.addEventListener('click', () => { overlay.classList.remove('open'); input.value = ''; results.innerHTML = ''; });
  overlay?.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('open'); results.innerHTML = ''; } });

  input?.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { results.innerHTML = ''; return; }
    const found = allProducts.filter(p => p.name.toLowerCase().includes(q) || p.tags.some(t=>t.includes(q)) || p.seller.toLowerCase().includes(q)).slice(0,6);
    results.innerHTML = found.length ? found.map(p => `
      <div class="search-result-item" onclick="overlay.classList.remove('open');showProductDetail(${p.id})">
        <img src="${p.image}" alt="${p.name}" />
        <div class="sri-info">
          <div class="sri-name">${p.name}</div>
          <div class="sri-price">₹${p.price.toLocaleString('en-IN')}</div>
        </div>
        <div style="font-size:13px;color:var(--text-3)">⭐ ${p.rating}</div>
      </div>`).join('') : '<p style="color:var(--text-3);font-size:14px">No products found for "' + q + '"</p>';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.classList.remove('open');
    if ((e.ctrlKey||e.metaKey) && e.key === 'k') { e.preventDefault(); overlay.classList.add('open'); input.focus(); }
  });
}

/* ===== COUNTDOWN TIMER ===== */
function initCountdown() {
  const end = new Date();
  end.setHours(end.getHours() + 8, end.getMinutes() + 45, end.getSeconds() + 22);

  function tick() {
    const diff = end - Date.now();
    if (diff <= 0) { clearInterval(timer); return; }
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
    const pad = n => String(n).padStart(2,'0');
    const hEl = document.getElementById('ct-hours'), mEl = document.getElementById('ct-mins'), sEl = document.getElementById('ct-secs');
    if (hEl) hEl.textContent = pad(h);
    if (mEl) mEl.textContent = pad(m);
    if (sEl) sEl.textContent = pad(s);
  }
  tick();
  const timer = setInterval(tick, 1000);
}

/* ===== PROFILE ===== */
async function renderProfile() {
  // Name/email now come from the real logged-in account, not a separately
  // hand-typed "profile" — the two could never disagree before, but a locally
  // typed name never matched what was actually on the order/review records.
  const profile = Store.getProfile();
  const displayName = currentUser?.name || profile.name;
  const displayEmail = currentUser?.email || profile.email;
  if (displayName) {
    document.getElementById('profile-name-display').textContent = displayName;
    document.getElementById('profile-name-input').value = displayName;
  }
  if (displayEmail) {
    document.getElementById('profile-email-display').textContent = displayEmail;
    document.getElementById('profile-email-input').value = displayEmail;
  }
  if (profile.phone) document.getElementById('profile-phone-input').value = profile.phone;
  if (profile.city) document.getElementById('profile-city-input').value = profile.city;

  document.getElementById('pstat-wishlist').textContent = Store.getWishlist().length;
  document.getElementById('pstat-reviews').textContent = Object.values(Store.getReviews()).flat().length;

  const ordersEl = document.getElementById('orders-list');
  const orderStatEl = document.getElementById('pstat-orders');
  if (!currentUser) {
    if (orderStatEl) orderStatEl.textContent = '0';
    if (ordersEl) ordersEl.innerHTML = '<div class="empty-state-sm"><span>📦</span><p>Sign in to see your orders.</p></div>';
    return;
  }

  if (ordersEl) ordersEl.innerHTML = '<div class="empty-state-sm"><p>Loading…</p></div>';
  try {
    const orders = await Api.myOrders(); // the REAL order history, from the backend
    if (orderStatEl) orderStatEl.textContent = orders.length;
    if (ordersEl) ordersEl.innerHTML = orders.length ? orders.map(o => `
      <div class="cart-item-card">
        <div style="flex:1">
          <div class="ci-name">Order #${o.id} <span style="font-weight:400;color:var(--text-3);font-size:12px">· ${o.status}</span></div>
          <div class="ci-seller">${o.items.length} item(s) · ${new Date(o.created_at).toLocaleDateString()}</div>
        </div>
        <div class="ci-price">${formatPrice(o.total_amount)}</div>
      </div>`).join('') : '<div class="empty-state-sm"><span>📦</span><p>No orders yet.</p></div>';
  } catch (err) {
    if (ordersEl) ordersEl.innerHTML = `<div class="empty-state-sm"><p>${err.message}</p></div>`;
  }
}

function initProfile() {
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    const p = {
      name: document.getElementById('profile-name-input').value,
      email: document.getElementById('profile-email-input').value,
      phone: document.getElementById('profile-phone-input').value,
      city: document.getElementById('profile-city-input').value,
    };
    Store.saveProfile(p);
    document.getElementById('profile-name-display').textContent = p.name || 'Guest User';
    document.getElementById('profile-email-display').textContent = p.email || 'Sign in to save your data';
    showToast('Profile saved! ✅', 'success');
  });

  document.getElementById('save-address-btn')?.addEventListener('click', () => showToast('Address saved! 📍', 'success'));

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Clear all local data? This clears your cart, wishlist and saved layouts on this device, and signs you out.')) {
      Store.clearAll();
      updateCartBadge();
      updateWishlistBadge();
      handleLogout();
      showToast('All local data cleared', 'info');
    }
  });

  document.querySelectorAll('.pmenu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pmenu-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.profileTab}`)?.classList.add('active');
    });
  });
}

/* ===== BOOTSTRAP ===== */
function updateCategoryCounts() {
  const counts = { 'living-room': 0, 'bedroom': 0, 'kitchen': 0, 'lighting': 0, 'curtains': 0, 'carpets': 0 };
  allProducts.forEach(p => {
    if(counts.hasOwnProperty(p.category)) counts[p.category]++;
  });
  document.querySelectorAll('.category-card').forEach(card => {
    const cat = card.dataset.category;
    const countEl = card.querySelector('.cat-count');
    if (countEl && counts[cat] !== undefined) {
      countEl.textContent = counts[cat] + ' item' + (counts[cat] !== 1 ? 's' : '');
    }
  });
}

async function init() {
  await Promise.all([loadProducts(), loadSellers()]);
  await restoreSession();

  // A shared Room Planner link (?share=<token>) should land directly on the planner
  // with that design loaded, not on the homepage requiring a manual click first.
  if (new URLSearchParams(location.search).get('share')) {
    navigateTo('planner');
  }

  initGoogleSignIn();
  initNavigation();
  initTheme();
  initSearch();
  initFilters();
  initCart();
  initSellers();
  initProfile();
  initCountdown();

  updateCartBadge();
  updateWishlistBadge();
  updateCategoryCounts();

  // Show home page
  onPageEnter('home');

  // Animate hero on load
  document.querySelector('.hero-content')?.classList.add('loaded');
}

document.addEventListener('DOMContentLoaded', init);

/* ---- Admin: approve/reject pending sellers ---- */
async function renderAdminPendingSellers() {
  const el = document.getElementById('admin-pending-sellers-list');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-3);padding:20px;text-align:center">Loading…</p>';
  try {
    const sellers = await Api.pendingSellers();
    el.innerHTML = sellers.length ? sellers.map(s => `
      <div class="saved-layout-item">
        <span class="sli-name">${s.shop_name || '(no shop name set yet)'}
          <span style="font-weight:400;color:var(--text-3)">· ${s.name} · ${s.email}</span>
        </span>
        <div class="sli-actions">
          <button class="sli-btn" onclick="handleApproveSeller(${s.user_id})" title="Approve">✅</button>
          <button class="sli-btn" onclick="handleRejectSeller(${s.user_id})" title="Reject">❌</button>
        </div>
      </div>`).join('') : '<p style="color:var(--text-3);padding:20px;text-align:center">No sellers waiting for approval.</p>';
  } catch (err) {
    el.innerHTML = `<p style="color:var(--text-3);padding:20px;text-align:center">${err.message}</p>`;
  }
}

async function handleApproveSeller(userId) {
  try {
    await Api.approveSeller(userId);
    showToast('Seller approved', 'success');
    renderAdminPendingSellers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRejectSeller(userId) {
  if (!confirm('Reject this seller application?')) return;
  try {
    await Api.rejectSeller(userId);
    showToast('Seller rejected', 'info');
    renderAdminPendingSellers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ---- Google Sign-In ---- */
async function handleGoogleCredential(response) {
  try {
    currentUser = await Api.googleLogin(response.credential);
    finishAuth();
  } catch (err) {
    showToast(err.message || 'Google sign-in failed', 'error');
  }
}

function initGoogleSignIn() {
  const clientId = window.HOMENEST_GOOGLE_CLIENT_ID;
  const container = document.getElementById('google-signin-container');
  if (!clientId || !container) return; // not configured yet — stays hidden, nothing else breaks

  const start = () => {
    google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential });
    google.accounts.id.renderButton(document.getElementById('google-signin-btn'), { theme: 'outline', size: 'large', width: 280 });
    container.style.display = 'block';
  };

  // The Google script tag loads with `defer`, so it may not be ready the instant
  // this runs — wait for it if needed, instead of failing silently.
  if (window.google?.accounts?.id) {
    start();
  } else {
    window.addEventListener('load', () => { if (window.google?.accounts?.id) start(); });
  }
}
