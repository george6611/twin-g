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
  formatNumber,
  formatPercent,
  getDatePresetBounds,
  getDefaultFilters,
  normalizeApiData,
  QUICK_RANGES,
  resolveAuthFlags,
  toArray,
} from '../shared';

function MiniBars({ data = [] }) {
  const max = Math.max(...data.map((d) => Number(d?.value || 0)), 1);

  return (
    <div className="h-48 flex items-end gap-2 p-3 rounded border border-orange-100 dark:border-orange-900/30 bg-white dark:bg-gray-900 overflow-x-auto">
      {data.map((item, index) => (
        <div key={`${item.label || index}`} className="min-w-[26px] flex flex-col items-center gap-1">
          <div
            className="w-full bg-orange-500 rounded-t"
            style={{ height: `${(Number(item.value || 0) / max) * 140}px` }}
          />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label || index + 1}</span>
        </div>
      ))}
      {data.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No chart data.</div>}
    </div>
  );
}

export default function VendorOrdersAnalyticsPage() {
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
  const [volumeSeries, setVolumeSeries] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [slaPerformance, setSlaPerformance] = useState([]);
  const [cancellationReasons, setCancellationReasons] = useState([]);
  const [deliveryDistribution, setDeliveryDistribution] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);


  const scopedFilters = useMemo(
    () => buildScopedFilters(filters, { isMainVendor, assignedBranchId }),
    [filters, isMainVendor, assignedBranchId]
  );

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !loggedInVendorId || !vendorFlag) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const result = await AnalyticsAPI.getOrderAnalytics(loggedInVendorId, scopedFilters, {
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
      setError(result?.error || 'Failed to load orders analytics.');
      setLoading(false);
      return;
    }

    const data = normalizeApiData(result, {});

    setStats(data?.summary || {});
    setVolumeSeries(toArray(data?.ordersVolume));
    setTransitions(toArray(data?.statusTransitions));
    setSlaPerformance(toArray(data?.slaPerformance));
    setCancellationReasons(toArray(data?.cancellationReasons));
    setDeliveryDistribution(toArray(data?.deliveryTimeDistribution));
    setPeakHours(toArray(data?.peakHours));

    setLoading(false);
  }, [isAuthenticated, loggedInVendorId, vendorFlag, scopedFilters, isMainVendor, assignedBranchId, router]);

  const fetchBranches = useCallback(async () => {
    if (!isMainVendor || !loggedInVendorId) return;
    const result = await BranchesAPI.getBranches(loggedInVendorId, { page: 1, limit: 100 });
    if (!result?.success) return;
    setBranches(toArray(result?.data?.data || result?.data));
  }, [isMainVendor, loggedInVendorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const onExportCsv = async () => {
    const result = await AnalyticsAPI.exportOrdersCSV(loggedInVendorId, scopedFilters, {
      isMainVendor,
      assignedBranchId,
    });

    if (!result?.success) {
      setError('CSV export failed. Please try again.');
      return;
    }

    const csvPayload = typeof result.data === 'string'
      ? result.data
      : result.data?.csv || 'No data';

    const blob = new Blob([csvPayload], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) return null;

  if (forbidden) {
    return (
      <>
        <div className="p-4 md:p-6">
          <Alert variant="warning" title="Access denied" message="Vendor analytics access is restricted." />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div className="rounded-lg border border-orange-200 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-900/10 p-4 md:p-6 flex flex-col md:flex-row justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders Analytics</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Volume trends, status transitions, SLA and delivery intelligence.</p>
          </div>
          <div className="flex gap-2">
            <Button className="!bg-orange-600 hover:!bg-orange-700 text-white" onClick={fetchData}>Refresh</Button>
            <Button className="!bg-orange-600 hover:!bg-orange-700 text-white" onClick={onExportCsv}>Export CSV</Button>
            <Link href="/vendor/analytics" className="px-3 py-2 rounded border border-orange-200 text-orange-700 dark:text-orange-300">Overview</Link>
          </div>
        </div>

        <SectionWrapper title="Filters" subtitle="Date and branch scope">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <Select
              value={filters.dateRange}
              onChange={(event) => setRange(event.target.value)}
              options={QUICK_RANGES}
              placeholder="Quick range"
            />
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
            <StatsCard title="Total Orders" value={formatNumber(stats.totalOrders)} accent="orange" />
            <StatsCard title="SLA Met Rate" value={formatPercent(stats.slaMetRate)} accent="orange" />
            <StatsCard title="Avg Delivery Time" value={stats.avgDeliveryTime || '—'} accent="orange" />
            <StatsCard title="Cancellation Rate" value={formatPercent(stats.cancellationRate)} accent="orange" />
          </div>
        </SectionWrapper>

        <SectionWrapper title="Orders Volume Over Time">
          <MiniBars data={volumeSeries.slice(-24).map((item) => ({ label: item.label || item.date, value: item.value || item.count || 0 }))} />
        </SectionWrapper>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionWrapper title="Status Transitions">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-orange-100 dark:bg-orange-900/30">
                  <tr>
                    <th className="text-left px-3 py-2">From</th>
                    <th className="text-left px-3 py-2">To</th>
                    <th className="text-left px-3 py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {transitions.map((row, index) => (
                    <tr key={`${row.from}-${row.to}-${index}`} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{row.from || '—'}</td>
                      <td className="px-3 py-2">{row.to || '—'}</td>
                      <td className="px-3 py-2">{formatNumber(row.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionWrapper>

          <SectionWrapper title="SLA Performance">
            <div className="space-y-2">
              {slaPerformance.map((item) => (
                <div key={item.metric || item.label} className="rounded border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.metric || item.label}</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </SectionWrapper>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionWrapper title="Cancellation Reasons">
            <div className="space-y-2">
              {cancellationReasons.map((item, index) => (
                <div key={`${item.reason}-${index}`} className="rounded border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.reason || 'Unknown reason'}</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Delivery Time Distribution">
            <MiniBars data={deliveryDistribution.map((item) => ({ label: item.bucket || item.label, value: item.count || item.value }))} />
          </SectionWrapper>
        </div>

        <SectionWrapper title="Peak Hours Analysis">
          <MiniBars data={peakHours.map((item) => ({ label: item.hour || item.label, value: item.orders || item.value }))} />
        </SectionWrapper>

        {loading ? (
          <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
            <div className="rounded-lg bg-white dark:bg-gray-900 px-5 py-3 border border-orange-200 dark:border-orange-900/40">Loading orders analytics...</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
