'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import { AnalyticsAPI } from '../../../lib/api/analytics';
import { BranchesAPI } from '../../../lib/api/branches';
import SectionWrapper from '../../../components/dashboard/SectionWrapper';
import StatsCard from '../../../components/dashboard/StatsCard';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import DatePicker from '../../../components/ui/DatePicker';
import Alert from '../../../components/ui/Alert';
import Toast from '../../../components/ui/Toast';
import Badge from '../../../components/ui/Badge';
import {
  buildScopedFilters,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  getDatePresetBounds,
  getDefaultFilters,
  normalizeApiData,
  QUICK_RANGES,
  resolveAuthFlags,
  statusTone,
  toArray,
} from './shared';

function RevenueLineChart({ series = [], granularity = 'daily' }) {
  const safeSeries = Array.isArray(series) ? series.slice(-24) : [];

  const points = safeSeries.map((item, index) => ({
    x: safeSeries.length <= 1 ? 0 : (index / (safeSeries.length - 1)) * 100,
    y: 100 - Math.min(100, Math.max(0, Number(item?.value || 0))),
    raw: Number(item?.raw || item?.value || 0),
    label: item?.label || item?.date || `P${index + 1}`,
  }));

  const maxRaw = Math.max(...points.map(point => point.raw), 1);
  const normalized = points.map(point => ({
    ...point,
    y: 100 - (point.raw / maxRaw) * 100,
  }));

  const d = normalized
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ');

  return (
    <div className="rounded-lg border border-orange-100 dark:border-orange-900/30 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Revenue over time</h3>
        <Badge text={granularity === 'weekly' ? 'Weekly' : 'Daily'} tone="unpaid" />
      </div>

      <div className="h-64 w-full rounded bg-gradient-to-b from-orange-50/70 to-transparent dark:from-orange-900/10 dark:to-transparent p-3">
        {normalized.length > 1 ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <path d={d} fill="none" stroke="currentColor" className="text-orange-600" strokeWidth="2" />
          </svg>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Not enough data points for chart
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDonutChart({ distribution = [] }) {
  const total = distribution.reduce((sum, item) => sum + Number(item?.count || 0), 0);

  return (
    <div className="rounded-lg border border-orange-100 dark:border-orange-900/30 bg-white dark:bg-gray-900 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Orders status distribution</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 rounded-full border-8 border-orange-200 dark:border-orange-900/40 flex items-center justify-center text-center">
          <div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatNumber(total)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total tracked orders</div>
          </div>
        </div>

        <div className="space-y-2">
          {distribution.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Badge text={item.status} tone={statusTone(item.status)} />
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {formatNumber(item.count)}
              </div>
            </div>
          ))}
          {distribution.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">No status data available for this range.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorAnalyticsOverviewPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isVendor,
    isVendorStaff,
    userRole,
    vendorId: loggedInVendorId,
    assignedBranchId,
  } = useAuth();

  const { isMainVendor, isStaff, vendorFlag } = resolveAuthFlags({
    isVendor,
    isVendorStaff,
    userRole,
  });

  const [filters, setFilters] = useState(getDefaultFilters(assignedBranchId));
  const [branches, setBranches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [branchStats, setBranchStats] = useState([]);
  const [staffStats, setStaffStats] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);
  const [toast, setToast] = useState(null);


  useEffect(() => {
    if (isMainVendor && !filters.branchId) {
      setFilters((prev) => ({ ...prev, branchId: 'all' }));
    }

    if (!isMainVendor && assignedBranchId) {
      setFilters((prev) => ({ ...prev, branchId: assignedBranchId }));
    }
  }, [isMainVendor, assignedBranchId, filters.branchId]);

  const scopedFilters = useMemo(
    () => buildScopedFilters(filters, { isMainVendor, assignedBranchId }),
    [filters, isMainVendor, assignedBranchId]
  );

  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated || !loggedInVendorId || !vendorFlag) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [summaryResult, revenueResult, statusResult, branchResult, staffResult] = await Promise.all([
        AnalyticsAPI.getVendorSummary(loggedInVendorId, scopedFilters, {
          isMainVendor,
          assignedBranchId,
        }),
        AnalyticsAPI.getRevenueTrend(loggedInVendorId, scopedFilters, {
          isMainVendor,
          assignedBranchId,
        }),
        AnalyticsAPI.getStatusDistribution(loggedInVendorId, scopedFilters, {
          isMainVendor,
          assignedBranchId,
        }),
        AnalyticsAPI.getBranchPerformance(loggedInVendorId, scopedFilters, {
          isMainVendor,
          assignedBranchId,
        }),
        AnalyticsAPI.getStaffActivity(loggedInVendorId, scopedFilters, {
          isMainVendor,
          assignedBranchId,
        }),
      ]);

      const firstFail = [summaryResult, revenueResult, statusResult, branchResult, staffResult].find(
        (item) => item?.status === 401 || item?.status === 403
      );

      if (firstFail?.status === 401) {
        router.push('/login');
        return;
      }

      if (firstFail?.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      const summaryData = normalizeApiData(summaryResult, {});
      const revenueData = normalizeApiData(revenueResult, []);
      const statusData = normalizeApiData(statusResult, []);
      const branchData = normalizeApiData(branchResult, []);
      const staffData = normalizeApiData(staffResult, []);

      setSummary(summaryData || {});
      setRevenueSeries(toArray(revenueData).map((item) => ({
        ...item,
        raw: Number(item.revenue ?? item.value ?? 0),
        value: Number(item.revenue ?? item.value ?? 0),
        label: item.label || item.date,
      })));
      setStatusDistribution(toArray(statusData));
      setBranchStats(toArray(branchData));
      setStaffStats(toArray(staffData));

      if (!summaryResult?.success && !revenueResult?.success) {
        setError('Could not load analytics at the moment.');
      }
    } catch (fetchError) {
      setError(fetchError?.message || 'Failed to fetch analytics overview.');
    } finally {
      setLoading(false);
    }
  }, [
    isAuthenticated,
    loggedInVendorId,
    vendorFlag,
    scopedFilters,
    isMainVendor,
    assignedBranchId,
    router,
  ]);

  const fetchBranches = useCallback(async () => {
    if (!isMainVendor || !loggedInVendorId) return;

    try {
      const result = await BranchesAPI.getBranches(loggedInVendorId, {
        page: 1,
        limit: 100,
        status: 'active',
      });

      if (!result?.success) return;
      const branchList = toArray(result.data?.data || result.data);
      setBranches(branchList);
    } catch {
      setBranches([]);
    }
  }, [isMainVendor, loggedInVendorId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleRangeChange = (nextRange) => {
    const bounds = getDatePresetBounds(nextRange);
    setFilters((prev) => ({
      ...prev,
      dateRange: nextRange,
      startDate: nextRange === 'custom' ? prev.startDate : bounds.startDate,
      endDate: nextRange === 'custom' ? prev.endDate : bounds.endDate,
      page: 1,
    }));
  };

  const handleFilterValue = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const summaryCards = useMemo(() => {
    const data = summary || {};

    return [
      { title: 'Total Orders', value: formatNumber(data.totalOrders) },
      { title: 'Total Revenue', value: formatCurrency(data.totalRevenue) },
      { title: 'Completed Orders', value: formatNumber(data.completedOrders) },
      { title: 'Cancelled Orders', value: formatNumber(data.cancelledOrders) },
      { title: 'Avg. Order Value', value: formatCurrency(data.averageOrderValue) },
      { title: 'Top Performing Branch', value: data.topBranchName || '—' },
      { title: 'Most Active Staff', value: data.mostActiveStaffName || '—' },
    ];
  }, [summary]);

  const visibleBranchRows = useMemo(() => branchStats.slice(0, 8), [branchStats]);
  const visibleStaffRows = useMemo(() => staffStats.slice(0, 8), [staffStats]);

  if (!isAuthenticated) {
    return null;
  }

  if (forbidden) {
    return (
      <>
        <div className="p-4 md:p-6">
          <Alert
            variant="warning"
            title="Access denied"
            message="This analytics dashboard is available only to vendor users with valid scope."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-900 p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Vendor Analytics Overview</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isMainVendor
                  ? 'Cross-branch performance intelligence with secure vendor scoping.'
                  : 'Branch-scoped analytics view for your assigned operations.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="!bg-orange-600 hover:!bg-orange-700 text-white" onClick={fetchAnalytics}>Refresh</Button>
              <Link
                href="/vendor/analytics/orders"
                className="rounded-md border border-orange-200 dark:border-orange-900/40 px-3 py-2 text-sm text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              >
                Deep analytics
              </Link>
            </div>
          </div>
        </div>

        <SectionWrapper title="KPI Summary" subtitle="Operational and revenue snapshot for selected scope">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <StatsCard
                key={card.title}
                title={card.title}
                value={card.value}
                accent="orange"
                className="ring-1 ring-orange-100 dark:ring-orange-900/30"
              />
            ))}
          </div>
        </SectionWrapper>

        <SectionWrapper title="Analytics Modules" subtitle="Drill down into focused datasets">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { href: '/vendor/analytics/orders', title: 'Orders Analytics', text: 'Volume, SLA, cancellations, peak hours' },
              { href: '/vendor/analytics/revenue', title: 'Revenue Analytics', text: 'Revenue streams and payment mix' },
              { href: '/vendor/analytics/branches', title: 'Branch Analytics', text: 'Branch ranking and operational speed' },
              { href: '/vendor/analytics/staff', title: 'Staff Analytics', text: 'Productivity, response time, activity' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-gray-900 p-4 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.text}</div>
              </Link>
            ))}
          </div>
        </SectionWrapper>

        <SectionWrapper title="Filters" subtitle="Date range and branch scope">
          <div className="md:hidden mb-3">
            <Button
              className="w-full !bg-orange-600 hover:!bg-orange-700 text-white"
              onClick={() => setFiltersOpenMobile((prev) => !prev)}
            >
              {filtersOpenMobile ? 'Hide filters' : 'Show filters'}
            </Button>
          </div>

          <div className={`${filtersOpenMobile ? 'block' : 'hidden'} md:block`}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Quick range</label>
                <Select
                  value={filters.dateRange}
                  onChange={(event) => handleRangeChange(event.target.value)}
                  options={QUICK_RANGES}
                  placeholder="Select range"
                  className="border-orange-200 dark:border-orange-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Start date</label>
                <DatePicker
                  value={filters.startDate}
                  onChange={(event) => handleFilterValue('startDate', event.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">End date</label>
                <DatePicker
                  value={filters.endDate}
                  onChange={(event) => handleFilterValue('endDate', event.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Revenue granularity</label>
                <Select
                  value={filters.granularity}
                  onChange={(event) => handleFilterValue('granularity', event.target.value)}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                  ]}
                  placeholder="Select granularity"
                />
              </div>

              {isMainVendor ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Branch</label>
                  <Select
                    value={filters.branchId}
                    onChange={(event) => handleFilterValue('branchId', event.target.value)}
                    options={[
                      { value: 'all', label: 'All branches' },
                      ...branches.map((branch) => ({
                        value: branch.id || branch._id,
                        label: branch.name || branch.branchName || 'Unnamed branch',
                      })),
                    ]}
                    placeholder="Select branch"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-orange-200 dark:border-orange-900/30 bg-orange-50/70 dark:bg-orange-900/10 p-3">
                  <div className="text-xs text-orange-800 dark:text-orange-300 font-medium">Branch scope</div>
                  <div className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                    Staff analytics are restricted to your assigned branch.
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionWrapper>

        {error ? (
          <Alert
            variant="error"
            title="Analytics unavailable"
            message={error}
            action={<Button className="!bg-orange-600 hover:!bg-orange-700 text-white" onClick={fetchAnalytics}>Retry</Button>}
          />
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RevenueLineChart series={revenueSeries} granularity={filters.granularity} />
          <StatusDonutChart distribution={statusDistribution} />
        </div>

        <SectionWrapper title="Branch Performance Snapshot" subtitle="Top branch metrics in selected scope">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-orange-100 dark:bg-orange-900/30 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">Branch Name</th>
                  <th className="px-3 py-2 text-left">Orders</th>
                  <th className="px-3 py-2 text-left">Revenue</th>
                  <th className="px-3 py-2 text-left">Completion Rate</th>
                  <th className="px-3 py-2 text-left">Cancellation Rate</th>
                  <th className="px-3 py-2 text-left">Avg Delivery Time</th>
                </tr>
              </thead>
              <tbody>
                {visibleBranchRows.map((row) => (
                  <tr
                    key={row.branchId || row.id || row._id || row.branchName}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 cursor-pointer"
                    onClick={() => router.push('/vendor/analytics/branches')}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.branchName || row.name || '—'}</td>
                    <td className="px-3 py-2">{formatNumber(row.ordersCount)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.revenue)}</td>
                    <td className="px-3 py-2">{formatPercent(row.completionRate)}</td>
                    <td className="px-3 py-2">{formatPercent(row.cancellationRate)}</td>
                    <td className="px-3 py-2">{row.avgDeliveryTime || '—'}</td>
                  </tr>
                ))}

                {visibleBranchRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                      No branch performance data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <Link href="/vendor/analytics/branches" className="text-sm text-orange-700 dark:text-orange-300 hover:underline">
              View branch analytics →
            </Link>
          </div>
        </SectionWrapper>

        <SectionWrapper title="Staff Activity Snapshot" subtitle="Recent productivity indicators">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-orange-100 dark:bg-orange-900/30 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">Staff Name</th>
                  <th className="px-3 py-2 text-left">Orders Processed</th>
                  <th className="px-3 py-2 text-left">Status Updates</th>
                  <th className="px-3 py-2 text-left">Cancellations</th>
                  <th className="px-3 py-2 text-left">Last Active</th>
                  <th className="px-3 py-2 text-left">Performance Score (Future)</th>
                </tr>
              </thead>
              <tbody>
                {visibleStaffRows.map((row) => (
                  <tr
                    key={row.staffId || row.id || row._id || row.staffName}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 cursor-pointer"
                    onClick={() => router.push('/vendor/analytics/staff')}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.staffName || row.name || '—'}</td>
                    <td className="px-3 py-2">{formatNumber(row.ordersProcessed)}</td>
                    <td className="px-3 py-2">{formatNumber(row.statusUpdatesMade)}</td>
                    <td className="px-3 py-2">{formatNumber(row.cancellations)}</td>
                    <td className="px-3 py-2">{formatDateTime(row.lastActive)}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">Coming soon</td>
                  </tr>
                ))}

                {visibleStaffRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                      No staff activity data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <Link href="/vendor/analytics/staff" className="text-sm text-orange-700 dark:text-orange-300 hover:underline">
              View staff analytics →
            </Link>
          </div>
        </SectionWrapper>

        <SectionWrapper title="Future-ready Analytics" subtitle="Predictive and real-time roadmap">
          <div className="rounded-lg border border-orange-200 dark:border-orange-900/30 bg-orange-50/60 dark:bg-orange-900/10 p-4 text-sm text-gray-700 dark:text-gray-200">
            <p>
              This module is structured for predictive forecasting, anomaly detection, SLA breach alerts, heatmaps, and
              benchmark scoring. API placeholders are already available in <code>AnalyticsAPI.getPredictiveAnalytics</code>
              for staged backend rollout.
            </p>
          </div>
        </SectionWrapper>

        {loading ? (
          <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
            <div className="rounded-lg bg-white dark:bg-gray-900 px-5 py-3 shadow-lg border border-orange-200 dark:border-orange-900/40 text-sm text-gray-700 dark:text-gray-200">
              Loading analytics...
            </div>
          </div>
        ) : null}
      </div>

      <Toast
        open={!!toast}
        type={toast?.type || 'info'}
        message={toast?.message}
        onClose={() => setToast(null)}
      />
    </>
  );
}
