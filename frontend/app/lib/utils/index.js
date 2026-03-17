// Reusable utilities: sanitization, validation, pagination, and date helpers
// Pure JavaScript, no dependencies. Secure by design (no prototype pollution,
// safe parsing, conservative validation).

/* eslint-disable no-prototype-builtins */

// --- Sanitization helpers ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function removeScriptTags(input) {
  if (!input) return '';
  // remove <script>...</script> blocks case-insensitive
  return String(input).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

export function sanitizeString(input, opts = {}) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  // trim
  let out = str.trim();
  // remove script blocks
  out = removeScriptTags(out);
  // optionally allow limited characters (e.g., for names)
  if (opts.allow && opts.allow instanceof RegExp) {
    out = (out.match(opts.allow) || []).join('');
  }
  // escape to prevent HTML injection when rendering
  out = escapeHtml(out);
  return out;
}

export function sanitizeEmail(email) {
  if (!email) return null;
  const s = String(email).trim().toLowerCase();
  // simple, conservative email regex
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(s)) return null;
  return s;
}

export function sanitizePhone(phone) {
  if (!phone) return null;
  const s = String(phone).trim();
  // keep digits and leading +
  const normalized = s.replace(/[^0-9+]/g, '');
  // ensure at least 7 digits
  const digits = normalized.replace(/[^0-9]/g, '');
  if (digits.length < 7) return null;
  return normalized;
}

// Prevent prototype pollution by only copying allowed keys and not touching prototype
export function sanitizeObject(obj = {}, allowedFields = []) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const key of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const val = obj[key];
    if (val === null || val === undefined) continue;
    // shallow sanitization: strings sanitized, primitives passed through, arrays copied
    if (typeof val === 'string') out[key] = sanitizeString(val);
    else if (Array.isArray(val)) out[key] = val.map((v) => (typeof v === 'string' ? sanitizeString(v) : v));
    else out[key] = val;
  }
  return out;
}

export function stripUnknownFields(obj = {}, allowedFields = []) {
  return sanitizeObject(obj, allowedFields);
}

// --- ID and format validation ---
export function isValidObjectId(id) {
  if (!id) return false;
  return /^[a-fA-F0-9]{24}$/.test(String(id));
}

export function isValidUUID(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));
}

export function isValidVendorId(id) {
  if (!id) return false;
  const strId = String(id);
  // Accept both MongoDB ObjectIds (24 hex chars) and vendor_ prefixed IDs
  return /^[0-9a-f]{24}$/.test(strId) || /^vendor_[A-Za-z0-9_-]{3,64}$/.test(strId);
}

export function isValidOrderId(id) {
  if (!id) return false;
  return /^order_[A-Za-z0-9_-]{3,64}$/.test(String(id));
}

// --- Pagination helpers ---
export function getPagination(query = {}) {
  const pageRaw = Number(query.page || query.p || 1);
  const limitRaw = Number(query.limit || query.l || 20);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const MAX_LIMIT = 100;
  let limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 20;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationResponse(data = [], total = 0, page = 1, limit = 20) {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  return {
    data,
    meta: {
      total: Number(total),
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
}

// --- Date & time utilities ---
export function isValidDate(d) {
  if (!d) return false;
  const date = d instanceof Date ? d : new Date(d);
  return !Number.isNaN(date.getTime());
}

export function formatDate(d) {
  if (!isValidDate(d)) return null;
  const date = d instanceof Date ? d : new Date(d);
  // return ISO 8601 without milliseconds: YYYY-MM-DDTHH:mm:ssZ
  return new Date(date.getTime()).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function addDays(d, days) {
  const date = d instanceof Date ? new Date(d.getTime()) : new Date(d);
  if (!isValidDate(date)) return null;
  const n = Number(days) || 0;
  date.setUTCDate(date.getUTCDate() + n);
  return date;
}

export function isExpired(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (!isValidDate(date)) return false;
  return Date.now() > date.getTime();
}

// --- Utilities ---
export function safeParseNumber(input, fallback = 0) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

export function pickSafe(obj = {}, fields = []) {
  return stripUnknownFields(obj, fields);
}

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject,
  stripUnknownFields,
  isValidObjectId,
  isValidUUID,
  isValidVendorId,
  isValidOrderId,
  getPagination,
  buildPaginationResponse,
  isValidDate,
  formatDate,
  addDays,
  isExpired,
  safeParseNumber,
  pickSafe,
};
