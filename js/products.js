/* products.js – product rendering, filtering, data loading */
let allProducts = [];

/* Backend products don't have every field the old static demo JSON had (no fake
   rating/badge/originalPrice). This fills in safe defaults so the existing rendering
   code below never has to special-case "real" vs "demo" products. */
function adaptBackendProduct(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category || 'other',
    price: p.price,
    originalPrice: null,            // backend has no concept of a "was" price
    seller: p.seller_name || 'HomeNest Seller',
    sellerType: 'local',            // backend doesn't track branded vs local yet
    sellerId: p.seller_id,
    rating: p.rating_avg ?? 0,      // 0 (shown as unrated) until a real buyer reviews it
    reviewCount: p.review_count ?? 0,
    image: p.image_url || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80',
    badge: p.review_count >= 10 ? 'Top Rated' : null,
    description: p.description || '',
    stockQty: p.stock_qty,
    inStock: p.stock_qty > 0,
  };
}

async function loadProducts() {
  try {
    const backendProducts = await Api.listProducts();
    allProducts = backendProducts.map(adaptBackendProduct);
  } catch (err) {
    console.error('Could not load products from the backend, falling back to demo data:', err);
    const res = await fetch('data/products.json');
    allProducts = await res.json();
  }
  return allProducts;
}

function formatPrice(p) { return '₹' + p.toLocaleString('en-IN'); }

function getStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '★'.repeat(full);
  if (half) s += '½';
  return s;
}

function getBadgeClass(badge) {
  if (!badge) return '';
  const m = { 'Best Seller':'', 'Top Rated':'badge-green', 'Deal':'badge-red', 'New':'badge-green', 'Luxury':'', 'Popular':'', 'Sale':'badge-red' };
  return m[badge] || '';
}

function renderProductCard(p, compact=false) {
  const wished = Store.isWishlisted(p.id);
  const discount = p.originalPrice ? Math.round((1 - p.price/p.originalPrice)*100) : 0;
  return `
  <div class="product-card" data-product-id="${p.id}">
    <div class="product-img-wrap">
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      ${p.badge ? `<span class="product-badge ${getBadgeClass(p.badge)}">${p.badge}</span>` : ''}
      <button class="wishlist-btn ${wished?'active':''}" data-wl-id="${p.id}" aria-label="Wishlist" onclick="event.stopPropagation();handleWishlist(${p.id})">
        ${wished ? '❤️' : '🤍'}
      </button>
    </div>
    <div class="product-info">
      <div class="product-meta">
        <span class="seller-type-badge ${p.sellerType}">${p.sellerType === 'branded' ? '🏢 Branded' : '🏠 Local'}</span>
        ${discount > 0 ? `<span style="font-size:11px;font-weight:700;color:var(--green)">-${discount}%</span>` : ''}
      </div>
      <div class="product-name">${p.name}</div>
      <div class="product-seller">by ${p.seller}</div>
      <div class="product-rating">
        <span class="stars">${getStars(p.rating)}</span>
        <span class="rating-num">${p.rating}</span>
        <span class="rating-count">(${p.reviewCount})</span>
      </div>
      <div class="product-pricing">
        <div class="price-col">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${p.originalPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
        </div>
        ${(() => {
          const cart = Store.getCart();
          const item = cart.find(i => i.id === p.id);
          if (item) {
            return `
              <div class="ci-qty-controls" style="margin-left:auto">
                <button class="qty-btn" onclick="event.stopPropagation();changeQty(${p.id}, ${item.qty - 1})">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" onclick="event.stopPropagation();changeQty(${p.id}, ${item.qty + 1})">+</button>
              </div>`;
          }
          return `<button class="add-cart-btn" onclick="event.stopPropagation();handleAddToCart(${p.id})">+ Cart</button>`;
        })()}
      </div>
    </div>
  </div>`;
}

function renderProductGrid(products, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!products.length) { el.innerHTML = '<p style="color:var(--text-3);padding:20px;grid-column:1/-1">No products found.</p>'; return; }
  el.innerHTML = products.map(p => renderProductCard(p)).join('');
  el.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.wishlist-btn,.add-cart-btn')) return;
      const id = parseInt(card.dataset.productId);
      showProductDetail(id);
    });
  });
}

function showProductDetail(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const discount = p.originalPrice ? Math.round((1 - p.price/p.originalPrice)*100) : 0;
  const wished = Store.isWishlisted(p.id);
  const colorsHtml = (p.colors||[]).map((c,i) => `<div class="color-dot ${i===0?'active':''}" style="background:${c}" data-color="${c}"></div>`).join('');

  document.getElementById('product-detail-content').innerHTML = `
  <button class="back-btn" id="product-back-btn-inline" onclick="navigateTo(prevPage||'categories')">← Back</button>
  <div class="pd-grid">
    <div class="pd-gallery"><img src="${p.image}" alt="${p.name}" /></div>
    <div class="pd-info">
      <div class="pd-badges">
        <span class="seller-type-badge ${p.sellerType}">${p.sellerType === 'branded' ? '🏢 Branded' : '🏠 Local'}</span>
        ${p.badge ? `<span class="product-badge ${getBadgeClass(p.badge)}">${p.badge}</span>` : ''}
      </div>
      <h1 class="pd-title">${p.name}</h1>
      <div class="pd-seller">Sold by <strong>${p.seller}</strong> · <span style="color:var(--text-3)">${p.sellerType} seller</span></div>
      <div class="pd-rating">
        <span class="stars" style="font-size:18px">${getStars(p.rating)}</span>
        <span class="rating-num" style="font-size:16px">${p.rating}</span>
        <span class="rating-count">(${p.reviewCount} reviews)</span>
      </div>
      <div class="pd-price-area">
        <span class="pd-price">${formatPrice(p.price)}</span>
        ${p.originalPrice ? `<span class="pd-old-price">${formatPrice(p.originalPrice)}</span>` : ''}
        ${discount>0 ? `<div><span class="pd-save">You save ${formatPrice(p.originalPrice-p.price)} (${discount}% off)</span></div>` : ''}
      </div>
      <p class="pd-desc">${p.description}</p>
      ${p.colors && p.colors.length ? `<div class="pd-colors"><label>Colors</label><div class="color-dots">${colorsHtml}</div></div>` : ''}
      <div class="pd-actions">
        ${(() => {
          const cart = Store.getCart();
          const item = cart.find(i => i.id === p.id);
          if (item) {
            return `
              <div class="ci-qty-controls pd-qty-controls">
                <button class="qty-btn" onclick="changeQty(${p.id}, ${item.qty - 1})">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${p.id}, ${item.qty + 1})">+</button>
              </div>`;
          }
          return `<button class="btn btn-primary" onclick="handleAddToCart(${p.id})">🛒 Add to Cart</button>`;
        })()}
        <button class="btn btn-outline" onclick="handleWishlist(${p.id})" id="pd-wl-btn">${wished?'❤️ Wishlisted':'🤍 Wishlist'}</button>
      </div>
      <div class="pd-meta-list">
        ${p.dimensions ? `<div class="pd-meta-row"><span class="pd-meta-key">Dimensions</span><span class="pd-meta-val">${p.dimensions.w}cm × ${p.dimensions.d}cm × ${p.dimensions.h}cm</span></div>` : ''}
        <div class="pd-meta-row"><span class="pd-meta-key">Seller</span><span class="pd-meta-val">${p.seller}</span></div>
        <div class="pd-meta-row"><span class="pd-meta-key">Availability</span><span class="pd-meta-val" style="color:var(--green)">${p.inStock ? '✓ In Stock' : '✗ Out of Stock'}</span></div>
      </div>
    </div>
  </div>
  <div class="pd-reviews-section">
    <div id="pd-reviews-container"><p style="color:var(--text-3)">Loading reviews…</p></div>
  </div>`;

  document.querySelectorAll('.color-dot').forEach(d => {
    d.addEventListener('click', () => { document.querySelectorAll('.color-dot').forEach(x=>x.classList.remove('active')); d.classList.add('active'); });
  });

  navigateTo('product');
  renderReviewsSection(id);
}

/* The order_item a logged-in buyer is currently allowed to review for whichever
   product's detail page is open — null if they haven't bought it, haven't paid yet,
   or already reviewed this exact purchase. Set by renderReviewsSection(), read by
   submitReview(). */
let _reviewEligibleOrderItemId = null;

async function renderReviewsSection(productId) {
  const container = document.getElementById('pd-reviews-container');
  if (!container) return;

  let data;
  try {
    data = await Api.productReviews(productId);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--text-3)">Couldn't load reviews: ${err.message}</p>`;
    return;
  }

  _reviewEligibleOrderItemId = null;
  let eligibilityNote = currentUser
    ? 'Only buyers who have paid for this product can leave a review.'
    : 'Sign in and purchase this product to write a review.';
  if (currentUser) {
    try {
      const orders = await Api.myOrders();
      for (const order of orders) {
        const match = order.items.find(i => i.product_id === productId && !i.reviewed);
        if (match) { _reviewEligibleOrderItemId = match.id; break; }
      }
      if (!_reviewEligibleOrderItemId) {
        const boughtAny = orders.some(o => o.items.some(i => i.product_id === productId));
        eligibilityNote = boughtAny
          ? "You've already reviewed every purchase of this product."
          : 'Buy this product to write a review.';
      }
    } catch { /* leave default message if the order check fails */ }
  }

  const starsRow = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  container.innerHTML = `
    <h2>Customer Reviews ${data.average_rating !== null ? `· ${data.average_rating} ${starsRow(Math.round(data.average_rating))} (${data.review_count})` : '(no reviews yet)'}</h2>
    <div class="review-list" id="pd-review-list">
      ${data.reviews.length ? data.reviews.map(r => `
      <div class="review-item">
        <div class="ri-header">
          <div><span class="ri-user">${r.buyer_name}</span> <span class="stars" style="font-size:12px;margin-left:8px">${starsRow(r.rating)}</span></div>
          <span class="ri-date">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <p class="ri-comment">${r.comment || ''}</p>
      </div>`).join('') : '<p style="color:var(--text-3)">No reviews yet — be the first to buy and review this.</p>'}
    </div>
    ${_reviewEligibleOrderItemId ? `
    <div class="add-review-card">
      <h3>Write a Review</h3>
      <div class="star-picker" id="star-picker" data-selected="0">
        ${[1,2,3,4,5].map(n=>`<span class="star-pick" data-val="${n}">★</span>`).join('')}
      </div>
      <textarea class="review-textarea" id="rev-text" placeholder="Share your experience..."></textarea>
      <br/><br/>
      <button class="btn btn-primary" id="submit-review-btn" onclick="submitReview(${productId})">Submit Review</button>
    </div>` : `<p style="color:var(--text-3);font-size:14px;margin-top:12px">${eligibilityNote}</p>`}
  `;

  document.querySelectorAll('.star-pick').forEach(s => {
    s.addEventListener('click', () => {
      const val = parseInt(s.dataset.val);
      document.getElementById('star-picker').dataset.selected = val;
      document.querySelectorAll('.star-pick').forEach((x,i) => x.classList.toggle('active', i < val));
    });
  });
}

/* Filter & Sort */
function applyFilters() {
  const cat = document.querySelector('input[name="filter-cat"]:checked')?.value || 'all';
  const seller = document.querySelector('input[name="filter-seller"]:checked')?.value || 'all';
  const maxPrice = parseInt(document.getElementById('filter-price')?.value || 50000);
  const minRating = parseFloat(document.querySelector('input[name="filter-rating"]:checked')?.value || 0);
  const sort = document.getElementById('filter-sort')?.value || 'default';
  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();

  let products = allProducts.filter(p => {
    if (cat !== 'all' && p.category !== cat) return false;
    if (seller !== 'all' && p.sellerType !== seller) return false;
    if (p.price > maxPrice) return false;
    if (p.rating < minRating) return false;
    if (search && !p.name.toLowerCase().includes(search) && !p.tags.some(t=>t.includes(search))) return false;
    return true;
  });

  if (sort === 'price-asc') products.sort((a,b)=>a.price-b.price);
  else if (sort === 'price-desc') products.sort((a,b)=>b.price-a.price);
  else if (sort === 'rating-desc') products.sort((a,b)=>b.rating-a.rating);
  else if (sort === 'name-asc') products.sort((a,b)=>a.name.localeCompare(b.name));

  renderProductGrid(products, 'categories-products-grid');
  const ct = document.getElementById('products-count');
  if (ct) ct.textContent = `${products.length} product${products.length!==1?'s':''}`;
}

function initFilters() {
  ['filter-cat','filter-seller','filter-rating'].forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => el.addEventListener('change', applyFilters));
  });
  document.getElementById('filter-price')?.addEventListener('input', e => {
    document.getElementById('price-val').textContent = parseInt(e.target.value).toLocaleString();
    applyFilters();
  });
  document.getElementById('filter-sort')?.addEventListener('change', applyFilters);
  document.getElementById('filter-search')?.addEventListener('input', applyFilters);
  document.getElementById('filter-reset')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="filter-cat"]')[0].checked = true;
    document.querySelectorAll('input[name="filter-seller"]')[0].checked = true;
    document.querySelectorAll('input[name="filter-rating"]')[0].checked = true;
    document.getElementById('filter-price').value = 80000;
    document.getElementById('price-val').textContent = '80,000';
    document.getElementById('filter-sort').value = 'default';
    document.getElementById('filter-search').value = '';
    applyFilters();
  });
  document.getElementById('filter-toggle-mobile')?.addEventListener('click', () => {
    document.getElementById('filters-sidebar').classList.toggle('open');
  });
}

async function submitReview(productId) {
  const rating = parseInt(document.getElementById('star-picker')?.dataset.selected || 0);
  const comment = document.getElementById('rev-text')?.value.trim();
  if (!rating) return showToast('Please select a star rating', 'error');
  if (!_reviewEligibleOrderItemId) return showToast('You are not eligible to review this purchase', 'error');

  await withButtonLoading(document.getElementById('submit-review-btn'), 'Submitting…', async () => {
    await Api.createReview(productId, _reviewEligibleOrderItemId, rating, comment || null);
    showToast('Review submitted! Thank you 🙏', 'success');
    await renderReviewsSection(productId); // refresh the list + re-check eligibility (now used up)
  });
}
