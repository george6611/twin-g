import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useAuth from './useAuth';

// production-ready hook for vendor & staff management
export default function useVendors(initialFilters = {}) {
  const { user, hasPermission } = useAuth();

  const [vendors, setVendors] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const vendorsRef = useRef([]);
  const vendorRef = useRef(null);
  const staffRef = useRef([]);
  const filtersRef = useRef({ ...initialFilters });

  const listController = useRef(null);
  const singleController = useRef(null);
  const staffController = useRef(null);

  const handleResponse = (res) => {
    if (res.status === 401) {
      const e = new Error('Unauthenticated');
      e.status = 401;
      throw e;
    }
    if (res.status === 403) {
      const e = new Error('Forbidden');
      e.status = 403;
      throw e;
    }
    if (!res.ok) {
      const e = new Error(res.statusText || 'Network response was not ok');
      e.status = res.status;
      throw e;
    }
    return res;
  };

  const buildQuery = (filters) => {
    const qs = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, v);
      }
    });
    const str = qs.toString();
    return str ? `?${str}` : '';
  };

  const fetchVendors = useCallback(async (filters = {}) => {
    filtersRef.current = { ...filtersRef.current, ...filters };
    if (listController.current) listController.current.abort();
    const controller = new AbortController();
    listController.current = controller;

    setLoading(true);
    setError(null);
    try {
      const query = buildQuery(filtersRef.current);
      const res = await fetch(`/api/vendors${query}`, {
        credentials: 'include',
        signal: controller.signal,
      });
      handleResponse(res);
      const data = await res.json();
      vendorsRef.current = data;
      setVendors(data);
      return data;
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVendorById = useCallback(async (id) => {
    if (!id) throw new Error('Vendor ID is required');
    if (singleController.current) singleController.current.abort();
    const controller = new AbortController();
    singleController.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        credentials: 'include',
        signal: controller.signal,
      });
      handleResponse(res);
      const data = await res.json();
      vendorRef.current = data;
      setVendor(data);
      return data;
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createVendor = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      handleResponse(res);
      const created = await res.json();
      // optionally refresh list or append
      vendorsRef.current = [];
      setVendors([]);
      return created;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateVendor = useCallback(async (id, data) => {
    if (!id) throw new Error('Vendor ID required');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      handleResponse(res);
      const updated = await res.json();
      // update local cache
      vendorsRef.current = vendorsRef.current.map((v) =>
        v.id === id ? updated : v
      );
      setVendors(vendorsRef.current);
      if (vendorRef.current && vendorRef.current.id === id) {
        vendorRef.current = updated;
        setVendor(updated);
      }
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async (vendorId) => {
    if (!vendorId) throw new Error('Vendor ID is required');
    if (staffController.current) staffController.current.abort();
    const controller = new AbortController();
    staffController.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/staff`, {
        credentials: 'include',
        signal: controller.signal,
      });
      handleResponse(res);
      const data = await res.json();
      staffRef.current = data;
      setStaff(data);
      return data;
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createStaff = useCallback(async (vendorId, data) => {
    if (!vendorId) throw new Error('Vendor ID required');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/staff`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      handleResponse(res);
      const created = await res.json();
      staffRef.current = [];
      setStaff([]);
      return created;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStaffPermissions = useCallback(async (staffId, permissions) => {
    if (!staffId) throw new Error('Staff ID required');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${staffId}/permissions`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      handleResponse(res);
      const updated = await res.json();
      staffRef.current = staffRef.current.map((s) =>
        s.id === staffId ? updated : s
      );
      setStaff(staffRef.current);
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivateStaff = useCallback(async (staffId) => {
    if (!staffId) throw new Error('Staff ID required');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${staffId}/deactivate`, {
        method: 'POST',
        credentials: 'include',
      });
      handleResponse(res);
      const updated = await res.json();
      staffRef.current = staffRef.current.map((s) =>
        s.id === staffId ? updated : s
      );
      setStaff(staffRef.current);
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchVendors(filtersRef.current);
  }, [fetchVendors]);

  // permission helpers
  const hasVendorPermission = useCallback(
    (perm) => {
      return hasPermission && hasPermission(perm);
    },
    [hasPermission]
  );

  const canManageStaff = useCallback(
    () => hasVendorPermission('manage_staff'),
    [hasVendorPermission]
  );

  const canEditVendorProfile = useCallback(
    () => hasVendorPermission('edit_vendor'),
    [hasVendorPermission]
  );

  const permissionsHelpers = useMemo(
    () => ({ hasVendorPermission, canManageStaff, canEditVendorProfile }),
    [hasVendorPermission, canManageStaff, canEditVendorProfile]
  );

  useEffect(() => {
    return () => {
      if (listController.current) listController.current.abort();
      if (singleController.current) singleController.current.abort();
      if (staffController.current) staffController.current.abort();
    };
  }, []);

  return {
    vendors,
    vendor,
    staff,
    loading,
    error,
    fetchVendors,
    fetchVendorById,
    createVendor,
    updateVendor,
    fetchStaff,
    createStaff,
    updateStaffPermissions,
    deactivateStaff,
    refresh,
    ...permissionsHelpers,
  };
}
