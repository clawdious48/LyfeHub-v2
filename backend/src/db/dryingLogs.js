const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// PURE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate Grains Per Pound (GPP) using the IAPWS saturation vapor pressure formula.
 *
 * @param {number} tempF - Temperature in degrees Fahrenheit
 * @param {number} rhPercent - Relative humidity as a percentage (0-100)
 * @param {number} pressurePsia - Atmospheric pressure in psia (default: sea level 14.696)
 * @returns {number|null} GPP rounded to 1 decimal, or null for invalid inputs
 */
function calculateGPP(tempF, rhPercent, pressurePsia = 14.696) {
  // Validate inputs
  if (tempF === null || tempF === undefined || typeof tempF !== 'number' || isNaN(tempF)) return null;
  if (rhPercent === null || rhPercent === undefined || typeof rhPercent !== 'number' || isNaN(rhPercent)) return null;
  if (rhPercent < 0 || rhPercent > 100) return null;

  // IAPWS constants (copy precisely -- digit errors cause GPP drift)
  const c8 = -10440.397;
  const c9 = -11.29465;
  const c10 = -0.027022355;
  const c11 = 0.00001289036;
  const c12 = -0.0000000024780681;
  const c13 = 6.5459673;

  // Convert to Rankine
  const tempR = tempF + 459.67;

  // Calculate ln(Pws)
  const lnPws = c8 / tempR + c9 + c10 * tempR + c11 * tempR * tempR + c12 * tempR * tempR * tempR + c13 * Math.log(tempR);

  // Saturation vapor pressure
  const Pws = Math.exp(lnPws);

  // Actual vapor pressure
  const Pw = (rhPercent / 100) * Pws;

  // Humidity ratio
  const W = 0.62198 * Pw / (pressurePsia - Pw);

  // Grains per pound (1 lb = 7000 grains)
  const gpp = W * 7000;

  // Round to 1 decimal place
  return Math.round(gpp * 10) / 10;
}

/**
 * Check if a moisture reading meets the IICRC S500 dry standard.
 * A reading meets dry standard when readingValue <= baselineValue + 4.
 *
 * @param {number} readingValue - Current moisture content reading
 * @param {number} baselineValue - Baseline (dry reference) moisture content
 * @returns {boolean} True if reading meets dry standard
 */
function meetsDryStandard(readingValue, baselineValue) {
  if (readingValue === null || readingValue === undefined) return false;
  if (baselineValue === null || baselineValue === undefined) return false;
  return readingValue <= baselineValue + 4;
}

module.exports = {
  calculateGPP,
  meetsDryStandard,
};
