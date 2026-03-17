import { client } from './client';
import utils from '../utils';

export async function getVendors(params = {}) {
  const safe = {};
  if (params.active !== undefined) safe.active = params.active;
  if (params.search) safe.search = String(params.search);
  if (params.page) safe.page = params.page;
  if (params.limit) safe.limit = params.limit;
  return await client.get('/api/vendors', { params: safe });
}

export async function getVendorById(id) {
  if (!utils.isValidVendorId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/vendors/${id}`);
}

export async function createVendor(data) {
  return await client.post('/api/vendors', { body: data });
}

export async function updateVendor(id, data) {
  if (!utils.isValidVendorId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${id}`, { body: data });
}

export async function deleteVendor(id) {
  if (!utils.isValidVendorId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.del(`/api/vendors/${id}`);
}

export async function createStaff(vendorId, data) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor', status: 400 };
  }
  return await client.post(`/api/vendors/${vendorId}/staff`, { body: data });
}

export async function getVendorStaff(vendorId, params = {}) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor', status: 400 };
  }
  const safe = {};
  if (params.page) safe.page = params.page;
  if (params.limit) safe.limit = params.limit;
  if (params.sortBy) safe.sortBy = params.sortBy;
  if (params.sortDir) safe.sortDir = params.sortDir;
  if (params.status) safe.status = params.status;
  return await client.get(`/api/vendors/${vendorId}/staff`, { params: safe });
}

export async function updateStaffPermissions(vendorId, staffId, data) {
  if (!utils.isValidVendorId(vendorId) || !staffId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/staff/${staffId}`, { body: data });
}

export async function deactivateStaff(vendorId, staffId) {
  if (!utils.isValidVendorId(vendorId) || !staffId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/staff/${staffId}/deactivate`);
}

export const VendorsAPI = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,

  /* branches */
  getBranches: async (vendorId, params = {}) => {
    console.log('📦 [VendorsAPI.getBranches] vendorId:', vendorId);
    if (!utils.isValidVendorId(vendorId)) {
      console.log('❌ [VendorsAPI.getBranches] Invalid vendorId');
      return { success:false, error:'invalid_vendor', status:400 };
    }
    return await client.get(`/api/vendors/${vendorId}/branches`, { params });
  },
  createBranch: async (vendorId, data) => {
    console.log('📦 [VendorsAPI.createBranch] vendorId:', vendorId, 'valid?', utils.isValidVendorId(vendorId));
    if (!utils.isValidVendorId(vendorId)) {
      console.log('❌ [VendorsAPI.createBranch] Invalid vendorId');
      return { success:false, error:'invalid_vendor', status:400 };
    }
    console.log('📦 [VendorsAPI.createBranch] Calling API: POST /api/vendors/' + vendorId + '/branches');
    const result = await client.post(`/api/vendors/${vendorId}/branches`, { body: data });
    console.log('📦 [VendorsAPI.createBranch] Result:', result);
    return result;
  },
  updateBranch: async (vendorId, branchId, data) => {
    if (!utils.isValidVendorId(vendorId) || !branchId) return { success:false, error:'invalid_input', status:400 };
    return await client.patch(`/api/vendors/${vendorId}/branches/${branchId}`, { body: data });
  },
  deleteBranch: async (vendorId, branchId) => {
    if (!utils.isValidVendorId(vendorId) || !branchId) return { success:false, error:'invalid_input', status:400 };
    return await client.del(`/api/vendors/${vendorId}/branches/${branchId}`);
  },

  /* staff (vendor scoped) */
  getBranchStaff: async (vendorId, branchId, params = {}) => {
    if (!utils.isValidVendorId(vendorId) || !branchId) return { success:false, error:'invalid_input', status:400 };
    return await client.get(`/api/vendors/${vendorId}/branches/${branchId}/staff`, { params });
  },

  /* dashboard */
  getVendorDashboard: async (vendorId) => {
    if (!utils.isValidVendorId(vendorId)) return { success:false, error:'invalid_vendor', status:400 };
    return await client.get(`/api/vendors/${vendorId}/dashboard`);
  },

  getVendorStaff, // earlier existing function handles generic staff
  createStaff,
  updateStaffPermissions,
  deactivateStaff,

  /* analytics */
  getVendorAnalytics: async (params) => await client.get('/api/admin/analytics/vendors', { params }),
};