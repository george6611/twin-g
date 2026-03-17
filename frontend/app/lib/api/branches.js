import { client } from './client';
import utils from '../utils';

/**
 * Branches API
 * Handles all branch-related API calls with vendor scoping
 * 
 * ⚠️ Backend validates:
 * - branch.vendorId === loggedInUser.vendorId (all users)
 * - If staff: branch.branchId === loggedInUser.branchId
 */

export async function getBranches(vendorId, params = {}) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/branches`, { params });
}

export async function getBranchById(vendorId, branchId) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/branches/${branchId}`);
}

export async function createBranch(vendorId, data) {
  if (!utils.isValidVendorId(vendorId) || !data.name) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.post(`/api/vendors/${vendorId}/branches`, { body: data });
}

export async function updateBranch(vendorId, branchId, data) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/branches/${branchId}`, { body: data });
}

export async function deleteBranch(vendorId, branchId) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.del(`/api/vendors/${vendorId}/branches/${branchId}`);
}

export async function getBranchStats(vendorId, branchId) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/branches/${branchId}/stats`);
}

export async function getBranchStaff(vendorId, branchId) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/branches/${branchId}/staff`);
}

export async function getBranchOrders(vendorId, branchId, params = {}) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/branches/${branchId}/orders`, { params });
}

export async function getBranchActivity(vendorId, branchId, params = {}) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/branches/${branchId}/activity`, { params });
}

export async function updateBranchStatus(vendorId, branchId, status) {
  if (!utils.isValidVendorId(vendorId) || !branchId || !status) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/branches/${branchId}/status`, {
    body: { status }
  });
}

export async function deactivateBranch(vendorId, branchId) {
  if (!utils.isValidVendorId(vendorId) || !branchId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/branches/${branchId}/deactivate`, {
    body: {}
  });
}

/**
 * Staff API methods for branch context
 */
export async function updateBranchStaffRole(vendorId, branchId, staffId, role) {
  if (!utils.isValidVendorId(vendorId) || !branchId || !staffId || !role) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.patch(
    `/api/vendors/${vendorId}/branches/${branchId}/staff/${staffId}/role`,
    { body: { role } }
  );
}

export async function deactivateBranchStaff(vendorId, branchId, staffId) {
  if (!utils.isValidVendorId(vendorId) || !branchId || !staffId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(
    `/api/vendors/${vendorId}/branches/${branchId}/staff/${staffId}/deactivate`,
    { body: {} }
  );
}

export async function resetBranchStaffPassword(vendorId, branchId, staffId) {
  if (!utils.isValidVendorId(vendorId) || !branchId || !staffId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.post(
    `/api/vendors/${vendorId}/branches/${branchId}/staff/${staffId}/reset-password`,
    { body: {} }
  );
}

export const BranchesAPI = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats,
  getBranchStaff,
  getBranchOrders,
  getBranchActivity,
  updateBranchStatus,
  deactivateBranch,
  updateBranchStaffRole,
  deactivateBranchStaff,
  resetBranchStaffPassword,
};
