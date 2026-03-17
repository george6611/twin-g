import React from 'react';
import StatsCard from '../../../components/dashboard/StatsCard';

export default function VendorStats({ total, active, pending }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatsCard title="Total Vendors" value={total || 0} />
      <StatsCard title="Active Vendors" value={active || 0} />
      <StatsCard title="Pending Approval" value={pending || 0} />
    </div>
  );
}
