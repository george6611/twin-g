export const QUICK_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom range' },
];

export function resolveAuthFlags({ isVendor, isVendorStaff, userRole }) {
  const vendorFlag = typeof isVendor === 'function' ? isVendor() : !!isVendor;
  const staffFlag = typeof isVendorStaff === 'function' ? isVendorStaff() : !!isVendorStaff;

  const isMainVendor = (vendorFlag && !staffFlag) || userRole === 'vendor_main';
  const isStaff = staffFlag || userRole === 'vendor_staff';

  return { isMainVendor, isStaff, vendorFlag };
}

export function getDatePresetBounds(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toISO = (date) => date.toISOString().slice(0, 10);

  if (preset === 'today') {
    return { startDate: toISO(today), endDate: toISO(today) };
  }

  if (preset === '7d') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: toISO(start), endDate: toISO(today) };
  }

  if (preset === '30d') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { startDate: toISO(start), endDate: toISO(today) };
  }

  return { startDate: '', endDate: '' };
}

export function getDefaultFilters(assignedBranchId) {
  const defaultRange = getDatePresetBounds('7d');

  return {
    dateRange: '7d',
    granularity: 'daily',
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    branchId: assignedBranchId || '',
    page: 1,
    limit: 20,
  };
}

export function buildScopedFilters(filters, { isMainVendor, assignedBranchId }) {
  const nextFilters = { ...filters };

  if (!isMainVendor && assignedBranchId) {
    nextFilters.branchId = assignedBranchId;
  }

  return nextFilters;
}

export function normalizeApiData(result, fallback = null) {
  if (!result?.success) return fallback;

  if (
    result.data &&
    typeof result.data === 'object' &&
    !Array.isArray(result.data) &&
    Object.prototype.hasOwnProperty.call(result.data, 'data')
  ) {
    return result.data.data;
  }

  return result.data ?? fallback;
}

export function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function formatPercent(value) {
  const num = Number(value || 0);
  return `${num.toFixed(1)}%`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export function statusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('deliver') || normalized.includes('complete') || normalized === 'active') return 'delivered';
  if (normalized.includes('progress') || normalized.includes('pending')) return 'in_progress';
  if (normalized.includes('cancel')) return 'cancelled';
  return 'default';
}
