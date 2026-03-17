'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import DashboardLayout from '@/layouts/dashboard';
import { BranchesAPI } from '@/lib/api/branches';
import { OrdersAPI } from '@/lib/api/orders';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Toast from '@/components/ui/Toast';
import Divider from '@/components/ui/Divider';
import SectionWrapper from '@/components/dashboard/SectionWrapper';
import StatsCard from '@/components/dashboard/StatsCard';
import Table from '@/components/dashboard/Table';
import Timeline from '@/components/dashboard/Timeline';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import QuickActionPanel from '@/components/dashboard/QuickActionPanel';

export default function BranchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.branchId;

  const {
    isAuthenticated,
    authLoading,
    isVendor,
    isVendorStaff,
    userRole,
    vendorId: loggedInVendorId,
    assignedBranchId,
  } = useAuth();

  // ====== STATE ======
  const [branch, setBranch] = useState(null);
  const [stats, setStats] = useState(null);
  const [staff, setStaff] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState(null);

  // ====== PERMISSION CHECKS ======
  const isMainVendor = (isVendor && !isVendorStaff) || userRole === 'vendor_main';
  const isStaff = isVendorStaff || userRole === 'vendor_staff';

  // ====== REDIRECT IF NOT AUTHENTICATED ======
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ====== FETCH BRANCH DETAILS ======
  useEffect(() => {
    if (authLoading || !isAuthenticated || !loggedInVendorId || !branchId) {
      setLoading(false);
      return;
    }

    const fetchBranchDetails = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setForbidden(false);

      try {
        // Fetch branch details
        const branchResult = await BranchesAPI.getBranchById(loggedInVendorId, branchId);

        if (branchResult.status === 401) {
          router.push('/login');
          return;
        }

        if (branchResult.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        if (branchResult.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!branchResult.success) {
          setError(branchResult.error || 'Failed to load branch details');
          setLoading(false);
          return;
        }

        const branchData = branchResult.data;

        // ====== BRANCH SCOPE CHECK (for staff) ======
        if (isStaff && assignedBranchId !== branchData._id) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        setBranch(branchData);

        // Fetch stats in parallel
        const [statsResult, staffResult, ordersResult, activityResult] = await Promise.all([
          BranchesAPI.getBranchStats(loggedInVendorId, branchId),
          BranchesAPI.getBranchStaff(loggedInVendorId, branchId),
          BranchesAPI.getBranchOrders(loggedInVendorId, branchId, { limit: 10 }),
          BranchesAPI.getBranchActivity(loggedInVendorId, branchId, { limit: 20 }),
        ]);

        console.log("📦 [BRANCH DETAILS] Staff result:", staffResult);

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }

        if (staffResult.success && staffResult.data) {
          console.log("📦 [BRANCH DETAILS] Setting staff:", staffResult.data);
          setStaff(Array.isArray(staffResult.data) ? staffResult.data : []);
        }

        if (ordersResult.success && ordersResult.data) {
          const ordersArray = Array.isArray(ordersResult.data) ? ordersResult.data : [];
          setOrders(ordersArray);
        }

        if (activityResult.success && activityResult.data) {
          const activityArray = Array.isArray(activityResult.data) ? activityResult.data : [];
          setActivity(activityArray);
        }
      } catch (err) {
        console.error('Fetch branch details error:', err);
        setError(err.message || 'Failed to load branch details');
      } finally {
        setLoading(false);
      }
    };

    fetchBranchDetails();
  }, [authLoading, isAuthenticated, loggedInVendorId, branchId, isStaff, assignedBranchId, router]);

  // ====== RENDER STATES ======
  if (authLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (forbidden) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <Alert
            variant="warning"
            title="Access Denied"
            message="You don't have permission to access this branch. Main vendors can access all branches, while staff can only access their assigned branch."
          />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <Alert
            variant="warning"
            title="Branch Not Found"
            message="The branch you're looking for doesn't exist or has been deleted."
            actionLabel="Back to Branches"
            onAction={() => router.push('/vendor/branches')}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading branch details...
            </span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <Alert
            variant="error"
            title="Error Loading Branch"
            message={error}
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (!branch) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <Alert
            variant="warning"
            title="No Data Available"
            message="Unable to load branch data."
          />
        </div>
      </DashboardLayout>
    );
  }

  // ====== MAIN RENDER ======
  const statusColor = branch.status === 'active' ? 'success' : 'secondary';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        {/* ====== HERO SECTION ====== */}
        <div className="mb-6 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800/30 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {branch.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {branch.location} • Created {new Date(branch.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={statusColor} text={branch.status === 'active' ? 'Active' : 'Inactive'} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="Today's Orders" value={stats?.ordersToday || 0} />
            <StatsCard label="This Week" value={stats?.ordersThisWeek || 0} />
            <StatsCard label="Completed" value={stats?.completedOrders || 0} />
            <StatsCard label="Pending" value={stats?.pendingOrders || 0} />
          </div>
        </div>

        {/* ====== BRANCH OVERVIEW ====== */}
        <SectionWrapper title="Branch Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Location
                </label>
                <p className="text-lg text-gray-900 dark:text-white mt-1">
                  {branch.location}
                </p>
              </div>
              {branch.address && (
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Address
                  </label>
                  <p className="text-lg text-gray-900 dark:text-white mt-1">
                    {branch.address}
                  </p>
                </div>
              )}
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Phone
                </label>
                <p className="text-lg text-gray-900 dark:text-white mt-1">
                  {branch.phone || '—'}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Email
                </label>
                <p className="text-lg text-gray-900 dark:text-white mt-1">
                  {branch.email || '—'}
                </p>
              </div>
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Branch Manager
                </label>
                <p className="text-lg text-gray-900 dark:text-white mt-1">
                  {branch.managerName || '—'}
                </p>
              </div>
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Status
                </label>
                <div className="mt-1">
                  <Badge variant={statusColor} text={branch.status === 'active' ? 'Active' : 'Inactive'} />
                </div>
              </div>
            </div>
          </div>

          {isMainVendor && (
            <div className="mt-6">
              <Button
                variant="outline"
                  onClick={() => router.push(`/vendor/branches`)}
              >
                Back to Branches
              </Button>
            </div>
          )}
        </SectionWrapper>

        {/* ====== PERFORMANCE STATS ====== */}
        <SectionWrapper title="Performance Stats">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="Total Revenue" value={`$${(stats?.totalRevenue || 0).toLocaleString()}`} />
            <StatsCard label="Staff Count" value={stats?.staffCount || 0} />
            <StatsCard label="Low Stock Items" value={stats?.lowStockItems || 0} />
            <StatsCard label="Active Orders" value={stats?.activeOrders || 0} />
          </div>
        </SectionWrapper>

        {/* ====== BRANCH STAFF SECTION ====== */}
        <SectionWrapper title="Branch Staff">
          {staff.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Last Login</th>
                    {isMainVendor && <th className="pb-3 px-4">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member, idx) => (
                    <tr
                      key={member._id || idx}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{member.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" text={member.role || 'Staff'} />
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={member.status === 'active' ? 'success' : 'secondary'}
                          text={member.status === 'active' ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {member.lastLogin
                          ? new Date(member.lastLogin).toLocaleDateString()
                          : '—'}
                      </td>
                      {isMainVendor && (
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                            >
                              Deactivate
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No staff members assigned to this branch.
            </div>
          )}
        </SectionWrapper>

        {/* ====== BRANCH ORDERS ====== */}
        <SectionWrapper title="Recent Orders">
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <th className="pb-3 px-4">Order ID</th>
                    <th className="pb-3 px-4">Customer</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Amount</th>
                    <th className="pb-3 px-4">Created</th>
                    <th className="pb-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr
                      key={order._id || idx}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 font-mono text-sm text-gray-900 dark:text-white">
                        {order.orderNumber || order._id?.slice(-6)}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {order.customerName || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={order.status === 'delivered' ? 'success' : 'warning'}
                          text={order.status || 'Pending'}
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-orange-600 dark:text-orange-400">
                        ${order.totalAmount?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            router.push(`/dashboard/vendor/orders/${order._id}`)
                          }
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No orders for this branch yet.
            </div>
          )}
        </SectionWrapper>

        {/* ====== BRANCH ACTIVITY TIMELINE ====== */}
        <SectionWrapper title="Activity Timeline">
          {activity.length > 0 ? (
            <ActivityFeed entries={activity} />
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No activity yet.
            </div>
          )}
        </SectionWrapper>

        {/* ====== TOAST ====== */}
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
