import { client } from './client';
import utils from '../utils';

/*
  inventory helper for vendor scoped products
  fetches from the product API which handles vendor context via JWT token
*/

export async function getInventory(vendorId, params = {}) {
  // The backend will extract the vendor from the JWT, so we don't need vendorId in URL
  return await client.get(`/api/vendor/products`, { params });
}

export async function getInventoryItem(vendorId, itemId) {
  if (!utils.isValidVendorId(vendorId) || !itemId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/vendor/products/${itemId}`);
}

export async function createInventoryItem(vendorId, data) {
  if (!utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_vendor', status: 400 };
  }
  return await client.post(`/api/vendors/${vendorId}/inventory`, { body: data });
}

export async function updateInventoryItem(vendorId, itemId, data) {
  if (!utils.isValidVendorId(vendorId) || !itemId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/vendor/products/${itemId}`, { body: data });
}

export async function deleteInventoryItem(vendorId, itemId) {
  if (!utils.isValidVendorId(vendorId) || !itemId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.del(`/api/vendors/${vendorId}/inventory/${itemId}`);
}

export async function getCategories(vendorId) {
  const resp = await client.get('/api/categories');
  if (!resp.success) {
    return resp;
  }

  const payload = resp.data;
  const categories = payload?.categories || payload?.data || payload || [];
  return {
    ...resp,
    data: Array.isArray(categories) ? categories : [],
  };
}

export async function uploadInventoryImages(vendorId, itemId, files = []) {
  if (!utils.isValidVendorId(vendorId) || !itemId) {
    return { success: false, error: 'invalid_id', status: 400 };
  }

  if (!Array.isArray(files) || files.length === 0) {
    return { success: false, error: 'no_files', status: 400 };
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  return await client.postFormData(`/api/vendor/products/${itemId}/upload`, formData);
}

export const InventoryAPI = {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  uploadInventoryImages,
  deleteInventoryItem,
  getCategories,
};
