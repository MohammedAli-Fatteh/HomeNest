/* sellers.js – sellers data loading and rendering */
let allSellers = [];

async function loadSellers() {
  const res = await fetch('data/sellers.json');
  allSellers = await res.json();
  return allSellers;
}

function renderSellersMini(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = allSellers.map(s => `
  <div class="seller-mini-card" onclick="navigateTo('sellers')">
    <div class="smc-logo">${s.logo}</div>
    <div class="smc-name">${s.name}</div>
    <span class="smc-type ${s.type}" style="${s.type==='branded'?'background:var(--accent-light);color:var(--accent)':'background:var(--green-light);color:var(--green)'}">${s.type==='branded'?'🏢 Branded':'🏠 Local'}</span>
    <div class="smc-rating">⭐ ${s.rating} · ${s.productCount} products</div>
  </div>`).join('');
}

function renderSellersGrid(filter='all') {
  const el = document.getElementById('sellers-grid');
  if (!el) return;
  const sellers = filter === 'all' ? allSellers : allSellers.filter(s => s.type === filter);
  el.innerHTML = sellers.map(s => `
  <div class="seller-card">
    <div class="sc-header">
      <div class="sc-logo">${s.logo}</div>
      <div>
        <div class="sc-name">${s.name}</div>
        <div class="sc-location">📍 ${s.location}</div>
      </div>
      <span class="seller-type-badge ${s.type}" style="margin-left:auto">${s.type==='branded'?'🏢 Branded':'🏠 Local'}</span>
    </div>
    <p class="sc-desc">${s.description}</p>
    <div class="sc-stats">
      <div class="sc-stat"><span class="sc-stat-val">⭐ ${s.rating}</span><span class="sc-stat-label">Rating</span></div>
      <div class="sc-stat"><span class="sc-stat-val">${s.reviewCount.toLocaleString()}</span><span class="sc-stat-label">Reviews</span></div>
      <div class="sc-stat"><span class="sc-stat-val">${s.productCount}</span><span class="sc-stat-label">Products</span></div>
    </div>
    <div class="sc-tags">${s.tags.map(t=>`<span class="sc-tag">#${t}</span>`).join('')}</div>
    <div style="margin-top:16px;display:flex;gap:10px;font-size:13px;color:var(--text-3)">
      <span>🚚 ${s.delivery}</span> · <span>🛡️ ${s.warranty}</span>
    </div>
  </div>`).join('');
}

function initSellers() {
  document.querySelectorAll('[data-seller-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-seller-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSellersGrid(btn.dataset.sellerFilter);
    });
  });
}

function showSellerDetail(sellerName) {
  const seller = allSellers.find(s => s.name === sellerName);
  if (!seller) return;
  const sellerProducts = allProducts.filter(p => p.seller === sellerName);

  document.getElementById('seller-detail-content').innerHTML = `
    <button class="back-btn" onclick="navigateTo('sellers')">← Back to Sellers</button>
    <div style="max-width:1400px;margin:0 auto;padding:40px;">
      <div class="seller-card" style="margin-bottom:40px;display:flex;align-items:center;gap:30px;">
        <div class="sc-logo" style="width:120px;height:120px;font-size:64px;">${seller.logo}</div>
        <div style="flex:1;">
          <h1 style="font-family:var(--font-display);font-size:36px;font-weight:700;">${seller.name}</h1>
          <p style="color:var(--text-3);margin-bottom:12px;">📍 ${seller.location} · <span class="seller-type-badge ${seller.type}">${seller.type==='branded'?'🏢 Branded':'🏠 Local'}</span></p>
          <p style="font-size:15px;color:var(--text-2);max-width:600px;">${seller.description}</p>
        </div>
        <div class="sc-stats" style="grid-template-columns:1fr;gap:20px;margin:0;min-width:150px;">
          <div class="sc-stat"><span class="sc-stat-val">⭐ ${seller.rating}</span><span class="sc-stat-label">${seller.reviewCount.toLocaleString()} Reviews</span></div>
        </div>
      </div>
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid var(--border);">Products from ${seller.name} (${sellerProducts.length})</h2>
        <div class="products-grid" id="sd-products"></div>
      </div>
    </div>
  `;

  // Use products.js render logic to render the HTML inside sd-products
  // Delaying it slightly just in case DOM isn't ready
  setTimeout(() => {
    if (sellerProducts.length > 0) {
      renderProductGrid(sellerProducts, 'sd-products');
    } else {
      document.getElementById('sd-products').innerHTML = '<p>No products added by this seller yet.</p>';
    }
  }, 50);

  navigateTo('seller-detail');
}
