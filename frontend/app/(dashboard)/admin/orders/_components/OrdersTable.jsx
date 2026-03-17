import React from 'react';
import { Calendar, User, MapPin, ExternalLink } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    preparing: 'bg-purple-100 text-purple-700 border-purple-200',
    dispatched: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.toUpperCase()}
    </span>
  );
};

export default function OrdersTable({ orders, isLoading, renderActions }) {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg w-full" />)}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        No orders found matching your criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
            <th className="px-6 py-4 font-semibold">Order ID</th>
            <th className="px-6 py-4 font-semibold">Customer</th>
            <th className="px-6 py-4 font-semibold">Vendor</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold">Amount</th>
            <th className="px-6 py-4 font-semibold">Time</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-mono font-medium text-gray-900">
                #{order.id.slice(-6).toUpperCase()}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{order.customerName || 'Guest'}</span>
                  <span className="text-xs text-gray-500">{order.customerPhone}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-700">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  {order.vendorName}
                </div>
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-6 py-4 font-semibold text-gray-900">
                KES {order.totalAmount?.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                {renderActions(order)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}