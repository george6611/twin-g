// Session management using JWT stored in HTTP-only cookies
// Compatible with Next.js App Router middleware, API routes, server components, and Edge runtime

import { ROLES } from './roles';

const COOKIE_NAME = 'session_token';
const DEFAULT_EXP_SECONDS = 7 * 24 * 60 * 60; // 7 days

function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (typeof Buffer !== 'undefined' && Buffer.from) {
    return Buffer.from(bytes).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecodeToUint8(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  // pad
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const padded = s + '='.repeat(pad);
  if (typeof Buffer !== 'undefined' && Buffer.from) {
    return Uint8Array.from(Buffer.from(padded, 'base64'));
  }
  const bin = atob(padded);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function getSubtle() {
  if (globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto.subtle;
  // fallback to Node's webcrypto when available (server runtime)
  try {
    // dynamic import to avoid bundling Node-specific API in Edge
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const { webcrypto } = await import('crypto');
    return webcrypto.subtle;
  } catch (e) {
    throw new Error('Web Crypto API not available');
  }
}

async function importHmacKey(secret) {
  const subtle = await getSubtle();
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  return subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signHmac(secret, data) {
  const subtle = await getSubtle();
  const key = await importHmacKey(secret);
  const sig = await subtle.sign('HMAC', key, data);
  return new Uint8Array(sig);
}

function utf8ToUint8(data) {
  return new TextEncoder().encode(data);
}

function uint8Equal(a, b) {
  if (!(a instanceof Uint8Array)) a = new Uint8Array(a);
  if (!(b instanceof Uint8Array)) b = new Uint8Array(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function buildJwtParts(header, payload) {
  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);
  const headerB64 = base64UrlEncode(utf8ToUint8(headerJson));
  const payloadB64 = base64UrlEncode(utf8ToUint8(payloadJson));
  return { headerB64, payloadB64, signingInput: `${headerB64}.${payloadB64}` };
}

export async function signToken(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  const expiresIn = options.expiresIn ?? DEFAULT_EXP_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Number(expiresIn);

  // normalize incoming token payload; backend now sends userId claim
  const tokenPayload = {
    userId: payload.userId || payload.id || null,
    role: payload.role || null,
    vendorId: payload.vendorId ?? null,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    isActive: payload.isActive !== undefined ? !!payload.isActive : true,
    iat: now,
    exp,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const { headerB64, payloadB64, signingInput } = buildJwtParts(header, tokenPayload);
  const sig = await signHmac(secret, utf8ToUint8(signingInput));
  const sigB64 = base64UrlEncode(sig);
  return `${signingInput}.${sigB64}`;
}

export function decodeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = base64UrlDecodeToUint8(parts[1]);
  const decoded = new TextDecoder().decode(payload);
  return safeJsonParse(decoded);
}

export async function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  if (!token || typeof token !== 'string') throw new Error('Invalid token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const signingInput = `${parts[0]}.${parts[1]}`;
  const sig = base64UrlDecodeToUint8(parts[2]);
  const expectedSig = await signHmac(secret, utf8ToUint8(signingInput));
  if (!uint8Equal(sig, expectedSig)) throw new Error('Invalid token signature');
  const payload = decodeToken(token);
  if (!payload) throw new Error('Invalid token payload');
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) throw new Error('Token expired');
  if (payload.isActive === false) throw new Error('User inactive');
  // Basic shape validation
  if (!payload.userId || !payload.role) throw new Error('Invalid token claims');
  return payload;
}

// Cookie helpers
function buildSetCookie(token, options = {}) {
  const maxAge = options.maxAge ?? DEFAULT_EXP_SECONDS;
  const secure = options.secure ?? (process.env.NODE_ENV === 'production');
  const sameSite = options.sameSite ?? 'Strict';
  const path = options.path ?? '/';
  // HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=...
  const parts = [`${COOKIE_NAME}=${token}`, `Path=${path}`, `Max-Age=${maxAge}`, `HttpOnly`, `SameSite=${sameSite}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function setSessionCookie(res, token, options = {}) {
  const cookie = buildSetCookie(token, options);
  // Try NextResponse-like API
  try {
    if (res && typeof res.headers === 'object' && typeof res.headers.append === 'function') {
      res.headers.append('Set-Cookie', cookie);
      return;
    }
  } catch (e) {
    // fallthrough
  }
  // Fallback: set on native Response
  if (res && typeof res.setHeader === 'function') {
    const prev = res.getHeader('Set-Cookie');
    if (prev) {
      if (Array.isArray(prev)) res.setHeader('Set-Cookie', [...prev, cookie]);
      else res.setHeader('Set-Cookie', [prev, cookie]);
    } else {
      res.setHeader('Set-Cookie', cookie);
    }
    return;
  }
  throw new Error('Unable to set cookie on response');
}

export function clearSessionCookie(res) {
  const cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  try {
    if (res && typeof res.headers === 'object' && typeof res.headers.append === 'function') {
      res.headers.append('Set-Cookie', cookie);
      return;
    }
  } catch (e) {
    // fallthrough
  }
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  throw new Error('Unable to clear cookie on response');
}

function parseCookiesFromHeader(cookieHeader) {
  if (!cookieHeader) return {};
  const pairs = cookieHeader.split(/;\s*/);
  const out = {};
  for (const part of pairs) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

export async function getSessionFromCookies(req) {
  // Support NextRequest-like cookies()
  try {
    if (req && typeof req.cookies === 'function') {
      const c = req.cookies();
      const token = c.get ? c.get(COOKIE_NAME)?.value : c[COOKIE_NAME];
      if (!token) return null;
      const payload = await verifyToken(token);
      return payload;
    }
  } catch (e) {
    // fallback to header parsing
  }

  const header = req && (req.headers?.get ? req.headers.get('cookie') : req.headers?.cookie || req.cookies || null);
  const cookies = parseCookiesFromHeader(header);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload;
}

// Session helpers
export async function createSession(user, res) {
  if (!user || !user.id) throw new Error('Invalid user');
  const payload = {
    userId: user.id,
    role: user.role,
    vendorId: user.vendorId ?? null,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    isActive: user.isActive !== undefined ? !!user.isActive : true,
  };
  const token = await signToken(payload);
  if (res) setSessionCookie(res, token);
  return token;
}

export async function getCurrentUser(req) {
  try {
    const session = await getSessionFromCookies(req);
    return session;
  } catch (e) {
    return null;
  }
}

export async function requireAuth(req) {
  const user = await getCurrentUser(req);
  if (!user) {
    const err = new Error('Unauthenticated');
    err.status = 401;
    throw err;
  }
  return user;
}

import rolesUtils from './roles';

export async function requireRole(req, role) {
  const user = await requireAuth(req);
  if (!rolesUtils.hasRole(user, role) && !rolesUtils.hasMinimumRole(user, role)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return user;
}

export async function requirePermission(req, permission) {
  const user = await requireAuth(req);
  if (!rolesUtils.hasPermission(user, permission)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return user;
}

export function destroySession(res) {
  clearSessionCookie(res);
  // If token blacklist is implemented, add token to blacklist here.
}
