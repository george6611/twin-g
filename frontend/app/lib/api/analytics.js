import { client } from './client';

function normalizeFilters(filters = {}) {
  const normalized = { ...filters };

  if (normalized.dateRange === 'custom') {
    if (!normalized.startDate || !normalized.endDate) {
      return { valid: false, error: 'custom_range_requires_dates' };
    }
  }

  if (normalized.startDate && normalized.endDate) {
    const start = new Date(normalized.startDate);
    const end = new Date(normalized.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { valid: false, error: 'invalid_date_range' };
    }

    if (start > end) {
      return { valid: false, error: 'start_date_after_end_date' };
    }
  }

  return { valid: true, params: normalized };
}

function buildScopedFilters(filters = {}, options = {}) {
  const { isMainVendor = false, assignedBranchId = null } = options;
  const safeFilters = { ...filters };

  if (!isMainVendor && assignedBranchId) {
    safeFilters.branchId = assignedBranchId;
  }

  return safeFilters;
}

function buildVendorPath(vendorId, path) {
  if (!vendorId) {
    return { valid: false, error: 'invalid_vendor_id', status: 400 };
  }

  return { valid: true, path: `/api/vendors/${vendorId}/analytics${path}` };
}

async function scopedGet(vendorId, path, filters, options) {
  const vendorPath = buildVendorPath(vendorId, path);
  if (!vendorPath.valid) return vendorPath;

  const scopedFilters = buildScopedFilters(filters, options);
  const normalized = normalizeFilters(scopedFilters);

  if (!normalized.valid) {
    return { success: false, error: normalized.error, status: 400 };
  }

  return client.get(vendorPath.path, { params: normalized.params });
}

export async function getVendorSummary(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/summary', filters, options);
}

export async function getRevenueTrend(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/revenue-trend', filters, options);
}

export async function getStatusDistribution(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/status-distribution', filters, options);
}

export async function getBranchPerformance(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/branch-performance', filters, options);
}

export async function getStaffActivity(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/staff-activity', filters, options);
}

export async function getOrderAnalytics(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/orders', filters, options);
}

export async function getRevenueAnalytics(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/revenue', filters, options);
}

export async function getBranchAnalytics(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/branches', filters, options);
}

export async function getStaffAnalytics(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/staff', filters, options);
}

export async function exportOrdersCSV(vendorId, filters = {}, options = {}) {
  const vendorPath = buildVendorPath(vendorId, '/orders/export');
  if (!vendorPath.valid) return vendorPath;

  const scopedFilters = buildScopedFilters(filters, options);
  const normalized = normalizeFilters(scopedFilters);

  if (!normalized.valid) {
    return { success: false, error: normalized.error, status: 400 };
  }

  return client.get(vendorPath.path, {
    params: { ...normalized.params, format: 'csv' },
  });
}

export async function getPredictiveAnalytics(vendorId, filters = {}, options = {}) {
  return scopedGet(vendorId, '/predictive', filters, options);
}

export const AnalyticsAPI = {
  getVendorSummary,
  getRevenueTrend,
  getStatusDistribution,
  getBranchPerformance,
  getStaffActivity,
  getOrderAnalytics,
  getRevenueAnalytics,
  getBranchAnalytics,
  getStaffAnalytics,
  exportOrdersCSV,
  getPredictiveAnalytics,
};
