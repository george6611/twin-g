"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../../../hooks/useAuth';
import { VendorsAPI } from '../../../../lib/api/vendors';
import StatsCard from '../../../../components/dashboard/StatsCard';
import ChartCard from '../../../../components/dashboard/ChartCard';
import SectionWrapper from '../../../../components/dashboard/SectionWrapper';
import DateRangePicker from '../../../../components/dashboard/Filters/DateRangePicker';
import Button from '../../../../components/ui/Button';
import Table from '../../../../components/dashboard/Table';
import validators from '../../../../lib/validators';

export default function VendorsAnalytics() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({ total:0, active:0, revenue:0 });
  const [filters, setFilters] = useState({ start:'', end:'' });
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
      const resp = await VendorsAPI.getVendorAnalytics(filters);
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
          <StatsCard title="Total vendors" value={stats.total} accent="orange" />
          <StatsCard title="Active" value={stats.active} />
          <StatsCard title="Revenue" value={`$${Number(stats.revenue ||0).toFixed(2)}`} />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Filters">
        <DateRangePicker
          start={filters.start}
          end={filters.end}
          onChange={(r) => setFilters((f) => ({ ...f, ...r }))}
        />
      </SectionWrapper>

      <SectionWrapper title="Charts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Revenue per vendor" />
          <ChartCard title="Order counts per vendor" />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Top vendors">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="bg-orange-500">Export CSV</Button>
        </div>
        <Table
          columns={[
            { key: 'name', title: 'Vendor' },
            { key: 'orders', title: 'Orders' },
            { key: 'revenue', title: 'Revenue' },
          ]}
          data={data}
          rowKey={(r) => r.id || r._id}
        />
      </SectionWrapper>
    </div>
  );
}
