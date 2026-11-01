/* planner.js – Room Planner with drag/drop, rotate, save */

const Planner = (() => {
  let roomW = 5, roomH = 4;
  let scale = 80; // pixels per meter
  let furniture = []; // [{id, type, icon, label, x, y, w, h, rotation}]
  let selectedId = null;
  let dragging = null; // {id, startX, startY, itemX, itemY}
  let nextId = 1;

  const canvas = () => document.getElementById('room-canvas');
  const container = () => document.getElementById('room-canvas-container');

  function computeScale() {
    const cont = container();
    if (!cont) return 80;
    const availW = cont.clientWidth - 60;
    const availH = cont.clientHeight - 60;
    const sx = availW / roomW;
    const sy = availH / roomH;
    return Math.min(sx, sy, 120);
  }

  function applyRoomSize() {
    scale = computeScale();
    const c = canvas();
    if (!c) return;
    c.style.width = (roomW * scale) + 'px';
    c.style.height = (roomH * scale) + 'px';
    c.style.backgroundImage = `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`;
    c.style.backgroundSize = `${scale}px ${scale}px`;
    document.getElementById('room-label').textContent = `Room: ${roomW}m × ${roomH}m`;
    renderFurniture();
  }

  function renderFurniture() {
    const c = canvas();
    if (!c) return;
    c.querySelectorAll('.room-furniture').forEach(el => el.remove());
    furniture.forEach(f => {
      const el = document.createElement('div');
      el.className = 'room-furniture' + (f.id === selectedId ? ' selected' : '');
      el.dataset.id = f.id;
      const rW = f.rotation % 180 === 0 ? f.w : f.h;
      const rH = f.rotation % 180 === 0 ? f.h : f.w;
      el.style.cssText = `left:${f.x*scale}px;top:${f.y*scale}px;width:${rW*scale}px;height:${rH*scale}px;background:${selectedId===f.id?'rgba(201,135,90,0.15)':'rgba(201,135,90,0.08)'};`;
      el.innerHTML = `<span class="rf-icon">${f.icon}</span><span class="rf-label">${f.label}</span>`;
      el.addEventListener('mousedown', e => startDrag(e, f.id));
      el.addEventListener('touchstart', e => startDrag(e, f.id), { passive: false });
      el.addEventListener('click', e => { e.stopPropagation(); selectItem(f.id); });
      c.appendChild(el);
    });
  }

  function selectItem(id) {
    selectedId = id;
    renderFurniture();
    updateSelectedUI();
  }

  function updateSelectedUI() {
    const f = furniture.find(x => x.id === selectedId);
    const info = document.getElementById('selected-info');
    const ctrl = document.getElementById('planner-item-controls');
    if (f) {
      info.innerHTML = `<div style="font-weight:700">${f.icon} ${f.label}</div><div style="font-size:12px;color:var(--text-3);margin-top:4px">${f.w}m × ${f.h}m · Rotation: ${f.rotation}°</div>`;
      if (ctrl) ctrl.style.display = 'flex';
    } else {
      info.innerHTML = '<p class="no-selection">No item selected</p>';
      if (ctrl) ctrl.style.display = 'none';
    }
  }

  /* Works for both mouse events and touch events — a touch event's coordinates live
     one level deeper, under .touches[0] (start) or .changedTouches[0] (end). */
  function pointerXY(e) {
    const t = e.touches?.[0] || e.changedTouches?.[0];
    return t ? { x: t.clientX, y: t.clientY } : { x: e.clientX, y: e.clientY };
  }

  function startDrag(e, id) {
    const isTouch = e.type === 'touchstart';
    if (isTouch) e.preventDefault(); // stop the page from scrolling while dragging furniture
    const f = furniture.find(x => x.id === id);
    if (!f) return;
    selectItem(id);
    const start = pointerXY(e);
    dragging = { id, startX: start.x, startY: start.y, itemX: f.x, itemY: f.y };

    const onMove = ev => {
      if (isTouch) ev.preventDefault();
      const p = pointerXY(ev);
      const dx = (p.x - dragging.startX) / scale;
      const dy = (p.y - dragging.startY) / scale;
      const fd = furniture.find(x => x.id === dragging.id);
      if (!fd) return;
      const rW = fd.rotation % 180 === 0 ? fd.w : fd.h;
      const rH = fd.rotation % 180 === 0 ? fd.h : fd.w;
      fd.x = Math.max(0, Math.min(roomW - rW, dragging.itemX + dx));
      fd.y = Math.max(0, Math.min(roomH - rH, dragging.itemY + dy));
      renderFurniture();
    };
    const onUp = () => {
      dragging = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    if (isTouch) {
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    } else {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  }

  function addFurnitureItem(type, icon, label, w, h) {
    // Centered, with a small offset per existing item of the same type so repeated
    // taps fan out instead of stacking exactly on top of each other.
    const sameType = furniture.filter(f => f.type === type).length;
    const x = Math.max(0, Math.min(roomW - w, (roomW - w) / 2 + sameType * 0.3));
    const y = Math.max(0, Math.min(roomH - h, (roomH - h) / 2 + sameType * 0.3));
    const id = nextId++;
    furniture.push({ id, type, icon, label, w, h, x, y, rotation: 0 });
    renderFurniture();
    selectItem(id);
    showToast(`${icon} ${label} added to room`, 'success');
  }

  function rotateSelected() {
    const f = furniture.find(x => x.id === selectedId);
    if (!f) return;
    f.rotation = (f.rotation + 90) % 360;
    renderFurniture();
    updateSelectedUI();
  }

  function deleteSelected() {
    furniture = furniture.filter(x => x.id !== selectedId);
    selectedId = null;
    renderFurniture();
    updateSelectedUI();
  }

  /* Designs now live on the backend (Api.saveDesign / myDesigns / delete), not
     LocalStorage — that's what makes the share link actually work for someone else
     opening it on a different device. */

  function currentLayoutJson() {
    return JSON.stringify({ furniture, roomW, roomH });
  }

  async function saveLayout() {
    if (!currentUser) {
      showToast('Sign in to save and share a layout', 'info');
      openAuthModal('login');
      return;
    }
    const name = prompt('Enter a name for this layout:', 'My Room');
    if (!name) return;

    const btn = document.getElementById('save-layout');
    await withButtonLoading(btn, 'Saving…', async () => {
      const design = await Api.saveDesign(name, lastSuggestedBudget, currentLayoutJson());
      const shareUrl = `${location.origin}${location.pathname}?share=${design.share_token}`;
      await navigator.clipboard?.writeText(shareUrl).catch(() => {});
      showToast(`Saved! Share link copied: ${shareUrl}`, 'success');
      renderSavedLayouts();
    });
  }

  function applyLoadedDesign(layoutJson) {
    const d = JSON.parse(layoutJson);
    roomW = d.roomW; roomH = d.roomH;
    furniture = d.furniture || [];
    nextId = Math.max(0, ...furniture.map(f => f.id)) + 1;
    document.getElementById('room-length').value = roomW;
    document.getElementById('room-width').value = roomH;
    applyRoomSize();
  }

  async function loadLayout(designId) {
    try {
      const designs = await Api.myDesigns();
      const design = designs.find(d => d.id === designId);
      if (!design) return showToast('Design not found', 'error');
      applyLoadedDesign(design.layout_json);
      showToast(`Layout "${design.name}" loaded! ✅`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /* Loads a design from a ?share=<token> link — works for ANYONE, logged in or not,
     since the backend's share endpoint is public by design. */
  async function loadSharedFromUrl() {
    const token = new URLSearchParams(location.search).get('share');
    if (!token) return;
    try {
      const design = await Api.getSharedDesign(token);
      applyLoadedDesign(design.layout_json);
      showToast(`Loaded shared layout "${design.name}" 🔗`, 'success');
      navigateTo('planner');
    } catch (err) {
      showToast(`Could not load that shared layout: ${err.message}`, 'error');
    }
  }

  async function deleteLayout(designId) {
    try {
      await Api.deleteDesign(designId);
      renderSavedLayouts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function renderSavedLayouts() {
    const el = document.getElementById('saved-layouts');
    if (!el) return;
    if (!currentUser) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text-3)">Sign in to see your saved layouts</p>';
      return;
    }
    el.innerHTML = '<p style="font-size:12px;color:var(--text-3)">Loading…</p>';
    try {
      const designs = await Api.myDesigns();
      el.innerHTML = designs.length ? designs.map(d => `
      <div class="saved-layout-item">
        <span class="sli-name">${d.name}</span>
        <div class="sli-actions">
          <button class="sli-btn" onclick="Planner.load(${d.id})" title="Load">📂</button>
          <button class="sli-btn" onclick="Planner.copyShareLink('${d.share_token}')" title="Copy share link">🔗</button>
          <button class="sli-btn" onclick="Planner.deleteLayout(${d.id})" title="Delete">🗑</button>
        </div>
      </div>`).join('') : '<p style="font-size:12px;color:var(--text-3)">No saved layouts</p>';
    } catch (err) {
      el.innerHTML = `<p style="font-size:12px;color:var(--text-3)">${err.message}</p>`;
    }
  }

  function copyShareLink(token) {
    const url = `${location.origin}${location.pathname}?share=${token}`;
    navigator.clipboard?.writeText(url).then(
      () => showToast('Share link copied!', 'success'),
      () => showToast(url, 'info'),
    );
  }

  /* ---- Budget-aware suggestions ---- */
  let lastSuggestedBudget = null;

  async function suggestBudget() {
    const budget = parseFloat(document.getElementById('planner-budget')?.value);
    const categoriesRaw = document.getElementById('planner-categories')?.value || '';
    const categories = categoriesRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const resultEl = document.getElementById('budget-suggestions-result');
    if (!budget || budget <= 0) return showToast('Enter a budget first', 'error');
    if (!categories.length) return showToast('Enter at least one category, e.g. sofa, table, lamp', 'error');

    const btn = document.getElementById('suggest-budget-btn');
    await withButtonLoading(btn, 'Thinking…', async () => {
      const res = await Api.suggestLayout(budget, categories);
      lastSuggestedBudget = budget;
      resultEl.innerHTML = `
        ${res.suggestions.map(s => `
          <div class="saved-layout-item">
            <span class="sli-name">${s.category}: ${s.product.name} — ${formatPrice(s.product.price)}</span>
            <button class="sli-btn" onclick="handleAddToCart(${s.product.id})" title="Add to cart">🛒</button>
          </div>`).join('') || '<p style="font-size:12px;color:var(--text-3)">No products matched your categories.</p>'}
        ${res.unfilled_categories.length ? `<p style="font-size:12px;color:var(--text-3);margin-top:8px">Couldn't fit within budget: ${res.unfilled_categories.join(', ')}</p>` : ''}
        <p style="font-size:12px;font-weight:700;margin-top:8px">Spent ${formatPrice(res.total_cost)} · ${formatPrice(res.budget_remaining)} remaining</p>
      `;
    });
  }

  const FURNITURE_LABELS = { sofa:'Sofa', bed:'Bed', table:'Table', coffee:'Coffee Table', lamp:'Lamp', wardrobe:'Wardrobe', desk:'Desk', carpet:'Rug' };

  function initDragFromPalette() {
    document.querySelectorAll('.furniture-item').forEach(item => {
      const data = {
        type: item.dataset.furniture,
        w: parseFloat(item.dataset.w),
        d: parseFloat(item.dataset.d),
        icon: item.dataset.icon,
      };
      // Desktop: native HTML5 drag-and-drop onto the canvas.
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('furniture', JSON.stringify(data));
      });
      // Mobile/touch: native drag-and-drop doesn't fire on touchscreens at all, so a
      // tap instead places the item in the middle of the room — the person can then
      // drag it (via the touch handler on the furniture itself) to where they want it.
      item.addEventListener('click', () => {
        const label = FURNITURE_LABELS[data.type] || data.type;
        addFurnitureItem(data.type, data.icon, label, data.w, data.d);
      });
    });
    const c = canvas();
    if (!c) return;
    c.addEventListener('dragover', e => e.preventDefault());
    c.addEventListener('drop', e => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData('furniture'));
      const rect = c.getBoundingClientRect();
      const x = Math.max(0, Math.min(roomW - data.w, (e.clientX - rect.left) / scale));
      const y = Math.max(0, Math.min(roomH - data.d, (e.clientY - rect.top) / scale));
      furniture.push({ id: nextId++, type: data.type, icon: data.icon, label: FURNITURE_LABELS[data.type]||data.type, w: data.w, h: data.d, x, y, rotation: 0 });
      renderFurniture();
      showToast(`${data.icon} dropped into room`, 'success');
    });
    c.addEventListener('click', e => { if (e.target === c) { selectedId = null; renderFurniture(); updateSelectedUI(); } });
    c.addEventListener('wheel', e => {
      if (selectedId) { e.preventDefault(); rotateSelected(); }
    }, { passive: false });
  }

  document.addEventListener('keydown', e => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault(); deleteSelected();
      }
    }
  });

  function init() {
    document.getElementById('apply-room-size')?.addEventListener('click', () => {
      roomW = parseFloat(document.getElementById('room-length').value) || 5;
      roomH = parseFloat(document.getElementById('room-width').value) || 4;
      applyRoomSize();
    });
    document.getElementById('rotate-item')?.addEventListener('click', rotateSelected);
    document.getElementById('delete-item')?.addEventListener('click', deleteSelected);
    document.getElementById('save-layout')?.addEventListener('click', saveLayout);
    document.getElementById('suggest-budget-btn')?.addEventListener('click', suggestBudget);
    document.getElementById('clear-layout')?.addEventListener('click', () => { furniture = []; selectedId = null; renderFurniture(); updateSelectedUI(); showToast('Room cleared', 'info'); });
    applyRoomSize();
    initDragFromPalette();
    renderSavedLayouts();
    loadSharedFromUrl();
    window.addEventListener('resize', () => applyRoomSize());
  }

  return { init, load: loadLayout, deleteLayout, copyShareLink, addItem: addFurnitureItem };
})();
