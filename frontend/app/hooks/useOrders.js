import { useState, useEffect, useRef, useCallback } from 'react';

// production-ready hook for managing orders
export default function useOrders(initialFilters = {}) {
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // keep filters in a ref so that refresh() can reuse them without
  // triggering the effect that sets up polling
  const filtersRef = useRef({ ...initialFilters });

  // separate controllers for list vs single fetches
  const listController = useRef(null);
  const singleController = useRef(null);
  const pollingTimer = useRef(null);

  const handleResponse = (res) => {
    if (res.status === 401) {
      const e = new Error('Unauthorized');
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

  const fetchOrders = useCallback(
    async (filters = {}) => {
      // merge new filters with existing
      filtersRef.current = { ...filtersRef.current, ...filters };

      // abort any in-flight list request
      if (listController.current) {
        listController.current.abort();
      }
      const controller = new AbortController();
      listController.current = controller;

      setLoading(true);
      setError(null);
      try {
        const query = buildQuery(filtersRef.current);
        const res = await fetch(`/api/orders${query}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        handleResponse(res);
        const data = await res.json();
        setOrders(data);
        return data;
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [] // stable reference
  );

  const fetchOrderById = useCallback(async (id) => {
    if (!id) {
      throw new Error('Order ID is required');
    }

    // abort any in-flight single request
    if (singleController.current) {
      singleController.current.abort();
    }
    const controller = new AbortController();
    singleController.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        credentials: 'include',
        signal: controller.signal,
      });
      handleResponse(res);
      const data = await res.json();
      setOrder(data);
      return data;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (id, status) => {
    if (!id || !status) {
      throw new Error('Order ID and new status are required');
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      handleResponse(res);
      const data = await res.json();

      // optimistically update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: data.status } : o))
      );
      if (order && order.id === id) {
        setOrder((prev) => ({ ...prev, status: data.status }));
      }
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [order]);

  const refresh = useCallback(() => {
    return fetchOrders(filtersRef.current);
  }, [fetchOrders]);

  // setup polling for real-time refresh
  useEffect(() => {
    // default to 30s interval; could be parameterized later
    pollingTimer.current = setInterval(() => {
      // ignore errors to avoid unhandled promise rejections
      fetchOrders().catch(() => {
        /* noop */
      });
    }, 30000);

    return () => {
      if (pollingTimer.current) {
        clearInterval(pollingTimer.current);
      }
    };
  }, [fetchOrders]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (listController.current) {
        listController.current.abort();
      }
      if (singleController.current) {
        singleController.current.abort();
      }
      if (pollingTimer.current) {
        clearInterval(pollingTimer.current);
      }
    };
  }, []);

  return {
    orders,
    order,
    loading,
    error,
    fetchOrders,
    fetchOrderById,
    updateOrderStatus,
    refresh,
  };
}
