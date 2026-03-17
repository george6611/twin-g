"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import { OrdersAPI } from '../../../lib/api/orders';
import { VendorsAPI } from '../../../lib/api/vendors';
import { AdminAPI } from '../../../lib/api/admin';
import StatsCard from '../../../components/dashboard/StatsCard';
import SectionWrapper from '../../../components/dashboard/SectionWrapper';
import DateRangePicker from '../../../components/dashboard/Filters/DateRangePicker';
import VendorFilter from '../../../components/dashboard/Filters/VendorFilter';
import validators from '../../../lib/validators';

export default function AnalyticsHome() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({ orders:0, vendors:0, revenue:0, staff:0 });
  const [filters, setFilters] = useState({ start:'', end:'', vendorId:'' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isSuper = !!user && user.role === 'super_admin';

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    const dr = validators.validateDateRange(filters.start, filters.end);
    if (!dr.valid) {
      setError(dr.error);
      setLoading(false);
      return;
    }
    try {
      const [orderStats, revenueStats, vendorStats, staffStats] = await Promise.all([
        OrdersAPI.getDashboardStats(filters),
        OrdersAPI.getRevenueStats(filters),
        VendorsAPI.getVendorAnalytics(filters),
        AdminAPI.getStaffAnalytics(filters),
      ]);
      if (orderStats.success) setStats((s) => ({ ...s, orders: orderStats.data.totalOrders || 0 }));
      if (revenueStats.success) setStats((s) => ({ ...s, revenue: revenueStats.data.total || 0 }));
      if (vendorStats.success) setStats((s) => ({ ...s, vendors: vendorStats.data.totalVendors || 0 }));
      if (staffStats.success) setStats((s) => ({ ...s, staff: staffStats.data.totalStaff || 0 }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchAnalytics(); }, [user, filters]);

  if (loading || authLoading) return <div className="p-6">Loading analytics...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <SectionWrapper>
        <div className="flex flex-wrap gap-4">
          <StatsCard title="Total orders" value={stats.orders} accent="orange" />
          <StatsCard title="Active vendors" value={stats.vendors} accent="orange" />
          <StatsCard title="Total revenue" value={`$${Number(stats.revenue).toFixed(2)}`} accent="orange" />
          <StatsCard title="Active staff" value={stats.staff} accent="orange" />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Quick filters">
        <div className="flex flex-wrap gap-4 items-center">
          <DateRangePicker
            start={filters.start}
            end={filters.end}
            onChange={(r) => setFilters((f) => ({ ...f, ...r }))}
          />
          <VendorFilter
            vendorId={filters.vendorId}
            onChange={(v) => setFilters((f) => ({ ...f, vendorId: v }))}
          />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Modules">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/dashboard/admin/analytics/orders" className="block p-4 border rounded hover:bg-orange-50">Orders Analytics</Link>
          <Link href="/dashboard/admin/analytics/vendors" className="block p-4 border rounded hover:bg-orange-50">Vendors Analytics</Link>
          <Link href="/dashboard/admin/analytics/revenue" className="block p-4 border rounded hover:bg-orange-50">Revenue Analytics</Link>
          <Link href="/dashboard/admin/analytics/staff" className="block p-4 border rounded hover:bg-orange-50">Staff Analytics</Link>
        </div>
      </SectionWrapper>
    </div>
  );
}
