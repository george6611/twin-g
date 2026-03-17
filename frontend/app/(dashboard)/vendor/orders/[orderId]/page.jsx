"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  Star,
  Edit3,
  Ban,
  ChevronRight,
} from 'lucide-react';

import useAuth from '../../../../hooks/useAuth';
import { OrdersAPI } from '../../../../lib/api/orders';
import { VendorsAPI } from '../../../../lib/api/vendors';

import DashboardLayout from '../../../../layouts/dashboard';
import SectionWrapper from '../../../../components/dashboard/SectionWrapper';
import StatsCard from '../../../../components/dashboard/StatsCard';
import Table from '../../../../components/dashboard/Table';
import ActivityFeed from '../../../../components/dashboard/ActivityFeed';
import QuickActionPanel from '../../../../components/dashboard/QuickActionPanel';
import Timeline from '../../../../components/dashboard/Timeline';

import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Alert from '../../../../components/ui/Alert';
import Toast from '../../../../components/ui/Toast';
import TextArea from '../../../../components/ui/TextArea';
import Divider from '../../../../components/ui/Divider';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';

import UpdateStatusModal from '../UpdateStatusModal';
import FollowUpModal from '../FollowUpModal';

function getOrderId(order) {
  return order?.id || order?._id;
}

function getAssignedBranchId(user) {
  return (
    user?.branchId ||
    user?.assignedBranchId ||
    user?.branch?.id ||
    user?.branch?._id ||
    null
  );
}

export default function VendorOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { orderId } = params || {};

  const { user, loading: authLoading, isVendor, isVendorStaff } = useAuth();

  const [order, setOrder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [toast, setToast] = useState({ open: false, type: 'info', message: '' });

  const role = user?.role;
  const vendorId = user?.vendorId || user?.vendorIds?.[0] || null;
  const assignedBranchId = getAssignedBranchId(user);

  const isStaff = isVendorStaff() || role === 'vendor_staff';
  const isMainVendor = (isVendor() || role === 'vendor_main' || role === 'vendor') && !isStaff;

  const canUpdateStatus = isMainVendor || isStaff;
  const canCancel = isMainVendor;
  const canReassign = isMainVendor;
  const canAddNote = isMainVendor || isStaff;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user && !isVendor() && !isVendorStaff() && role !== 'vendor_main') {
      router.push('/dashboard');
    }
  }, [authLoading, user, isVendor, isVendorStaff, role, router]);

  const fetchOrderDetails = useCallback(async () => {
    if (!vendorId || !orderId) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    setNotFound(false);

    try {
      const orderResp = await OrdersAPI.getVendorOrderById(vendorId, orderId);

      if (!orderResp.success) {
        if (orderResp.status === 401) {
          router.push('/login');
          return;
        }
        if (orderResp.status === 403) {
          setForbidden(true);
          return;
        }
        if (orderResp.status === 404) {
          setNotFound(true);
          return;
        }
        throw new Error(orderResp.error || 'Unable to fetch order');
      }

      const fetchedOrder = orderResp.data;

      if (isStaff && assignedBranchId && fetchedOrder?.branchId !== assignedBranchId) {
        setForbidden(true);
        return;
      }

      setOrder(fetchedOrder);

      const [timelineResp, auditResp] = await Promise.all([
        OrdersAPI.getOrderTimeline(orderId),
        OrdersAPI.getOrderAudit(orderId),
      ]);

      if (timelineResp?.success) {
        setTimeline(Array.isArray(timelineResp.data) ? timelineResp.data : []);
      }
      if (auditResp?.success) {
        setAudit(Array.isArray(auditResp.data) ? auditResp.data : []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load order details');
    } finally {
      setLoading(false);
    }
  }, [vendorId, orderId, isStaff, assignedBranchId, router]);

  useEffect(() => {
    if (!authLoading && vendorId && orderId) {
      fetchOrderDetails();
    }
  }, [authLoading, vendorId, orderId, fetchOrderDetails]);

  const handleCancelOrder = useCallback(async () => {
    if (!canCancel || !orderId) return;

    setCancelSubmitting(true);
    try {
      const res = await OrdersAPI.updateOrderStatus(orderId, 'cancelled');
      if (!res.success) {
        if (res.status === 403) {
          setToast({ open: true, type: 'error', message: 'Backend denied cancellation.' });
          return;
        }
        throw new Error(res.error || 'Unable to cancel order');
      }

      setToast({ open: true, type: 'success', message: 'Order cancelled successfully.' });
      setCancelDialogOpen(false);
      fetchOrderDetails();
    } catch (err) {
      setToast({ open: true, type: 'error', message: err.message });
    } finally {
      setCancelSubmitting(false);
    }
  }, [canCancel, orderId, fetchOrderDetails]);

  const orderItems = useMemo(() => {
    return (order?.items || []).map((item, idx) => ({
      ...item,
      id: item.id || item._id || `item-${idx}`,
      subtotal: (Number(item.price || 0) * Number(item.quantity || 1)),
    }));
  }, [order]);

  const itemsTable = useMemo(() => {
    return [
      { key: 'name', title: 'Item Name' },
      { key: 'sku', title: 'SKU' },
      { key: 'quantity', title: 'Quantity', render: (r) => <span className="text-center">{r.quantity}</span> },
      { key: 'price', title: 'Unit Price', render: (r) => <span>${(r.price || 0).toFixed(2)}</span> },
      { key: 'subtotal', title: 'Subtotal', render: (r) => <span className="font-semibold">${r.subtotal.toFixed(2)}</span> },
    ];
  }, []);

  const quickActions = useMemo(() => {
    const actions = [];

    if (canUpdateStatus) {
      actions.push({
        key: 'status',
        label: 'Update Status',
        icon: <Edit3 className="w-4 h-4" />,
        onClick: () => setStatusModalOpen(true),
        className: 'bg-orange-600 text-white hover:bg-orange-700',
      });
    }

    if (canAddNote) {
      actions.push({
        key: 'followup',
        label: 'Add Note',
        icon: <FileText className="w-4 h-4" />,
        onClick: () => setFollowUpModalOpen(true),
        className: 'bg-amber-600 text-white hover:bg-amber-700',
      });
    }

    if (canCancel) {
      actions.push({
        key: 'cancel',
        label: 'Cancel Order',
        icon: <Ban className="w-4 h-4" />,
        onClick: () => setCancelDialogOpen(true),
        className: 'bg-red-600 text-white hover:bg-red-700',
        disabled: order?.status === 'cancelled' || order?.status === 'delivered',
      });
    }

    actions.push({
      key: 'print',
      label: 'Print Invoice',
      icon: <Printer className="w-4 h-4" />,
      onClick: () => setToast({ open: true, type: 'info', message: 'Print invoice feature coming soon.' }),
      className: 'bg-gray-600 text-white hover:bg-gray-700',
      disabled: true,
    });

    if (isMainVendor) {
      actions.push({
        key: 'priority',
        label: 'Mark Priority',
        icon: <Star className="w-4 h-4" />,
        onClick: () => setToast({ open: true, type: 'info', message: 'Priority marking feature coming soon.' }),
        className: 'bg-orange-200 text-orange-800 hover:bg-orange-300',
        disabled: true,
      });
    }

    return actions;
  }, [canUpdateStatus, canAddNote, canCancel, isMainVendor, order?.status]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-600" />
          <span>Loading order details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert
            variant="error"
            title="Order Not Found"
            message={`Order #${orderId} could not be found.`}
            action={
              <Button onClick={() => router.back()} className="bg-gray-600 hover:bg-gray-700">
                Go Back
              </Button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  if (forbidden) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert
            variant="error"
            title="Access Denied"
            message="You don't have permission to view this order. Check your vendor and branch scope."
            action={
              <Button onClick={() => router.back()} className="bg-gray-600 hover:bg-gray-700">
                Go Back
              </Button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert
            variant="error"
            title="Error Loading Order"
            message={error}
            action={
              <Button onClick={() => fetchOrderDetails()} className="bg-gray-600 hover:bg-gray-700">
                Retry
              </Button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="p-6 text-gray-500">No order data available.</div>
      </DashboardLayout>
    );
  }

  const customerName = order.customerName || order.customer?.name || 'Unknown';
  const customerPhone = order.customerPhone || order.customer?.phone || 'N/A';
  const customerEmail = order.customer?.email || 'N/A';
  const deliveryAddress = order.deliveryAddress || order.customer?.address || 'N/A';
  const branchName = order.branchName || order.branch?.name || order.branch || 'N/A';
  const paymentStatus = (order.paymentStatus || order.payment?.status || 'unpaid').toLowerCase();
  const orderStatus = (order.status || 'pending').toLowerCase();

  return (
    <DashboardLayout>
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Hero Summary Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-orange-100">Order #{getOrderId(order)}</h1>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                {branchName} • {customerName}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge text={String(orderStatus).replace(/_/g, ' ')} tone={orderStatus} className="capitalize" />
              <Badge text={paymentStatus} tone={paymentStatus} className="capitalize" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Created</p>
              <p className="text-sm text-orange-900 dark:text-orange-100">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Total Amount</p>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">${(order.total || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Delivery Method</p>
              <p className="text-sm text-orange-900 dark:text-orange-100">{order.deliveryMethod || 'Standard'}</p>
            </div>
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Est. Delivery</p>
              <p className="text-sm text-orange-900 dark:text-orange-100">
                {order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleDateString() : 'TBD'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActionPanel actions={quickActions} stickyMobile={true} />

        {/* Customer Information Card */}
        <SectionWrapper title="Customer Information" subtitle="Contact & delivery details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Full Name</p>
                <p className="text-gray-900 dark:text-gray-100">{customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </p>
                <p className="text-gray-900 dark:text-gray-100">{customerPhone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Email</p>
                <p className="text-gray-900 dark:text-gray-100">{customerEmail}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Delivery Address
                </p>
                <p className="text-gray-900 dark:text-gray-100">{deliveryAddress}</p>
              </div>
              {order.specialInstructions ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Special Instructions</p>
                  <p className="text-gray-900 dark:text-gray-100">{order.specialInstructions}</p>
                </div>
              ) : null}
            </div>
          </div>
        </SectionWrapper>

        {/* Order Items Section */}
        <SectionWrapper title="Order Items" subtitle="Products and quantities">
          <div className="overflow-x-auto">
            <Table columns={itemsTable} data={orderItems} />
          </div>

          <Divider className="my-4" />

          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">${(order.subtotal || order.total || 0).toFixed(2)}</span>
            </div>
            {order.deliveryFee ? (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">${(order.deliveryFee || 0).toFixed(2)}</span>
              </div>
            ) : null}
            {order.discount ? (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span className="font-medium">-${(order.discount || 0).toFixed(2)}</span>
              </div>
            ) : null}
            {order.tax ? (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">${(order.tax || 0).toFixed(2)}</span>
              </div>
            ) : null}
            <Divider className="my-2" />
            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-900 dark:text-gray-100">Grand Total</span>
              <span className="font-bold text-orange-600">${(order.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </SectionWrapper>

        {/* Order Timeline / Activity Log */}
        <SectionWrapper title="Order Timeline" subtitle="Chronological activity">
          {timeline.length > 0 ? <Timeline events={timeline} /> : <p className="text-sm text-gray-500">No timeline events yet.</p>}
        </SectionWrapper>

        {/* Activity Feed (Follow-up Notes) */}
        <SectionWrapper title="Activity & Follow-up Notes" subtitle="Internal notes and updates">
          {audit.length > 0 ? <ActivityFeed entries={audit} /> : <p className="text-sm text-gray-500">No activity notes yet.</p>}
        </SectionWrapper>
      </div>

      {/* Modals */}
      <UpdateStatusModal
        isOpen={statusModalOpen}
        order={order}
        onClose={() => setStatusModalOpen(false)}
        onUpdated={() => {
          setStatusModalOpen(false);
          setToast({ open: true, type: 'success', message: 'Order status updated.' });
          fetchOrderDetails();
        }}
      />

      <FollowUpModal
        isOpen={followUpModalOpen}
        order={order}
        onClose={() => setFollowUpModalOpen(false)}
        onAdded={() => {
          setFollowUpModalOpen(false);
          setToast({ open: true, type: 'success', message: 'Note added successfully.' });
          fetchOrderDetails();
        }}
      />

      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelOrder}
        loading={cancelSubmitting}
        danger={true}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
      />
    </DashboardLayout>
  );
}
