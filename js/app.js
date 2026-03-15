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
let currentUser = null; 

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
  if(tab === 'my-products') renderSellerDashProducts();
}
function handleLogin() {
  const email = document.getElementById('login-email').value;
  if(!email) return showToast('Enter email', 'error');
  currentUser = { email, type: email.includes('seller') ? 'seller' : 'user' };
  finishAuth();
}
function handleRegister() {
  const email = document.getElementById('reg-email').value;
  if(!email) return showToast('Enter email', 'error');
  currentUser = { email, type: 'user' };
  finishAuth();
}
function handleSellerRegister() {
  const email = document.getElementById('seller-email').value;
  if(!email) return showToast('Enter email', 'error');
  currentUser = { email, type: 'seller', shop: document.getElementById('seller-shop-name').value };
  finishAuth();
  setTimeout(() => document.getElementById('seller-dashboard-modal').style.display = 'flex', 500);
}
function finishAuth() {
  closeAuthModal();
  showToast(`Welcome back, ${currentUser.email}!`, 'success');
  updateNavAuth();
}
function updateNavAuth() {
  const signinBtn = document.getElementById('nav-signin-btn');
  const profileBtn = document.getElementById('nav-profile');
  if (currentUser) {
    if(signinBtn) signinBtn.style.display = 'none';
    if(profileBtn) {
      profileBtn.style.display = 'flex';
      profileBtn.innerHTML = currentUser.type === 'seller' ? '<span>🏪</span>' : '<span>👤</span>';
      profileBtn.onclick = (e) => {
        if(currentUser.type === 'seller') {
          e.preventDefault(); e.stopPropagation();
          document.getElementById('seller-dashboard-modal').style.display = 'flex';
        }
      };
    }
  } else {
    if(signinBtn) signinBtn.style.display = 'inline-flex';
    if(profileBtn) profileBtn.style.display = 'none';
  }
}
function handleAddProduct() {
  const title = document.getElementById('dp-name').value;
  if(!title) return showToast('Name required', 'error');
  // Just show success
  showToast(`${title} added successfully!`, 'success');
  document.getElementById('dp-name').value = '';
  document.getElementById('dp-desc').value = '';
}
function renderSellerDashProducts() {
  const el = document.getElementById('seller-my-products-list');
  el.innerHTML = '<p style="color:var(--text-3);padding:20px;text-align:center">No products added yet.</p>';
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
function renderProfile() {
  const profile = Store.getProfile();
  if (profile.name) {
    document.getElementById('profile-name-display').textContent = profile.name;
    document.getElementById('profile-name-input').value = profile.name;
  }
  if (profile.email) {
    document.getElementById('profile-email-display').textContent = profile.email;
    document.getElementById('profile-email-input').value = profile.email;
  }
  if (profile.phone) document.getElementById('profile-phone-input').value = profile.phone;
  if (profile.city) document.getElementById('profile-city-input').value = profile.city;

  document.getElementById('pstat-wishlist').textContent = Store.getWishlist().length;
  document.getElementById('pstat-orders').textContent = Store.getOrders().length;
  document.getElementById('pstat-reviews').textContent = Object.values(Store.getReviews()).flat().length;

  const orders = Store.getOrders();
  const ordersEl = document.getElementById('orders-list');
  if (ordersEl) ordersEl.innerHTML = orders.length ? orders.map(o => `
    <div class="cart-item-card">
      <div style="flex:1">
        <div class="ci-name">Order ${o.id}</div>
        <div class="ci-seller">${o.items.length} item(s) · ${new Date(o.date).toLocaleDateString()}</div>
      </div>
      <div class="ci-price">₹${o.total.toLocaleString('en-IN')}</div>
    </div>`).join('') : '<div class="empty-state-sm"><span>📦</span><p>No orders yet.</p></div>';
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

  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Clear all user data? This will log you out and clear cart/wishlist.')) {
      Store.clearAll();
      updateCartBadge();
      updateWishlistBadge();
      currentUser = null;
      updateNavAuth();
      showToast('All data cleared', 'info');
      navigateTo('home');
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
