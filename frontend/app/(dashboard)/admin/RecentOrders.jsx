import React, { useState, useEffect } from 'react';
import { OrdersAPI } from '../../lib/api';
import { client } from '../../lib/api/client';

export default function RecentOrders({ initialLimit = 10 }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await OrdersAPI.getOrders({ limit: initialLimit });
      if (resp.success) setOrders(resp.data || []);
      else throw new Error(resp.error || 'Unable to load orders');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [initialLimit]);

  if (loading) return <p>Loading recent orders...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead>
          <tr>
            <th className="py-2 px-4">Order ID</th>
            <th className="py-2 px-4">Vendor</th>
            <th className="py-2 px-4">Status</th>
            <th className="py-2 px-4">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="py-2 px-4">{o.id}</td>
              <td className="py-2 px-4">{o.vendorId}</td>
              <td className="py-2 px-4 capitalize">{o.status}</td>
              <td className="py-2 px-4">${o.total || 0}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-500">
                No orders found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
