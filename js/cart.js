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
  // Delivery/discount are kept at 0 so the total shown here always matches exactly
  // what the backend computes and what Razorpay actually charges — no surprise
  // difference at payment time.
  const delivery = 0;
  const discount = 0;
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

/* Loads Razorpay's Checkout.js once, the first time it's actually needed — not on
   every page load — and reuses it after that. */
let _razorpayScriptPromise = null;
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (_razorpayScriptPromise) return _razorpayScriptPromise;
  _razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the payment widget. Check your connection.'));
    document.head.appendChild(script);
  });
  return _razorpayScriptPromise;
}

function showOrderSuccess(orderId) {
  Store.clearCart();
  updateCartBadge();
  renderCart();
  const orderNumEl = document.getElementById('order-num');
  if (orderNumEl) orderNumEl.textContent = `#${orderId}`;
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.style.display = 'flex';
}

async function handleCheckout() {
  const cart = Store.getCart();
  if (!cart.length) return;

  if (!currentUser) {
    showToast('Please sign in to place an order', 'info');
    openAuthModal('login');
    return;
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  await withButtonLoading(checkoutBtn, 'Placing order…', async () => {
    const items = cart.map(i => ({ product_id: i.id, quantity: i.qty }));
    const result = await Api.checkout(items); // throws with a clear message if something's out of stock

    if (result.razorpay_key_id === 'mock_key') {
      // Local/demo mode: the backend has no real Razorpay keys configured yet, so we
      // simulate a successful payment instead of opening a real payment popup. See
      // RAZORPAY_SETUP.md on the backend for how to switch to the real popup.
      await Api.verifyPayment(result.order_id, `pay_demo_${Date.now()}`, 'mock_signature');
      showOrderSuccess(result.order_id);
      return;
    }

    await loadRazorpayScript();
    const razorpay = new Razorpay({
      key: result.razorpay_key_id,
      amount: result.amount_paise,
      currency: result.currency,
      order_id: result.razorpay_order_id,
      name: 'HomeNest',
      description: `Order #${result.order_id}`,
      prefill: { name: currentUser.name, email: currentUser.email },
      theme: { color: '#D4714E' },
      handler: async (response) => {
        try {
          await Api.verifyPayment(result.order_id, response.razorpay_payment_id, response.razorpay_signature);
          showOrderSuccess(result.order_id);
        } catch (err) {
          showToast(`Payment could not be confirmed: ${err.message}`, 'error');
        }
      },
      modal: {
        ondismiss: async () => {
          // The buyer closed the payment popup without paying — release the stock we
          // reserved at checkout instead of leaving it locked up forever.
          try { await Api.cancelOrder(result.order_id); } catch { /* already handled server-side on its own */ }
          showToast('Payment cancelled — your cart is unchanged', 'info');
        },
      },
    });
    razorpay.open();
  });
}

function initCart() {
  document.getElementById('checkout-btn')?.addEventListener('click', handleCheckout);

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
