'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../../hooks/useAuth';

import { AnalyticsAPI } from '../../../../lib/api/analytics';
import SectionWrapper from '../../../../components/dashboard/SectionWrapper';
import StatsCard from '../../../../components/dashboard/StatsCard';
import Select from '../../../../components/ui/Select';
import DatePicker from '../../../../components/ui/DatePicker';
import Button from '../../../../components/ui/Button';
import Alert from '../../../../components/ui/Alert';
import {
  buildScopedFilters,
  formatDateTime,
  formatNumber,
  formatPercent,
  getDatePresetBounds,
  getDefaultFilters,
  normalizeApiData,
  QUICK_RANGES,
  resolveAuthFlags,
  toArray,
} from '../shared';

export default function VendorStaffAnalyticsPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isVendor,
    isVendorStaff,
    userRole,
    vendorId: loggedInVendorId,
    assignedBranchId,
    user,
  } = useAuth();

  const { isMainVendor, isStaff, vendorFlag } = resolveAuthFlags({ isVendor, isVendorStaff, userRole });

  const [filters, setFilters] = useState(getDefaultFilters(assignedBranchId));
  const [summary, setSummary] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);


  const scopedFilters = useMemo(() => {
    const scoped = buildScopedFilters(filters, { isMainVendor, assignedBranchId });

    if (isStaff) {
      scoped.staffId = user?.id || user?._id;
    }

    return scoped;
  }, [filters, isMainVendor, assignedBranchId, isStaff, user]);

  const fetchStaffAnalytics = useCallback(async () => {
    if (!isAuthenticated || !loggedInVendorId || !vendorFlag) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const result = await AnalyticsAPI.getStaffAnalytics(loggedInVendorId, scopedFilters, {
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
      setError(result?.error || 'Failed to load staff analytics.');
      setLoading(false);
      return;
    }

    const data = normalizeApiData(result, {});
    const tableRows = toArray(data?.staffMetrics);

    setSummary(data?.summary || {});
    setRows(isStaff ? tableRows.filter((row) => (row.staffId || row.id) === (user?.id || user?._id)) : tableRows);
    setLoading(false);
  }, [isAuthenticated, loggedInVendorId, vendorFlag, scopedFilters, isMainVendor, assignedBranchId, isStaff, user, router]);

  useEffect(() => {
    fetchStaffAnalytics();
  }, [fetchStaffAnalytics]);

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
          <Alert variant="warning" title="Access denied" message="Staff analytics is restricted to vendor users." />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div className="rounded-lg border border-orange-200 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-900/10 p-4 md:p-6 flex flex-col md:flex-row justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Analytics</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Order handling, response time, login activity, and productivity trends.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="!bg-orange-600 hover:!bg-orange-700 text-white" onClick={fetchStaffAnalytics}>Refresh</Button>
            <Link href="/vendor/analytics" className="px-3 py-2 rounded border border-orange-200 text-orange-700 dark:text-orange-300">Overview</Link>
          </div>
        </div>

        {isStaff ? (
          <Alert variant="info" title="Scoped View" message="You can only access your own analytics metrics." />
        ) : null}

        <SectionWrapper title="Filters" subtitle="Date and trend window">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Select value={filters.dateRange} onChange={(event) => setRange(event.target.value)} options={QUICK_RANGES} placeholder="Quick range" />
            <DatePicker value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} />
            <DatePicker value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} />
            <Select
              value={filters.window || 'daily'}
              onChange={(event) => setFilters((prev) => ({ ...prev, window: event.target.value }))}
              options={[
                { value: 'daily', label: 'Daily trend' },
                { value: 'weekly', label: 'Weekly trend' },
              ]}
              placeholder="Trend window"
            />
          </div>
        </SectionWrapper>

        {error ? <Alert variant="error" title="Failed to load" message={error} /> : null}

        <SectionWrapper>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard title="Orders Handled" value={formatNumber(summary.ordersHandled)} accent="orange" />
            <StatsCard title="Avg Response Time" value={summary.avgResponseTime || '—'} accent="orange" />
            <StatsCard title="Cancellations" value={formatNumber(summary.cancellations)} accent="orange" />
            <StatsCard title="Login Sessions" value={formatNumber(summary.loginSessions)} accent="orange" />
          </div>
        </SectionWrapper>

        <SectionWrapper title="Staff Productivity Trends">
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-orange-100 dark:bg-orange-900/30">
                <tr>
                  <th className="text-left px-3 py-2">Staff</th>
                  <th className="text-left px-3 py-2">Orders Processed</th>
                  <th className="text-left px-3 py-2">Status Updates</th>
                  <th className="text-left px-3 py-2">Cancellation Patterns</th>
                  <th className="text-left px-3 py-2">Avg Response Time</th>
                  <th className="text-left px-3 py-2">Login Activity</th>
                  <th className="text-left px-3 py-2">Productivity Trend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.staffId || row.id || row.staffName} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.staffName || row.name || '—'}</td>
                    <td className="px-3 py-2">{formatNumber(row.ordersProcessed)}</td>
                    <td className="px-3 py-2">{formatNumber(row.statusUpdates)}</td>
                    <td className="px-3 py-2">{formatPercent(row.cancellationPatternRate)}</td>
                    <td className="px-3 py-2">{row.avgResponseTime || '—'}</td>
                    <td className="px-3 py-2">{formatDateTime(row.lastLogin)}</td>
                    <td className="px-3 py-2">{row.productivityTrend || 'Stable'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionWrapper>

        {loading ? (
          <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
            <div className="rounded-lg bg-white dark:bg-gray-900 px-5 py-3 border border-orange-200 dark:border-orange-900/40">Loading staff analytics...</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
