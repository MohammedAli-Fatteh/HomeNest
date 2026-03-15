/* cart.js – cart management and rendering */

function handleAddToCart(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  Store.addToCart(p);
  updateCartBadge();
  refreshCurrentPage();
  showToast(`${p.name} added to cart 🛒`, 'success');
}

function updateCartBadge() {
  const cart = Store.getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = total;
}

function renderCart() {
  const cart = Store.getCart();
  const listEl = document.getElementById('cart-items-list');
  const emptyEl = document.getElementById('cart-empty');
  const summaryEl = document.getElementById('cart-summary');

  if (!cart.length) {
    if (listEl) listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  if (summaryEl) summaryEl.style.display = 'block';

  listEl.innerHTML = cart.map(item => `
  <div class="cart-item-card" data-cart-id="${item.id}">
    <img class="ci-img" src="${item.image}" alt="${item.name}" />
    <div class="ci-info">
      <div class="ci-name">${item.name}</div>
      <div class="ci-seller">by ${item.seller}</div>
      <div class="ci-qty-controls">
        <button class="qty-btn" onclick="changeQty(${item.id}, ${item.qty - 1})">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id}, ${item.qty + 1})">+</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px">
      <span class="ci-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
      <button class="ci-remove" onclick="removeCartItem(${item.id})">🗑</button>
    </div>
  </div>`).join('');

  updateCartSummary(cart);
}

function updateCartSummary(cart) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal > 20000 ? 0 : 199;
  const discount = subtotal > 30000 ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + delivery - discount;
  
  const subtotalEl = document.getElementById('summary-subtotal');
  const deliveryEl = document.getElementById('summary-delivery');
  const discountEl = document.getElementById('summary-discount');
  const totalEl = document.getElementById('summary-total');
  
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'Free' : `₹${delivery}`;
  if (discountEl) discountEl.textContent = `–₹${discount.toLocaleString('en-IN')}`;
  if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
}

function changeQty(id, qty) {
  Store.updateQty(id, qty);
  updateCartBadge();
  renderCart();
  refreshCurrentPage();
}

function removeCartItem(id) {
  Store.removeFromCart(id);
  updateCartBadge();
  renderCart();
  refreshCurrentPage();
  showToast('Item removed from cart', 'info');
}

function initCart() {
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = Store.getCart();
      if (!cart.length) return;
      const orderId = 'HN-' + Date.now().toString().slice(-6);
      Store.addOrder({ 
        id: orderId, 
        items: cart, 
        total: cart.reduce((s, i) => s + i.price * i.qty, 0), 
        date: new Date().toISOString() 
      });
      Store.clearCart();
      updateCartBadge();
      renderCart();
      const orderNumEl = document.getElementById('order-num');
      if (orderNumEl) orderNumEl.textContent = orderId;
      const modal = document.getElementById('checkout-modal');
      if (modal) modal.style.display = 'flex';
    });
  }
  
  document.getElementById('checkout-modal-close')?.addEventListener('click', () => {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.style.display = 'none';
  });
  
  document.getElementById('continue-shopping-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.style.display = 'none';
    navigateTo('home');
  });
}
