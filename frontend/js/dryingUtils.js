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
  { code: 'D', label: 'Drywall', category: 'Wall' },
  { code: 'I', label: 'Insulation', category: 'Wall' },
  { code: 'PNL', label: 'Paneling', category: 'Wall' },
  { code: 'C', label: 'Carpet', category: 'Floor' },
  { code: 'TL', label: 'Tile', category: 'Floor' },
  { code: 'SF', label: 'Subfloor', category: 'Floor' },
  { code: 'WF', label: 'Wood Floor', category: 'Floor' },
  { code: 'FRM', label: 'Framing', category: 'Structure' },
  { code: 'CJST', label: 'Ceiling Joist', category: 'Structure' },
  { code: 'FJST', label: 'Floor Joist', category: 'Structure' },
  { code: 'CW', label: 'Concrete Wall', category: 'Concrete' },
  { code: 'TK', label: 'Tack Strip', category: 'Other' }
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

// ── Equipment Types ─────────────────────────────────────────────────
const EQUIPMENT_TYPES = [
  { type: 'air_mover', label: 'Air Movers', shortLabel: 'AM' },
  { type: 'dehumidifier', label: 'Dehumidifiers', shortLabel: 'DH' },
  { type: 'air_scrubber', label: 'Air Scrubbers', shortLabel: 'AS' },
  { type: 'fan', label: 'NAFAN Fans', shortLabel: 'NAFAN' },
  { type: 'heater', label: 'Heaters', shortLabel: 'HTR' },
  { type: 'specialty', label: 'Specialty Equipment', shortLabel: 'SPEC' }
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
  formatGPP,
  formatDelta,
  buildMaterialSelect,
  buildColorPicker,
  escapeHtml
};
