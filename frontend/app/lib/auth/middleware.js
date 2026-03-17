import { NextResponse } from 'next/server';

/**
 * Authentication & Authorization Middleware
 * - Validates session via /api/auth/me using httpOnly cookies
 * - Enforces RBAC and PBAC for /dashboard/* and /api/*
 * - Enforces multi-tenant isolation (vendorId checks)
 *
 * Notes:
 * - Backend must always re-check authorization; this middleware is an edge-layer
 *   convenience to protect routes early and avoid unnecessary processing.
 */

const PUBLIC_ROUTES = new Set(['/', '/about', '/contact', '/careers']);

const API_AUTH_ALLOW = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/signup',
  '/api/auth/me',
]);

const ROLE = {
  SUPER: 'super_admin',
  ADMIN: 'admin',
  VENDOR: 'vendor',
  VENDOR_STAFF: 'vendor_staff',
};

async function getSession(req) {
  // Forward cookies to the internal auth endpoint to validate server-side session
  try {
    const url = new URL('/api/auth/me', req.url).toString();
    const cookie = req.headers.get('cookie') || '';
    const resp = await fetch(url, { method: 'GET', headers: { cookie } });
    if (!resp.ok) return null;
    const json = await resp.json();
    // Basic sanity checks
    if (!json || !json.id || !json.role) return null;
    return json;
  } catch (err) {
    return null;
  }
}

function hasRole(session, ...roles) {
  if (!session || !session.role) return false;
  return roles.includes(session.role);
}

function hasPermission(session, permission) {
  if (!session || !permission) return false;
  if (!Array.isArray(session.permissions)) return false;
  return session.permissions.includes(permission);
}

function isVendorScoped(session, targetVendorId) {
  if (!session) return false;
  if (hasRole(session, ROLE.SUPER, ROLE.ADMIN)) return true; // system level access
  // vendor or vendor_staff must match vendorId
  if (hasRole(session, ROLE.VENDOR, ROLE.VENDOR_STAFF)) {
    return String(session.vendorId) === String(targetVendorId);
  }
  return false;
}

function extractVendorIdFromPath(pathname) {
  // Match patterns like /api/vendors/:vendorId/... or /dashboard/vendor/:vendorId/...
  const vendorRegex = /\/(?:api|dashboard)\/(?:vendors|vendor)\/(?:([^/]+))/i;
  const m = pathname.match(vendorRegex);
  return m ? m[1] : null;
}

function isApiRoute(pathname) {
  return pathname.startsWith('/api/');
}

function respondUnauthorized(req) {
  if (isApiRoute(req.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  // Preserve attempted URL as `returnUrl` query param
  const loginUrl = new URL('/auth/login', req.url);
  const returnUrl = req.nextUrl.pathname + (req.nextUrl.search || '');
  // Prevent redirect loops
  if (req.nextUrl.pathname === '/auth/login') return NextResponse.next();
  loginUrl.searchParams.set('returnUrl', returnUrl);
  return NextResponse.redirect(loginUrl);
}

function respondForbidden(req) {
  if (isApiRoute(req.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // For UI routes, redirect to a safe page (dashboard root) or show 403 page
  const safe = new URL('/403', req.url);
  // avoid loops
  if (req.nextUrl.pathname === '/403') return NextResponse.next();
  return NextResponse.redirect(safe);
}

/**
 * Map pathname -> required role/permission
 * Add entries here as the app grows. Keep middleware fast and small.
 */
function getRequirementsForPath(pathname) {
  // Admin dashboard
  if (pathname.startsWith('/dashboard/admin')) return { roles: [ROLE.ADMIN, ROLE.SUPER] };
  // Vendor dashboard
  if (pathname.startsWith('/dashboard/vendor')) return { roles: [ROLE.VENDOR, ROLE.VENDOR_STAFF] };
  // Example API permission mapping
  if (pathname.startsWith('/api/vendors') && pathname.includes('/staff')) {
    return { permission: 'manage_staff' };
  }
  if (pathname.startsWith('/api/vendors')) return { permission: 'manage_vendors' };
  if (pathname.startsWith('/api/orders')) return { permission: 'view_orders' };
  if (pathname.startsWith('/api/analytics')) return { permission: 'view_analytics' };
  // default: no extra requirement
  return {};
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow public routes and static assets early
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Allow auth API endpoints to be used without session
  if (isApiRoute(pathname) && API_AUTH_ALLOW.has(pathname)) return NextResponse.next();

  // Protect dashboard and API paths; any other path should pass through
  const protectsDashboard = pathname.startsWith('/dashboard');
  const protectsApi = pathname.startsWith('/api');
  if (!protectsDashboard && !protectsApi) return NextResponse.next();

  // Validate session
  const session = await getSession(req);
  if (!session) return respondUnauthorized(req);

  // inactive accounts
  if (session.isActive === false) return respondUnauthorized(req);

  // RBAC/PBAC checks
  const reqs = getRequirementsForPath(pathname);

  // role check
  if (reqs.roles && reqs.roles.length > 0) {
    if (!reqs.roles.includes(session.role)) return respondForbidden(req);
  }

  // permission check
  if (reqs.permission) {
    if (!hasPermission(session, reqs.permission)) return respondForbidden(req);
  }

  // Multi-tenant: extract vendorId from route segments (never trust query)
  const routeVendorId = extractVendorIdFromPath(pathname);
  if (routeVendorId) {
    // admins and super bypass vendor scoping
    if (!isVendorScoped(session, routeVendorId)) return respondForbidden(req);
  }

  // Additional vendor-specific dashboard root protection
  if (pathname.startsWith('/dashboard/vendor')) {
    if (!hasRole(session, ROLE.VENDOR, ROLE.VENDOR_STAFF, ROLE.ADMIN, ROLE.SUPER)) return respondForbidden(req);
  }

  // Prevent vendor_staff from performing admin-level actions
  if (session.role === ROLE.VENDOR_STAFF) {
    // vendor_staff must not access admin paths
    if (pathname.startsWith('/dashboard/admin')) return respondForbidden(req);
  }

  // Passed all checks
  // Optionally attach lightweight session info to headers for downstream API handlers
  // but do not include sensitive data. Example: X-User-Id and X-User-Role
  const res = NextResponse.next();
  try {
    if (session && session.id) {
      res.headers.set('x-user-id', session.id);
      res.headers.set('x-user-role', session.role);
      if (session.vendorId) res.headers.set('x-user-vendor', String(session.vendorId));
    }
  } catch (e) {
    // ignore header set errors
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
