import { useState, useEffect, useCallback } from 'react';
import { VendorsAPI } from '../lib/api/vendors';
import { StaffAPI } from '../lib/api/staff';
import { OrdersAPI } from '../lib/api/orders';
import useAuth from './useAuth';

function extractArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of keys) {
    const candidate = payload?.[key];
    if (Array.isArray(candidate)) return candidate;
  }

  if (payload.data && typeof payload.data === 'object') {
    for (const key of keys) {
      const nested = payload.data?.[key];
      if (Array.isArray(nested)) return nested;
    }
  }

  return [];
}

function extractObject(payload) {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
}

// Hook to load vendor dashboard data (stats, branches, staff, recent orders)
export default function useVendorDashboard(branchScope = null) {
  const { user, isVendorStaff } = useAuth();
  const [vendorId, setVendorId] = useState(null);

  const [stats, setStats] = useState({});
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // compute vendor id once user available
  useEffect(() => {
    if (user) {
      const vid = user.vendorId || (user.vendorIds && user.vendorIds[0]);
      setVendorId(vid);
    }
  }, [user]);

  const fetch = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    try {
      const [dash, brResp, stResp, ordResp] = await Promise.all([
        VendorsAPI.getVendorDashboard(vendorId),
        VendorsAPI.getBranches(vendorId),
        isVendorStaff() && branchScope
          ? StaffAPI.getAllStaff(vendorId, { branchId: branchScope })
          : StaffAPI.getAllStaff(vendorId),
        OrdersAPI.getVendorOrders(vendorId, branchScope ? { branchId: branchScope, limit: 10 } : { limit: 10 }),
      ]);

      if (dash.success) setStats(extractObject(dash.data));
      if (brResp.success) {
        const branchesData = extractArray(brResp.data, ['items', 'branches']);
        console.log('📦 [useVendorDashboard] Branches response:', {
          fullResponse: brResp,
          extractedData: branchesData,
          count: Array.isArray(branchesData) ? branchesData.length : 'not array'
        });
        setBranches(Array.isArray(branchesData) ? branchesData : []);
      }
      if (stResp.success) setStaff(extractArray(stResp.data, ['items', 'staff']));
      if (ordResp.success) setOrders(extractArray(ordResp.data, ['items', 'orders']));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [vendorId, branchScope, isVendorStaff]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {stats, branches, staff, orders, loading, error, refresh: fetch};
}
