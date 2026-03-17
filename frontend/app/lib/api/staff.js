import { client } from './client';
import utils from '../utils';

export async function getAllStaff(vendorId, params = {}) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/staff`, { params });
}

export async function getStaffById(vendorId, staffId) {
  if (!utils.isValidVendorId(vendorId) || !staffId) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/staff/${staffId}`);
}

export async function updateStaff(vendorId, staffId, data) {
  if (!utils.isValidVendorId(vendorId) || !staffId) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/staff/${staffId}`, { body: data });
}

export async function deactivateStaff(vendorId, staffId) {
  if (!utils.isValidVendorId(vendorId) || !staffId) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/staff/${staffId}/deactivate`);
}

export const StaffAPI = {
  getAllStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
};
