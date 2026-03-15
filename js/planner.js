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

  function startDrag(e, id) {
    e.preventDefault();
    const f = furniture.find(x => x.id === id);
    if (!f) return;
    selectItem(id);
    const c = canvas();
    const rect = c.getBoundingClientRect();
    dragging = { id, startX: e.clientX, startY: e.clientY, itemX: f.x, itemY: f.y };

    const onMove = ev => {
      const dx = (ev.clientX - dragging.startX) / scale;
      const dy = (ev.clientY - dragging.startY) / scale;
      const fd = furniture.find(x => x.id === dragging.id);
      if (!fd) return;
      const rW = fd.rotation % 180 === 0 ? fd.w : fd.h;
      const rH = fd.rotation % 180 === 0 ? fd.h : fd.w;
      fd.x = Math.max(0, Math.min(roomW - rW, dragging.itemX + dx));
      fd.y = Math.max(0, Math.min(roomH - rH, dragging.itemY + dy));
      renderFurniture();
    };
    const onUp = () => { dragging = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function addFurnitureItem(type, icon, label, w, h) {
    furniture.push({ id: nextId++, type, icon, label, w, h, x: 0, y: 0, rotation: 0 });
    renderFurniture();
    selectItem(nextId - 1);
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

  function saveLayout() {
    const name = prompt('Enter a name for this layout:', `Layout ${Store.getLayouts().length + 1}`);
    if (!name) return;
    Store.saveLayout(name, { furniture, roomW, roomH });
    renderSavedLayouts();
    showToast(`Layout "${name}" saved! 💾`, 'success');
  }

  function loadLayout(name) {
    const layouts = Store.getLayouts();
    const layout = layouts.find(l => l.name === name);
    if (!layout) return;
    const d = layout.data;
    roomW = d.roomW; roomH = d.roomH;
    furniture = d.furniture || [];
    nextId = Math.max(...furniture.map(f=>f.id), 0) + 1;
    document.getElementById('room-length').value = roomW;
    document.getElementById('room-width').value = roomH;
    applyRoomSize();
    showToast(`Layout "${name}" loaded! ✅`, 'success');
  }

  function renderSavedLayouts() {
    const el = document.getElementById('saved-layouts');
    if (!el) return;
    const layouts = Store.getLayouts();
    if (!layouts.length) { el.innerHTML = '<p style="font-size:12px;color:var(--text-3)">No saved layouts</p>'; return; }
    el.innerHTML = layouts.map(l => `
    <div class="saved-layout-item">
      <span class="sli-name">${l.name}</span>
      <div class="sli-actions">
        <button class="sli-btn" onclick="Planner.load('${l.name}')" title="Load">📂</button>
        <button class="sli-btn" onclick="Planner.deleteLayout('${l.name}')" title="Delete">🗑</button>
      </div>
    </div>`).join('');
  }

  function initDragFromPalette() {
    document.querySelectorAll('.furniture-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('furniture', JSON.stringify({
          type: item.dataset.furniture,
          w: parseFloat(item.dataset.w),
          d: parseFloat(item.dataset.d),
          icon: item.dataset.icon
        }));
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
      const labels = { sofa:'Sofa', bed:'Bed', table:'Table', coffee:'Coffee Table', lamp:'Lamp', wardrobe:'Wardrobe', desk:'Desk', carpet:'Rug' };
      furniture.push({ id: nextId++, type: data.type, icon: data.icon, label: labels[data.type]||data.type, w: data.w, h: data.d, x, y, rotation: 0 });
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
    document.getElementById('clear-layout')?.addEventListener('click', () => { furniture = []; selectedId = null; renderFurniture(); updateSelectedUI(); showToast('Room cleared', 'info'); });
    applyRoomSize();
    initDragFromPalette();
    renderSavedLayouts();
    window.addEventListener('resize', () => applyRoomSize());
  }

  return { init, load: loadLayout, deleteLayout: (name) => { Store.deleteLayout(name); renderSavedLayouts(); }, addItem: addFurnitureItem };
})();
