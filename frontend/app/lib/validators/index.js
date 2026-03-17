import rolesUtils, { PERMISSIONS } from '../auth/roles';
import utils from '../utils';

// Structured error helper
function makeError(field, message) {
  return { field: String(field || 'general'), message: String(message) };
}

function unknownFields(obj = {}, allowed = []) {
  if (!obj || typeof obj !== 'object') return [];
  const allowedSet = new Set(allowed.map(String));
  const keys = Object.keys(obj);
  return keys.filter((k) => !allowedSet.has(k));
}

function resultFromErrors(errors) {
  return { isValid: errors.length === 0, errors };
}

// --- Auth Validators ---
export function validatePasswordStrength(password) {
  const errors = [];
  if (typeof password !== 'string') {
    errors.push(makeError('password', 'Password must be a string'));
    return resultFromErrors(errors);
  }
  if (password.length < 8) errors.push(makeError('password', 'Minimum length is 8 characters'));
  if (!/[A-Z]/.test(password)) errors.push(makeError('password', 'Must contain an uppercase letter'));
  if (!/[a-z]/.test(password)) errors.push(makeError('password', 'Must contain a lowercase letter'));
  if (!/[0-9]/.test(password)) errors.push(makeError('password', 'Must contain a number'));
  if (!/[!@#$%^&*(),.?"':{}|<>\[\]\\\/`~_+=;-]/.test(password)) errors.push(makeError('password', 'Must contain a special character'));
  return resultFromErrors(errors);
}

export function validateLoginInput(data) {
  const errors = [];
  const allowed = ['email', 'password'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  const email = utils.sanitizeEmail(data && data.email);
  if (!email) errors.push(makeError('email', 'Valid email is required'));

  if (!data || typeof data.password !== 'string' || data.password.length === 0) errors.push(makeError('password', 'Password is required'));

  return resultFromErrors(errors);
}

export function validateRegisterInput(data) {
  const errors = [];
  const allowed = ['name', 'email', 'password', 'vendorId', 'role'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  const name = utils.sanitizeString(data && data.name);
  if (!name) errors.push(makeError('name', 'Name is required'));

  const email = utils.sanitizeEmail(data && data.email);
  if (!email) errors.push(makeError('email', 'Valid email is required'));

  const pwdResult = validatePasswordStrength(data && data.password);
  if (!pwdResult.isValid) errors.push(...pwdResult.errors);

  if (data && data.role) {
    const role = String(data.role);
    if (!Object.values(rolesUtils.ROLES).includes(role)) errors.push(makeError('role', 'Invalid role'));
  }

  // vendorId only required/allowed for vendor or vendor_staff
  if (data && data.role && (data.role === rolesUtils.ROLES.VENDOR || data.role === rolesUtils.ROLES.VENDOR_STAFF)) {
    if (!utils.isValidVendorId(data.vendorId)) errors.push(makeError('vendorId', 'Valid vendorId is required for vendor accounts'));
  }

  return resultFromErrors(errors);
}

// --- Vendor Validators ---
export function validateVendorCreation(data) {
  const errors = [];
  const allowed = ['businessName', 'email', 'phone', 'address', 'taxId'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  const name = utils.sanitizeString(data && data.businessName);
  if (!name) errors.push(makeError('businessName', 'Business name is required'));

  const email = utils.sanitizeEmail(data && data.email);
  if (!email) errors.push(makeError('email', 'Valid email is required'));

  const phone = utils.sanitizePhone(data && data.phone);
  if (!phone) errors.push(makeError('phone', 'Valid phone number is required'));

  const address = utils.sanitizeString(data && data.address);
  if (!address) errors.push(makeError('address', 'Address is required'));

  if (data && data.taxId) {
    const tax = String(data.taxId).trim();
    if (tax.length < 3) errors.push(makeError('taxId', 'Invalid taxId'));
  }

  return resultFromErrors(errors);
}

export function validateVendorUpdate(data) {
  const errors = [];
  const allowed = ['businessName', 'email', 'phone', 'address', 'taxId', 'isActive'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  if (data.businessName !== undefined) {
    const name = utils.sanitizeString(data.businessName);
    if (!name) errors.push(makeError('businessName', 'Business name cannot be empty'));
  }
  if (data.email !== undefined) {
    const email = utils.sanitizeEmail(data.email);
    if (!email) errors.push(makeError('email', 'Valid email is required'));
  }
  if (data.phone !== undefined) {
    const phone = utils.sanitizePhone(data.phone);
    if (!phone) errors.push(makeError('phone', 'Valid phone number is required'));
  }
  if (data.address !== undefined) {
    const address = utils.sanitizeString(data.address);
    if (!address) errors.push(makeError('address', 'Address cannot be empty'));
  }
  return resultFromErrors(errors);
}

// --- Vendor Staff Validators ---
export function validateStaffCreation(data, assigner = null) {
  const errors = [];
  const allowed = ['name', 'email', 'password', 'vendorId', 'role', 'permissions', 'isActive'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  const name = utils.sanitizeString(data && data.name);
  if (!name) errors.push(makeError('name', 'Name is required'));

  const email = utils.sanitizeEmail(data && data.email);
  if (!email) errors.push(makeError('email', 'Valid email is required'));

  if (!data || !data.role || String(data.role) !== rolesUtils.ROLES.VENDOR_STAFF) errors.push(makeError('role', 'Role must be vendor_staff'));

  if (!utils.isValidVendorId(data && data.vendorId)) errors.push(makeError('vendorId', 'Valid vendorId is required'));

  // Password strength optional for staff creation but validate if present
  if (data.password) {
    const pwd = validatePasswordStrength(data.password);
    if (!pwd.isValid) errors.push(...pwd.errors);
  }

  // Permissions checks
  const perms = Array.isArray(data.permissions) ? data.permissions : [];
  for (const p of perms) {
    if (!Object.values(PERMISSIONS).includes(p)) errors.push(makeError('permissions', `Unknown permission: ${p}`));
  }

  // check assigner privileges
  if (Array.isArray(perms) && perms.length > 0 && assigner) {
    // super_admin and admin can assign freely
    if (!rolesUtils.isSuperAdmin(assigner) && !rolesUtils.isAdmin(assigner)) {
      // assigner must have each permission
      const assignerPerms = new Set(Array.isArray(assigner.permissions) ? assigner.permissions : []);
      for (const p of perms) {
        if (!assignerPerms.has(p)) errors.push(makeError('permissions', `Cannot assign permission not owned: ${p}`));
        if (rolesUtils.isVendorStaff(assigner) && rolesUtils.RESTRICTED_FOR_VENDOR_STAFF && rolesUtils.RESTRICTED_FOR_VENDOR_STAFF.has && rolesUtils.RESTRICTED_FOR_VENDOR_STAFF.has(p)) {
          // defensive: rolesUtils may not expose restricted set; enforce conservatively
          errors.push(makeError('permissions', `Permission restricted: ${p}`));
        }
      }
    }
  }

  return resultFromErrors(errors);
}

export function validatePermissionAssignment(assigner, permissions = []) {
  const errors = [];
  if (!Array.isArray(permissions)) return resultFromErrors([makeError('permissions', 'Permissions must be an array')]);
  for (const p of permissions) {
    if (!Object.values(PERMISSIONS).includes(p)) errors.push(makeError('permissions', `Unknown permission: ${p}`));
  }

  if (assigner && !rolesUtils.isSuperAdmin(assigner) && !rolesUtils.isAdmin(assigner)) {
    const assignerPerms = new Set(Array.isArray(assigner.permissions) ? assigner.permissions : []);
    for (const p of permissions) {
      if (!assignerPerms.has(p)) errors.push(makeError('permissions', `Cannot assign permission not owned: ${p}`));
      // vendor_staff restriction
      if (rolesUtils.isVendorStaff(assigner) && ['manage_vendors', 'delete_vendor', 'manage_settings', 'view_analytics'].includes(p)) {
        errors.push(makeError('permissions', `Permission restricted: ${p}`));
      }
    }
  }
  return resultFromErrors(errors);
}

// --- Inventory Validators ---
export function validateInventoryItem(data = {}) {
  const errors = [];
  const allowed = ['name','sku','quantity','category','branchId','status'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  const name = utils.sanitizeString(data.name);
  if (!name) errors.push(makeError('name','Item name is required'));

  if (data.sku !== undefined) {
    const sku = String(data.sku).trim();
    if (!sku) errors.push(makeError('sku','SKU/code cannot be empty'));
  }

  if (data.quantity !== undefined) {
    const qty = Number(data.quantity);
    if (isNaN(qty) || qty < 0) errors.push(makeError('quantity','Quantity must be a non-negative number'));
  }

  if (data.category !== undefined) {
    const cat = utils.sanitizeString(data.category);
    if (!cat) errors.push(makeError('category','Category cannot be empty'));
  }

  if (data.branchId !== undefined && data.branchId !== null) {
    if (!utils.isValidVendorId(data.branchId)) {
      errors.push(makeError('branchId','Invalid branchId'));
    }
  }

  if (data.status !== undefined) {
    const st = String(data.status);
    if (!['active','inactive'].includes(st)) errors.push(makeError('status','Status must be active or inactive'));
  }

  return resultFromErrors(errors);
}

// --- Order Validators ---
const ALLOWED_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled'];
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function validateOrderCreation(data) {
  const errors = [];
  const allowed = ['vendorId', 'deliveryAddress', 'price', 'items', 'notes'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  if (!utils.isValidVendorId(data && data.vendorId)) errors.push(makeError('vendorId', 'Valid vendorId is required'));
  const addr = utils.sanitizeString(data && data.deliveryAddress);
  if (!addr) errors.push(makeError('deliveryAddress', 'Delivery address is required'));
  const price = Number(data && data.price);
  if (!Number.isFinite(price) || price < 0) errors.push(makeError('price', 'Price must be a non-negative number'));

  // items basic check
  if (!Array.isArray(data.items) || data.items.length === 0) errors.push(makeError('items', 'At least one item is required'));

  return resultFromErrors(errors);
}

export function validateOrderUpdate(data) {
  const errors = [];
  const allowed = ['deliveryAddress', 'price', 'status', 'notes'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  if (data.deliveryAddress !== undefined) {
    const addr = utils.sanitizeString(data.deliveryAddress);
    if (!addr) errors.push(makeError('deliveryAddress', 'Delivery address cannot be empty'));
  }
  if (data.price !== undefined) {
    const price = Number(data.price);
    if (!Number.isFinite(price) || price < 0) errors.push(makeError('price', 'Price must be a non-negative number'));
  }
  if (data.status !== undefined) {
    if (!ALLOWED_ORDER_STATUSES.includes(String(data.status))) errors.push(makeError('status', 'Invalid order status'));
  }
  return resultFromErrors(errors);
}

export function validateOrderStatusTransition(currentStatus, newStatus) {
  const errors = [];
  if (!ALLOWED_ORDER_STATUSES.includes(currentStatus)) errors.push(makeError('currentStatus', 'Invalid current status'));
  if (!ALLOWED_ORDER_STATUSES.includes(newStatus)) errors.push(makeError('newStatus', 'Invalid new status'));
  if (errors.length) return resultFromErrors(errors);
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) errors.push(makeError('status', `Illegal transition from ${currentStatus} to ${newStatus}`));
  return resultFromErrors(errors);
}

// --- Admin Validators ---
export function validateAdminCreation(data, creator = null) {
  const errors = [];
  const allowed = ['name', 'email', 'password', 'role'];
  const extras = unknownFields(data, allowed);
  if (extras.length) errors.push(makeError('unknown', `Unknown fields: ${extras.join(', ')}`));

  if (!creator || !rolesUtils.isSuperAdmin(creator)) errors.push(makeError('creator', 'Only super_admin can create admins'));

  const name = utils.sanitizeString(data && data.name);
  if (!name) errors.push(makeError('name', 'Name is required'));

  const email = utils.sanitizeEmail(data && data.email);
  if (!email) errors.push(makeError('email', 'Valid email is required'));

  if (!data || !data.role || data.role !== rolesUtils.ROLES.ADMIN) errors.push(makeError('role', 'Role must be admin'));

  const pwd = validatePasswordStrength(data && data.password);
  if (!pwd.isValid) errors.push(...pwd.errors);

  return resultFromErrors(errors);
}

export function validateRoleAssignment(assigner, targetRole) {
  const errors = [];
  if (!assigner) return resultFromErrors([makeError('assigner', 'Assigner required')]);
  if (!targetRole) return resultFromErrors([makeError('role', 'Role required')]);

  // Only super_admin can assign admin or super_admin
  if ((targetRole === rolesUtils.ROLES.ADMIN || targetRole === rolesUtils.ROLES.SUPER_ADMIN) && !rolesUtils.isSuperAdmin(assigner)) {
    errors.push(makeError('role', 'Insufficient privileges to assign this role'));
  }

  // vendor cannot assign admin
  if (rolesUtils.isVendor(assigner) && (targetRole === rolesUtils.ROLES.ADMIN || targetRole === rolesUtils.ROLES.SUPER_ADMIN)) {
    errors.push(makeError('role', 'Vendor cannot assign admin or super_admin'));
  }

  return resultFromErrors(errors);
}

// --- Multi-tenant checks ---
export function validateVendorScope(assigner, vendorId) {
  const errors = [];
  if (!vendorId) errors.push(makeError('vendorId', 'vendorId required'));
  if (!utils.isValidVendorId(vendorId)) errors.push(makeError('vendorId', 'Invalid vendorId format'));
  if (rolesUtils.isSuperAdmin(assigner) || rolesUtils.isAdmin(assigner)) return resultFromErrors(errors);
  if (!assigner || String(assigner.vendorId) !== String(vendorId)) errors.push(makeError('vendorId', 'Access denied for this vendorId'));
  return resultFromErrors(errors);
}

export function validateDateRange(start, end) {
  const errors = [];
  if (start && isNaN(Date.parse(start))) errors.push(makeError('start', 'Invalid start date'));
  if (end && isNaN(Date.parse(end))) errors.push(makeError('end', 'Invalid end date'));
  if (start && end && new Date(start) > new Date(end)) errors.push(makeError('range', 'Start must be before end'));
  return resultFromErrors(errors);
}

export default {
  validatePasswordStrength,
  validateLoginInput,
  validateRegisterInput,
  validateVendorCreation,
  validateVendorUpdate,
  validateStaffCreation,
  validatePermissionAssignment,
  validateOrderCreation,
  validateOrderUpdate,
  validateOrderStatusTransition,
  validateAdminCreation,
  validateRoleAssignment,
  validateVendorScope,
};
