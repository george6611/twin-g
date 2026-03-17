import React from 'react';

export function StatsCard({ title, value, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded p-4 flex flex-col ${className}`}>
      <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      <span className="text-2xl font-semibold mt-1">{value}</span>
    </div>
  );
}

export default function HeroStats({ vendors, orders, staffCount, revenue }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Vendors" value={vendors || 0} />
      <StatsCard title="Total Orders" value={orders || 0} />
      <StatsCard title="Active Staff" value={staffCount || 0} />
      <StatsCard title="Revenue" value={revenue ? `$${revenue}` : '$0'} />
    </div>
  );
}
