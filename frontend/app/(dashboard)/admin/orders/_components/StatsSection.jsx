import React from 'react';
import { ShoppingBag, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export default function StatsSection({ orders = [] }) {
  const stats = {
    total: orders.length,
    active: orders.filter(o => ['pending', 'confirmed', 'preparing', 'dispatched'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    revenue: orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
  };

  const cards = [
    { label: 'Total Orders', value: stats.total, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Deliveries', value: stats.active, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Total Revenue', value: `KES ${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-lg ${card.bg} ${card.color}`}>
            <card.icon size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">{card.label}</p>
            <h3 className="text-xl font-bold text-gray-900">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}