import { client } from './client';
import utils from '../utils';

function sanitizeFilters(filters) {
  const out = {};
  if (!filters || typeof filters !== 'object') return out;
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = String(v);
  }
  return out;
}

export async function getOrders(filters = {}, options = {}) {
  const safe = sanitizeFilters(filters);
  const resp = await client.get('/api/orders', { params: safe, ...options });
  return resp;
}

export async function getOrderById(id) {
  if (!utils.isValidOrderId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  const resp = await client.get(`/api/orders/${id}`);
  return resp;
}

export async function createOrder(data) {
  return await client.post('/api/orders', { body: data });
}

export async function updateOrder(id, data) {
  if (!utils.isValidOrderId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/orders/${id}`, { body: data });
}

export async function updateOrderStatus(id, status) {
  if (!utils.isValidOrderId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/orders/${id}/status`, { body: { status } });
}

export async function getOrderTimeline(id) {
  if (!utils.isValidOrderId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/orders/${id}/timeline`);
}

export async function reassignOrderVendor(id, vendorId) {
  if (!utils.isValidOrderId(id) || !utils.isValidVendorId(vendorId)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.patch(`/api/orders/${id}/reassign`, { body: { vendorId } });
}

export async function addOrderNote(id, note) {
  if (!utils.isValidOrderId(id) || typeof note !== 'string' || !note.trim()) {
    return { success: false, error: 'invalid_input', status: 400 };
  }
  return await client.post(`/api/orders/${id}/notes`, { body: { note } });
}

export async function getOrderAudit(id) {
  if (!utils.isValidOrderId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.get(`/api/orders/${id}/audit`);
}

export async function deleteOrder(id) {
  if (!utils.isValidOrderId(id)) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.del(`/api/orders/${id}`);
}

export const OrdersAPI = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderTimeline,
  reassignOrderVendor,
  addOrderNote,
  getOrderAudit,

  /* analytics */
  getDashboardStats: async () => await client.get('/api/admin/analytics/dashboard'),
  getRevenueStats: async (params) => await client.get('/api/admin/analytics/revenue', { params }),
  getOrderAnalytics: async (params) => await client.get('/api/admin/analytics/orders', { params }),

  /* vendor-specific orders */
  getVendorOrders: async (vendorId, params = {}) => {
    return await client.get(`/api/vendors/${vendorId}/orders`, { params });
  },
  getVendorOrderStats: async (vendorId, params = {}) => {
    return await client.get(`/api/vendors/${vendorId}/orders/stats`, { params });
  },
  getVendorOrderById: async (vendorId, orderId) => {
    if (!utils.isValidVendorId(vendorId) || !utils.isValidOrderId(orderId)) {
      return { success: false, error: 'invalid_id', status: 400 };
    }
    return await client.get(`/api/vendors/${vendorId}/orders/${orderId}`);
  },
};