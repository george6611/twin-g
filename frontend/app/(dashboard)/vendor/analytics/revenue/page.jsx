'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../../hooks/useAuth';
import { AnalyticsAPI } from '../../../../lib/api/analytics';
import { BranchesAPI } from '../../../../lib/api/branches';
import SectionWrapper from '../../../../components/dashboard/SectionWrapper';
import StatsCard from '../../../../components/dashboard/StatsCard';
import Select from '../../../../components/ui/Select';
import DatePicker from '../../../../components/ui/DatePicker';
import Button from '../../../../components/ui/Button';
import Alert from '../../../../components/ui/Alert';
import {
  buildScopedFilters,
  formatCurrency,
  formatNumber,
  getDatePresetBounds,
  getDefaultFilters,
  normalizeApiData,
  QUICK_RANGES,
  resolveAuthFlags,
  toArray,
} from '../shared';

function RevenueTrend({ data = [] }) {
  const max = Math.max(...data.map((entry) => Number(entry?.amount || entry?.value || 0)), 1);
  return (
    <div className="h-56 rounded border border-orange-100 dark:border-orange-900/30 bg-white dark:bg-gray-900 p-3 overflow-x-auto">
      <div className="flex items-end gap-2 h-full min-w-[700px]">
        {data.map((entry, index) => {
          const amount = Number(entry.amount || entry.value || 0);
          return (
            <div key={`${entry.period || index}`} className="flex-1 min-w-[20px] flex flex-col items-center justify-end gap-1">
              <div className="w-full bg-orange-500 rounded-t" style={{ height: `${(amount / max) * 170}px` }} />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{entry.period || entry.label || index + 1}</span>
            </div>
          );
        })}
        {data.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No revenue trend data.</div>}
      </div>
    </div>
  );
}

export default function VendorRevenueAnalyticsPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isVendor,
    isVendorStaff,
    userRole,
    vendorId: loggedInVendorId,
    assignedBranchId,
  } = useAuth();

  const { isMainVendor, vendorFlag } = resolveAuthFlags({ isVendor, isVendorStaff, userRole });

  const [filters, setFilters] = useState(getDefaultFilters(assignedBranchId));
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({});
  const [trend, setTrend] = useState([]);
  const [byBranch, setByBranch] = useState([]);
  const [byCustomer, setByCustomer] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  
  const scopedFilters = useMemo(
    () => buildScopedFilters(filters, { isMainVendor, assignedBranchId }),
    [filters, isMainVendor, assignedBranchId]
  );

  const fetchRevenue = useCallback(async () => {
    if (!isAuthenticated || !loggedInVendorId || !vendorFlag) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const result = await AnalyticsAPI.getRevenueAnalytics(loggedInVendorId, scopedFilters, {
      isMainVendor,
      assignedBranchId,
    });

    if (result?.status === 401) {
      router.push('/login');
      return;
    }

    if (result?.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }

    if (!result?.success) {
      setError(result?.error || 'Failed to load revenue analytics.');
      setLoading(false);
      return;
    }

    const data = normalizeApiData(result, {});
    setStats(data?.summary || {});
    setTrend(toArray(data?.revenueTrend));
    setByBranch(toArray(data?.revenueByBranch));
    setByCustomer(toArray(data?.revenueByCustomer));
    setPaymentBreakdown(toArray(data?.paymentMethodBreakdown));
    setLoading(false);
  }, [isAuthenticated, loggedInVendorId, vendorFlag, scopedFilters, isMainVendor, assignedBranchId, router]);

  const fetchBranches = useCallback(async () => {
    if (!isMainVendor || !loggedInVendorId) return;
    const result = await BranchesAPI.getBranches(loggedInVendorId, { page: 1, limit: 100 });
    if (!result?.success) return;
    setBranches(toArray(result?.data?.data || result?.data));
  }, [isMainVendor, loggedInVendorId]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const setRange = (range) => {
    const bounds = getDatePresetBounds(range);
    setFilters((prev) => ({
      ...prev,
      dateRange: range,
      startDate: range === 'custom' ? prev.startDate : bounds.startDate,
      endDate: range === 'custom' ? prev.endDate : bounds.endDate,
    }));
  };

  if (!isAuthenticated) return null;

  if (forbidden) {
    return (
      <>
        <div className="p-4 md:p-6">
          <Alert variant="warning" title="Access denied" message="Revenue analytics is restricted to vendor users." />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div className="rounded-lg border border-orange-200 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-900/10 p-4 md:p-6 flex flex-col md:flex-row justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue Analytics</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Revenue by period, branch, customer, and payment channels.</p>
          </div>
          <div className="flex gap-2">
            <Button className="!bg-orange-600 hover:!bg-orange-700 text-white" onClick={fetchRevenue}>Refresh</Button>
            <Link href="/vendor/analytics" className="px-3 py-2 rounded border border-orange-200 text-orange-700 dark:text-orange-300">Overview</Link>
          </div>
        </div>

        <SectionWrapper title="Filters" subtitle="Time scope and branch filtering">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <Select value={filters.dateRange} onChange={(event) => setRange(event.target.value)} options={QUICK_RANGES} placeholder="Quick range" />
            <DatePicker value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} />
            <DatePicker value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} />
            <Select
              value={filters.groupBy || 'daily'}
              onChange={(event) => setFilters((prev) => ({ ...prev, groupBy: event.target.value }))}
              options={[
                { value: 'daily', label: 'By Day' },
                { value: 'weekly', label: 'By Week' },
                { value: 'monthly', label: 'By Month' },
              ]}
              placeholder="Group by"
            />
            {isMainVendor ? (
              <Select
                value={filters.branchId}
                onChange={(event) => setFilters((prev) => ({ ...prev, branchId: event.target.value }))}
                options={[{ value: 'all', label: 'All branches' }, ...branches.map((branch) => ({ value: branch.id || branch._id, label: branch.name || branch.branchName }))]}
                placeholder="Branch"
              />
            ) : (
              <div className="rounded border border-orange-200 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-900/10 px-3 py-2 text-sm text-orange-700 dark:text-orange-300">
                Branch scope enforced for staff.
              </div>
            )}
          </div>
        </SectionWrapper>

        {error ? <Alert variant="error" title="Failed to load" message={error} /> : null}

        <SectionWrapper>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} accent="orange" />
            <StatsCard title="Average Order Value" value={formatCurrency(stats.averageOrderValue)} accent="orange" />
            <StatsCard title="Refunds" value={formatCurrency(stats.refundsTotal)} accent="orange" />
            <StatsCard title="Unique Customers" value={formatNumber(stats.uniqueCustomers)} accent="orange" />
          </div>
        </SectionWrapper>

        <SectionWrapper title="Revenue by Day / Week / Month">
          <RevenueTrend data={trend.slice(-30)} />
        </SectionWrapper>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionWrapper title="Revenue by Branch">
            <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-orange-100 dark:bg-orange-900/30">
                  <tr>
                    <th className="text-left px-3 py-2">Branch</th>
                    <th className="text-left px-3 py-2">Revenue</th>
                    <th className="text-left px-3 py-2">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {byBranch.map((row) => (
                    <tr key={row.branchId || row.id || row.name} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{row.branchName || row.name || '—'}</td>
                      <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                      <td className="px-3 py-2">{formatNumber(row.orders)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionWrapper>

          <SectionWrapper title="Revenue by Customer">
            <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-orange-100 dark:bg-orange-900/30">
                  <tr>
                    <th className="text-left px-3 py-2">Customer</th>
                    <th className="text-left px-3 py-2">Revenue</th>
                    <th className="text-left px-3 py-2">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {byCustomer.map((row) => (
                    <tr key={row.customerId || row.id || row.customerName} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{row.customerName || row.name || '—'}</td>
                      <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                      <td className="px-3 py-2">{formatNumber(row.orders)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionWrapper>
        </div>

        <SectionWrapper title="Payment Method Breakdown">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {paymentBreakdown.map((item) => (
              <div key={item.method || item.label} className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.method || item.label}</div>
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(item.amount)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatNumber(item.count)} transactions</div>
              </div>
            ))}
          </div>
        </SectionWrapper>

        <SectionWrapper title="Forecasting & Subscription Revenue (Future)">
          <div className="rounded border border-orange-200 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-900/10 p-4 text-sm text-gray-700 dark:text-gray-200">
            Forecasting models, recurring subscription revenue curves, and predictive risk scoring will plug into this page
            through <span className="font-medium">AnalyticsAPI.getPredictiveAnalytics</span> when backend services are enabled.
          </div>
        </SectionWrapper>

        {loading ? (
          <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
            <div className="rounded-lg bg-white dark:bg-gray-900 px-5 py-3 border border-orange-200 dark:border-orange-900/40">Loading revenue analytics...</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
