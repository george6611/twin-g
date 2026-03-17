// Role & Permission utilities for authorization checks
// Production-ready, framework-agnostic helpers usable in middleware, APIs, and server actions

// Roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  VENDOR: 'vendor',
  VENDOR_STAFF: 'vendor_staff',
};

// Permission constants
export const PERMISSIONS = {
  VIEW_ORDERS: 'view_orders',
  UPDATE_ORDERS: 'update_orders',
  CREATE_ORDERS: 'create_orders',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_VENDORS: 'manage_vendors',
  CREATE_VENDOR: 'create_vendor',
  DELETE_VENDOR: 'delete_vendor',
  MANAGE_STAFF: 'manage_staff',
  ASSIGN_PERMISSIONS: 'assign_permissions',
  MANAGE_SETTINGS: 'manage_settings',
};

// Role hierarchy (low -> high). Higher index means more privilege.
export const ROLE_HIERARCHY = [
  ROLES.VENDOR_STAFF,
  ROLES.VENDOR,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

// Default permissions per role. These are conservative defaults and can be
// extended on the server-side. Super admin implicitly has all permissions.
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.VENDOR_STAFF]: [PERMISSIONS.VIEW_ORDERS],
  [ROLES.VENDOR]: [
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.UPDATE_ORDERS,
    PERMISSIONS.CREATE_ORDERS,
    PERMISSIONS.MANAGE_STAFF,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.UPDATE_ORDERS,
    PERMISSIONS.CREATE_ORDERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_STAFF,
  ],
  // super_admin: implicit all
};

// Permissions that should not be assignable by vendor_staff (system-level)
const RESTRICTED_FOR_VENDOR_STAFF = new Set([
  PERMISSIONS.MANAGE_VENDORS,
  PERMISSIONS.DELETE_VENDOR,
  PERMISSIONS.MANAGE_SETTINGS,
  PERMISSIONS.VIEW_ANALYTICS,
]);

function safeUser(user) {
  return user && typeof user === 'object' ? user : null;
}

// Role helpers
export function hasRole(user, role) {
  const u = safeUser(user);
  if (!u || !u.role) return false;
  return String(u.role) === String(role);
}

export function isSuperAdmin(user) {
  return hasRole(user, ROLES.SUPER_ADMIN);
}

export function isAdmin(user) {
  return hasRole(user, ROLES.ADMIN) || isSuperAdmin(user);
}

export function isVendor(user) {
  return hasRole(user, ROLES.VENDOR) || isAdmin(user) || isSuperAdmin(user);
}

export function isVendorStaff(user) {
  return hasRole(user, ROLES.VENDOR_STAFF);
}

// Compare role ranks. Returns true if user's role rank is >= required role rank
export function hasMinimumRole(user, role) {
  const u = safeUser(user);
  if (!u || !u.role || !role) return false;
  const userIdx = ROLE_HIERARCHY.indexOf(String(u.role));
  const requiredIdx = ROLE_HIERARCHY.indexOf(String(role));
  if (userIdx === -1 || requiredIdx === -1) return false;
  return userIdx >= requiredIdx;
}

// Permission helpers
export function hasPermission(user, permission) {
  const u = safeUser(user);
  if (!u) return false;
  // super admin implicit
  if (isSuperAdmin(u)) return true;
  const perms = Array.isArray(u.permissions) ? u.permissions : [];
  return perms.includes(permission);
}

export function hasAnyPermission(user, permissionsArray) {
  const u = safeUser(user);
  if (!u) return false;
  if (isSuperAdmin(u)) return true;
  const perms = new Set(Array.isArray(u.permissions) ? u.permissions : []);
  return permissionsArray.some((p) => perms.has(p));
}

export function hasAllPermissions(user, permissionsArray) {
  const u = safeUser(user);
  if (!u) return false;
  if (isSuperAdmin(u)) return true;
  const perms = new Set(Array.isArray(u.permissions) ? u.permissions : []);
  return permissionsArray.every((p) => perms.has(p));
}

// Escalation protection
export function canAssignRole(assigner, targetRole) {
  const a = safeUser(assigner);
  if (!a) return false;

  // super_admin can assign any role
  if (isSuperAdmin(a)) return true;

  // Only super_admin can create admin or super_admin
  if (targetRole === ROLES.ADMIN || targetRole === ROLES.SUPER_ADMIN) return false;

  // Admins can assign vendor and vendor_staff
  if (hasRole(a, ROLES.ADMIN)) {
    return targetRole === ROLES.VENDOR || targetRole === ROLES.VENDOR_STAFF;
  }

  // Vendors can create vendor_staff under their own vendor; they cannot create vendors or admins
  if (hasRole(a, ROLES.VENDOR)) {
    return targetRole === ROLES.VENDOR_STAFF;
  }

  // vendor_staff cannot assign roles
  return false;
}

export function canAssignPermission(assigner, permission) {
  const a = safeUser(assigner);
  if (!a) return false;
  if (isSuperAdmin(a)) return true;
  if (isAdmin(a)) return true; // admins may assign permissions

  // Vendors and vendor_staff: they can only assign permissions they themselves have
  const ownPerms = new Set(Array.isArray(a.permissions) ? a.permissions : []);
  if (!ownPerms.has(permission)) return false;

  // Additional restriction: vendor_staff cannot assign system-level permissions
  if (hasRole(a, ROLES.VENDOR_STAFF) && RESTRICTED_FOR_VENDOR_STAFF.has(permission)) return false;

  return true;
}

export function canManageVendor(assigner, vendorId) {
  const a = safeUser(assigner);
  if (!a) return false;
  if (isSuperAdmin(a) || isAdmin(a)) return true;
  if (hasRole(a, ROLES.VENDOR) || hasRole(a, ROLES.VENDOR_STAFF)) {
    return String(a.vendorId) === String(vendorId);
  }
  return false;
}

// Multi-tenant enforcement helper
export function isVendorScoped(user, vendorId) {
  return canManageVendor(user, vendorId);
}

// Utility to get effective permissions for a user (merge defaults with explicit)
export function getEffectivePermissions(user) {
  const u = safeUser(user);
  if (!u) return [];
  if (isSuperAdmin(u)) {
    // Return all known permissions for convenience; server should treat super_admin specially
    return Object.values(PERMISSIONS);
  }
  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[u.role] || [];
  const explicit = Array.isArray(u.permissions) ? u.permissions : [];
  const set = new Set([...roleDefaults, ...explicit]);
  return Array.from(set);
}

// Export default convenience object
const authUtils = {
  ROLES,
  PERMISSIONS,
  ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS,
  hasRole,
  isSuperAdmin,
  isAdmin,
  isVendor,
  isVendorStaff,
  hasMinimumRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAssignRole,
  canAssignPermission,
  canManageVendor,
  isVendorScoped,
  getEffectivePermissions,
};

export default authUtils;
