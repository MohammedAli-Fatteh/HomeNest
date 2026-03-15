/* wishlist.js – wishlist management */

function handleWishlist(productId) {
  const w = Store.toggleWishlist(productId);
  const isNow = Store.isWishlisted(productId);
  updateWishlistBadge();
  showToast(isNow ? '❤️ Added to wishlist' : '🤍 Removed from wishlist', isNow ? 'success' : 'info');
  // Update all wishlist buttons for this product
  document.querySelectorAll(`[data-wl-id="${productId}"]`).forEach(btn => {
    btn.textContent = isNow ? '❤️' : '🤍';
    btn.classList.toggle('active', isNow);
  });
  const pdBtn = document.getElementById('pd-wl-btn');
  if (pdBtn) pdBtn.textContent = isNow ? '❤️ Wishlisted' : '🤍 Wishlist';
}

function updateWishlistBadge() {
  const count = Store.getWishlist().length;
  document.getElementById('wishlist-badge').textContent = count;
}

function renderWishlist() {
  const ids = Store.getWishlist();
  const products = allProducts.filter(p => ids.includes(p.id));
  const grid = document.getElementById('wishlist-grid');
  const empty = document.getElementById('wishlist-empty');
  if (!products.length) {
    if (grid) grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  renderProductGrid(products, 'wishlist-grid');
}
