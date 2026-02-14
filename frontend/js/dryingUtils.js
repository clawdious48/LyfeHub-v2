/* ===================================================================
   dryingUtils.js — Shared utilities for drying logs UI
   =================================================================== */

// ── GPP Calculation (IAPWS constants, ported from backend) ──────────
function calculateGPP(tempF, rhPercent) {
  if (tempF === null || tempF === undefined || typeof tempF !== 'number' || isNaN(tempF)) return null;
  if (rhPercent === null || rhPercent === undefined || typeof rhPercent !== 'number' || isNaN(rhPercent)) return null;
  if (rhPercent < 0 || rhPercent > 100) return null;

  const c8 = -10440.397, c9 = -11.29465, c10 = -0.027022355,
        c11 = 0.00001289036, c12 = -0.0000000024780681, c13 = 6.5459673;
  const tempR = tempF + 459.67;
  const lnPws = c8/tempR + c9 + c10*tempR + c11*tempR*tempR + c12*tempR*tempR*tempR + c13*Math.log(tempR);
  const Pws = Math.exp(lnPws);
  const Pw = (rhPercent / 100) * Pws;
  const W = 0.62198 * Pw / (14.696 - Pw);
  return Math.round(W * 7000 * 10) / 10;
}

// ── Dry Standard Check ──────────────────────────────────────────────
function meetsDryStandard(readingValue, baselineValue) {
  if (readingValue === null || readingValue === undefined) return false;
  if (baselineValue === null || baselineValue === undefined) return false;
  return readingValue <= baselineValue + 4;
}

// ── Material Codes ──────────────────────────────────────────────────
const MATERIAL_CODES = [
  // Wall
  { code: 'D', label: 'Drywall', category: 'Wall' },
  { code: 'I', label: 'Insulation', category: 'Wall' },
  { code: 'PNL', label: 'Paneling', category: 'Wall' },
  // Floor
  { code: 'C', label: 'Carpet', category: 'Floor' },
  { code: 'TL', label: 'Tile', category: 'Floor' },
  { code: 'SF', label: 'Subfloor', category: 'Floor' },
  { code: 'WF', label: 'Wood Floor', category: 'Floor' },
  // Structure
  { code: 'FRM', label: 'Framing', category: 'Structure' },
  { code: 'CJST', label: 'Ceiling Joist', category: 'Structure' },
  { code: 'FJST', label: 'Floor Joist', category: 'Structure' },
  // Sheeting
  { code: 'OSB', label: 'OSB', category: 'Sheeting' },
  { code: 'PB', label: 'Particle Board', category: 'Sheeting' },
  { code: 'PBU', label: 'Particle Board Underlayment', category: 'Sheeting' },
  { code: 'PLY', label: 'Plywood', category: 'Sheeting' },
  // Trim & Millwork
  { code: 'MDFB', label: 'MDF (Baseboard)', category: 'Trim & Millwork' },
  { code: 'MDFC', label: 'MDF (Casing)', category: 'Trim & Millwork' },
  { code: 'WDB', label: 'Wood (Baseboard)', category: 'Trim & Millwork' },
  { code: 'WDC', label: 'Wood (Casing)', category: 'Trim & Millwork' },
  { code: 'CAB', label: 'Cabinetry', category: 'Trim & Millwork' },
  // Concrete
  { code: 'CW', label: 'Concrete Wall', category: 'Concrete' },
  { code: 'CF', label: 'Concrete Floor', category: 'Concrete' },
  // Other
  { code: 'TK', label: 'Tack Strip', category: 'Other' },
];

// ── Chamber Colors (neon palette) ───────────────────────────────────
const CHAMBER_COLORS = [
  { name: 'Purple', hex: '#bf5af2' },
  { name: 'Cyan', hex: '#00aaff' },
  { name: 'Teal', hex: '#00f5d4' },
  { name: 'Green', hex: '#05ffa1' },
  { name: 'Pink', hex: '#ff2a6d' },
  { name: 'Orange', hex: '#ff9f1c' },
  { name: 'Yellow', hex: '#ffe66d' },
  { name: 'Blue', hex: '#4361ee' }
];

// ── Surface Types (location of reference point) ────────────────────
const SURFACE_TYPES = [
  { key: 'wall', label: 'Wall' },
  { key: 'ceiling', label: 'Ceiling' },
  { key: 'floor', label: 'Floor' },
  { key: 'cabinetry', label: 'Cabinetry' }
];

// Materials available per surface type
const SURFACE_MATERIALS = {
  wall: ['D', 'I', 'PNL', 'FRM', 'OSB', 'PB', 'PLY', 'CW', 'MDFB', 'MDFC', 'WDB', 'WDC'],
  ceiling: ['D', 'I', 'CJST', 'FRM', 'OSB', 'PLY'],
  floor: ['C', 'TL', 'SF', 'WF', 'CF', 'TK', 'FJST', 'OSB', 'PB', 'PBU', 'PLY'],
  cabinetry: ['CAB', 'PNL', 'TK']
};

// ── Equipment Types ─────────────────────────────────────────────────
const EQUIPMENT_TYPES = [
  { type: 'dehumidifier', label: 'Dehumidifiers', shortLabel: 'DH', category: 'equipment' },
  { type: 'air_mover', label: 'Air Movers', shortLabel: 'AM', category: 'equipment' },
  { type: 'negative_air', label: 'Negative Air Machines', shortLabel: 'NAM', category: 'equipment' },
  { type: 'injectidry', label: 'Injectidry System', shortLabel: 'INJ', category: 'specialty' },
  { type: 'multi_port', label: 'Multi-port Attachments', shortLabel: 'MPA', category: 'specialty' },
  { type: 'heated_air_mover', label: 'Heated Air Movers', shortLabel: 'HAM', category: 'specialty' },
];

// ── Format GPP ──────────────────────────────────────────────────────
function formatGPP(gpp) {
  if (gpp === null || gpp === undefined) return '--';
  return gpp.toFixed(1);
}

// ── Format Delta (with directional arrow) ───────────────────────────
function formatDelta(current, prior) {
  if (current === null || current === undefined) return '--';
  if (prior === null || prior === undefined) return '--';
  const diff = current - prior;
  if (diff < 0) return '\u2193' + Math.abs(diff).toFixed(1);
  if (diff > 0) return '\u2191' + diff.toFixed(1);
  return '\u2193' + '0.0';
}

// ── HTML Escape ─────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Build Material Select ───────────────────────────────────────────
function buildMaterialSelect(selectedCode, name, id) {
  const categories = {};
  for (const m of MATERIAL_CODES) {
    if (!categories[m.category]) categories[m.category] = [];
    categories[m.category].push(m);
  }

  let html = `<select class="dry-input" name="${escapeHtml(name)}" id="${escapeHtml(id)}">`;
  html += `<option value="">Select material...</option>`;

  for (const [cat, materials] of Object.entries(categories)) {
    html += `<optgroup label="${escapeHtml(cat)}">`;
    for (const m of materials) {
      const sel = m.code === selectedCode ? ' selected' : '';
      html += `<option value="${escapeHtml(m.code)}"${sel}>${escapeHtml(m.label)}</option>`;
    }
    html += `</optgroup>`;
  }

  html += `</select>`;
  return html;
}

// ── Build Surface Type Select ──────────────────────────────────────
function buildSurfaceSelect(selectedKey, id) {
  let html = `<select class="dry-input" id="${escapeHtml(id)}">`;
  html += `<option value="">Surface type...</option>`;
  for (const st of SURFACE_TYPES) {
    const sel = st.key === selectedKey ? ' selected' : '';
    html += `<option value="${escapeHtml(st.key)}"${sel}>${escapeHtml(st.label)}</option>`;
  }
  html += `</select>`;
  return html;
}

// ── Build Filtered Material Select (by surface type) ───────────────
function buildFilteredMaterialSelect(surfaceKey, selectedCode, id) {
  const codes = SURFACE_MATERIALS[surfaceKey] || [];
  const disabled = !surfaceKey ? ' disabled' : '';
  let html = `<select class="dry-input" name="material_code" id="${escapeHtml(id)}"${disabled}>`;
  html += `<option value="">Select material...</option>`;
  for (const code of codes) {
    const m = MATERIAL_CODES.find(mc => mc.code === code);
    if (!m) continue;
    const sel = m.code === selectedCode ? ' selected' : '';
    html += `<option value="${escapeHtml(m.code)}"${sel}>${escapeHtml(m.label)}</option>`;
  }
  html += `</select>`;
  return html;
}

// ── Get surface key from label ─────────────────────────────────────
function getSurfaceKeyFromLabel(label) {
  const st = SURFACE_TYPES.find(s => s.label === label);
  return st ? st.key : null;
}

// ── Build Color Picker ──────────────────────────────────────────────
function buildColorPicker(selectedHex) {
  let html = '<div class="dry-color-picker">';
  for (const c of CHAMBER_COLORS) {
    const sel = c.hex === selectedHex ? ' selected' : '';
    html += `<div class="dry-color-swatch${sel}" data-color="${c.hex}" style="background:${c.hex}"></div>`;
  }
  html += '</div>';
  return html;
}

// ── Export to window ────────────────────────────────────────────────
window.dryingUtils = {
  calculateGPP,
  meetsDryStandard,
  MATERIAL_CODES,
  CHAMBER_COLORS,
  EQUIPMENT_TYPES,
  SURFACE_TYPES,
  SURFACE_MATERIALS,
  formatGPP,
  formatDelta,
  buildMaterialSelect,
  buildSurfaceSelect,
  buildFilteredMaterialSelect,
  getSurfaceKeyFromLabel,
  buildColorPicker,
  escapeHtml,
  confirm: customConfirm
};

/**
 * Styled confirm dialog that matches the app theme.
 * @param {Object} opts
 * @param {string} opts.title - Dialog title
 * @param {string} opts.message - Dialog message/body
 * @param {string} [opts.confirmText='Confirm'] - Confirm button text
 * @param {string} [opts.cancelText='Cancel'] - Cancel button text
 * @param {string} [opts.confirmClass='dry-btn-danger'] - Confirm button style class
 * @param {string} [opts.icon] - Optional emoji/icon to show
 * @returns {Promise<boolean>}
 */
function customConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'dry-btn-danger', icon = '' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dry-confirm-overlay';
    overlay.innerHTML = `
      <div class="dry-confirm-backdrop"></div>
      <div class="dry-confirm-card">
        ${icon ? `<div class="dry-confirm-icon">${icon}</div>` : ''}
        <h3 class="dry-confirm-title">${title}</h3>
        <p class="dry-confirm-message">${message}</p>
        <div class="dry-confirm-actions">
          <button class="dry-btn dry-btn-secondary dry-btn-sm dry-confirm-cancel">${cancelText}</button>
          <button class="dry-btn ${confirmClass} dry-btn-sm dry-confirm-ok">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const cleanup = (result) => {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    overlay.querySelector('.dry-confirm-backdrop').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.dry-confirm-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.dry-confirm-ok').addEventListener('click', () => cleanup(true));

    // Focus confirm button
    setTimeout(() => overlay.querySelector('.dry-confirm-ok').focus(), 50);
  });
}
