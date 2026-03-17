"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../../../hooks/useAuth';
import { OrdersAPI } from '../../../../lib/api/orders';
import StatsCard from '../../../../components/dashboard/StatsCard';
import ChartCard from '../../../../components/dashboard/ChartCard';
import SectionWrapper from '../../../../components/dashboard/SectionWrapper';
import DateRangePicker from '../../../../components/dashboard/Filters/DateRangePicker';
import VendorFilter from '../../../../components/dashboard/Filters/VendorFilter';
import Table from '../../../../components/dashboard/Table';
import Button from '../../../../components/ui/Button';
import validators from '../../../../lib/validators';

export default function OrdersAnalytics() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({ total:0, pending:0, delivered:0, cancelled:0 });
  const [filters, setFilters] = useState({ start:'', end:'', vendorId:'' });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && !['admin','super_admin'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [authLoading, user]);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    const dr = validators.validateDateRange(filters.start, filters.end);
    if (!dr.valid) {
      setError(dr.error);
      setLoading(false);
      return;
    }
    try {
      const resp = await OrdersAPI.getOrderAnalytics(filters);
      if (resp.success) {
        setStats(resp.data.stats || {});
        setData(resp.data.items || []);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetch(); }, [user, filters]);

  if (loading || authLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <SectionWrapper>
        <div className="flex flex-wrap gap-4">
          <StatsCard title="Total orders" value={stats.total} accent="orange" />
          <StatsCard title="Pending" value={stats.pending} />
          <StatsCard title="Delivered" value={stats.delivered} />
          <StatsCard title="Cancelled" value={stats.cancelled} />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Filters">
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

      <SectionWrapper title="Charts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Orders over time" />
          <ChartCard title="Status distribution" />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Recent orders">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="bg-orange-500">Export CSV</Button>
        </div>
        <Table
          columns={[
            { key: 'id', title: 'Order ID' },
            { key: 'status', title: 'Status' },
            { key: 'vendor', title: 'Vendor' },
            { key: 'total', title: 'Total' },
          ]}
          data={data}
        />
      </SectionWrapper>
    </div>
  );
}
