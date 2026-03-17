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
  formatPercent,
  getDatePresetBounds,
  getDefaultFilters,
  normalizeApiData,
  QUICK_RANGES,
  resolveAuthFlags,
  toArray,
} from '../shared';

export default function VendorBranchesAnalyticsPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isVendor,
    isVendorStaff,
    userRole,
    vendorId: loggedInVendorId,
    assignedBranchId,
  } = useAuth();

  const { isMainVendor, isStaff, vendorFlag } = resolveAuthFlags({ isVendor, isVendorStaff, userRole });

  const [filters, setFilters] = useState(getDefaultFilters(assignedBranchId));
  const [branches, setBranches] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);


  const scopedFilters = useMemo(
    () => buildScopedFilters(filters, { isMainVendor, assignedBranchId }),
    [filters, isMainVendor, assignedBranchId]
  );

  const fetchBranchesAnalytics = useCallback(async () => {
    if (!isAuthenticated || !loggedInVendorId || !vendorFlag) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const result = await AnalyticsAPI.getBranchAnalytics(loggedInVendorId, scopedFilters, {
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
      setError(result?.error || 'Failed to load branch analytics.');
      setLoading(false);
      return;
    }

    const data = normalizeApiData(result, {});
    setRanking(toArray(data?.branchRanking));
    setLoading(false);
  }, [isAuthenticated, loggedInVendorId, vendorFlag, scopedFilters, isMainVendor, assignedBranchId, router]);

  const fetchBranches = useCallback(async () => {
    if (!isMainVendor || !loggedInVendorId) return;
    const result = await BranchesAPI.getBranches(loggedInVendorId, { page: 1, limit: 100 });
    if (!result?.success) return;
    setBranches(toArray(result?.data?.data || result?.data));
  }, [isMainVendor, loggedInVendorId]);

  useEffect(() => {
    fetchBranchesAnalytics();
  }, [fetchBranchesAnalytics]);

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

  const visibleRows = useMemo(() => ranking.slice(0, 30), [ranking]);

  if (!isAuthenticated) return null;

  if (forbidden) {
    return (
      <>
        <div className="p-4 md:p-6">
          <Alert variant="warning" title="Access denied" message="Branch analytics is restricted to vendor users." />
        </div>
      </>
    );
  }

  const summary = {
    totalBranches: visibleRows.length,
    totalRevenue: visibleRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
    totalOrders: visibleRows.reduce((sum, row) => sum + Number(row.orders || 0), 0),
    avgDelivery: visibleRows.length
      ? `${(visibleRows.reduce((sum, row) => sum + Number(row.avgDeliveryMinutes || 0), 0) / visibleRows.length).toFixed(1)} min`
      : '—',
  };

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div className="rounded-lg border border-orange-200 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-900/10 p-4 md:p-6 flex flex-col md:flex-row justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branch Analytics</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Branch ranking, productivity, inventory risk, and delivery comparison.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="!bg-orange-600 hover:!bg-orange-700 text-white" onClick={fetchBranchesAnalytics}>Refresh</Button>
            <Link href="/vendor/analytics" className="px-3 py-2 rounded border border-orange-200 text-orange-700 dark:text-orange-300">Overview</Link>
          </div>
        </div>

        {isStaff ? (
          <Alert variant="info" title="Scoped View" message="As branch staff, you can view only your assigned branch analytics." />
        ) : null}

        <SectionWrapper title="Filters" subtitle="Date scope and branch selection">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <Select value={filters.dateRange} onChange={(event) => setRange(event.target.value)} options={QUICK_RANGES} placeholder="Quick range" />
            <DatePicker value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} />
            <DatePicker value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} />
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
            <StatsCard title="Branches in Scope" value={formatNumber(summary.totalBranches)} accent="orange" />
            <StatsCard title="Revenue in Scope" value={formatCurrency(summary.totalRevenue)} accent="orange" />
            <StatsCard title="Orders in Scope" value={formatNumber(summary.totalOrders)} accent="orange" />
            <StatsCard title="Avg Delivery Speed" value={summary.avgDelivery} accent="orange" />
          </div>
        </SectionWrapper>

        <SectionWrapper title="Branch Ranking & Performance">
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-orange-100 dark:bg-orange-900/30">
                <tr>
                  <th className="text-left px-3 py-2">Rank</th>
                  <th className="text-left px-3 py-2">Branch</th>
                  <th className="text-left px-3 py-2">Revenue</th>
                  <th className="text-left px-3 py-2">Orders</th>
                  <th className="text-left px-3 py-2">Staff Productivity</th>
                  <th className="text-left px-3 py-2">Low Inventory Frequency</th>
                  <th className="text-left px-3 py-2">Avg Delivery Time</th>
                  <th className="text-left px-3 py-2">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr key={row.branchId || row.id || row.branchName || index} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.branchName || row.name || '—'}</td>
                    <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                    <td className="px-3 py-2">{formatNumber(row.orders)}</td>
                    <td className="px-3 py-2">{formatNumber(row.staffProductivityScore)}</td>
                    <td className="px-3 py-2">{formatNumber(row.lowInventoryFrequency)}</td>
                    <td className="px-3 py-2">{row.avgDeliveryTime || `${Number(row.avgDeliveryMinutes || 0).toFixed(1)} min`}</td>
                    <td className="px-3 py-2">{formatPercent(row.completionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionWrapper>

        {loading ? (
          <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
            <div className="rounded-lg bg-white dark:bg-gray-900 px-5 py-3 border border-orange-200 dark:border-orange-900/40">Loading branch analytics...</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
