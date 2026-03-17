import { client } from './client';
import utils from '../utils';

/**
 * Vendor API
 * Handles vendor profile, settings, and configuration
 * 
 * ⚠️ Backend validates:
 * - Only main vendor can update organization-level data
 * - Staff can only update their own profile
 * - All sensitive updates logged for audit
 */

export async function getVendorProfile(vendorId) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/profile`);
}

export async function updateVendorProfile(vendorId, data) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/profile`, { body: data });
}

export async function uploadVendorLogo(vendorId, file) {
  if (!utils.isValidVendorId(vendorId) || !file) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  return await client.post(`/api/vendors/${vendorId}/logo`, {
    body: formData,
    isFormData: true,
  });
}

export async function getVendorSettings(vendorId) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/settings`);
}

export async function updateVendorSettings(vendorId, settings) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/settings`, { body: settings });
}

export async function updateNotificationPreferences(vendorId, preferences) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.patch(`/api/vendors/${vendorId}/notifications`, {
    body: preferences,
  });
}

export async function getNotificationPreferences(vendorId) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/notifications`);
}

export async function getLoginHistory(vendorId, params = {}) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/login-history`, { params });
}

export async function changePassword(vendorId, currentPassword, newPassword) {
  if (!utils.isValidVendorId(vendorId) || !currentPassword || !newPassword) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.post(`/api/vendors/${vendorId}/change-password`, {
    body: { currentPassword, newPassword },
  });
}

export async function getVendorIntegrations(vendorId) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/integrations`);
}

export async function updateVendorIntegration(vendorId, integrationId, config) {
  if (!utils.isValidVendorId(vendorId) || !integrationId) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.patch(
    `/api/vendors/${vendorId}/integrations/${integrationId}`,
    { body: config }
  );
}

export async function generateAPIKey(vendorId) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.post(`/api/vendors/${vendorId}/api-keys`, { body: {} });
}

export async function revokeAPIKey(vendorId, keyId) {
  if (!utils.isValidVendorId(vendorId) || !keyId) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.delete(`/api/vendors/${vendorId}/api-keys/${keyId}`);
}

export async function getStaffAccessOverview(vendorId) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor_id', status: 400 };
  }
  return await client.get(`/api/vendors/${vendorId}/staff-overview`);
}

export const VendorAPI = {
  getVendorProfile,
  updateVendorProfile,
  uploadVendorLogo,
  getVendorSettings,
  updateVendorSettings,
  updateNotificationPreferences,
  getNotificationPreferences,
  getLoginHistory,
  changePassword,
  getVendorIntegrations,
  updateVendorIntegration,
  generateAPIKey,
  revokeAPIKey,
  getStaffAccessOverview,
};
