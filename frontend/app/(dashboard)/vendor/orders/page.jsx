"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  FileDown,
  Ban,
} from "lucide-react";

import useAuth from "../../../hooks/useAuth";
import { OrdersAPI } from "../../../lib/api/orders";
import { VendorsAPI } from "../../../lib/api/vendors";

import SectionWrapper from "../../../components/dashboard/SectionWrapper";
import StatsCard from "../../../components/dashboard/StatsCard";
import Table from "../../../components/dashboard/Table";
import QuickActionButtons from "../../../components/dashboard/QuickActionButtons";

import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import DatePicker from "../../../components/ui/DatePicker";
import Badge from "../../../components/ui/Badge";
import Alert from "../../../components/ui/Alert";
import Toast from "../../../components/ui/Toast";

import UpdateStatusModal from "./UpdateStatusModal";
import FollowUpModal from "./FollowUpModal";

const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;

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

export default function VendorOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading, isVendor, isVendorStaff } = useAuth();

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    branchId: "",
    startDate: "",
    endDate: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: PAGE_SIZE,
  });

  const [searchInput, setSearchInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    today: 0,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });

  const role = user?.role;
  const vendorId = user?.vendorId || user?.vendorIds?.[0] || null;
  const assignedBranchId = getAssignedBranchId(user);

  const isStaff = isVendorStaff() || role === "vendor_staff";
  const isMainVendor =
    (isVendor() || role === "vendor_main" || role === "vendor") && !isStaff;

  const canCancel = isMainVendor;
  const canFilterByBranch = isMainVendor;

  const isLoading = authLoading || loading;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchInput.trim(),
        page: 1,
      }));
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!vendorId) return;

      silent ? setRefreshing(true) : setLoading(true);
      setError("");

      try {
        const params = {
          ...filters,
          branchId:
            isStaff && assignedBranchId
              ? assignedBranchId
              : isMainVendor
              ? filters.branchId
              : undefined,
        };

        const requests = [
          OrdersAPI.getVendorOrders(vendorId, params),
          OrdersAPI.getVendorOrderStats(vendorId, params),
        ];

        if (isMainVendor) {
          requests.push(VendorsAPI.getBranches(vendorId));
        }

        const [ordersResp, statsResp, branchesResp] =
          await Promise.all(requests);

        if (!ordersResp?.success) {
          if (ordersResp?.status === 401) router.push("/login");
          throw new Error(ordersResp?.error || "Failed to fetch orders");
        }

        const nextOrders =
          ordersResp.data?.items ||
          ordersResp.data?.orders ||
          ordersResp.data ||
          [];

        setOrders(nextOrders);
        setPagination({
          total: ordersResp.data?.total || nextOrders.length,
          page: filters.page,
          totalPages:
            ordersResp.data?.totalPages ||
            Math.ceil(
              (ordersResp.data?.total || nextOrders.length) / PAGE_SIZE
            ),
        });

        if (statsResp?.success) {
          setStats(statsResp.data || stats);
        }

        if (isMainVendor && branchesResp?.success) {
          setBranches(branchesResp.data?.items || branchesResp.data || []);
        }
      } catch (err) {
        setError(err.message || "Unable to load orders");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vendorId, filters, isMainVendor, isStaff, assignedBranchId, router]
  );

  useEffect(() => {
    if (!vendorId || authLoading) return;
    if (!isMainVendor && !isStaff) return;
    fetchOrders();
  }, [vendorId, authLoading, isMainVendor, isStaff, fetchOrders]);

  const tableRows = useMemo(() => {
    return orders.map((order) => ({
      ...order,
      id: getOrderId(order),
      customerName: order.customerName || order.customer?.name || "N/A",
      phone: order.customerPhone || order.customer?.phone || "N/A",
      branch:
        order.branchName || order.branch?.name || order.branch || "N/A",
      amount: Number(order.total || 0),
      paymentStatus:
        order.paymentStatus || order.payment?.status || "unpaid",
    }));
  }, [orders]);

  const columns = useMemo(() => {
    const sortableTitle = (label, field) => (
      <button
        type="button"
        onClick={() =>
          setFilters((prev) => ({
            ...prev,
            sortBy: field,
            sortOrder:
              prev.sortBy === field && prev.sortOrder === "asc"
                ? "desc"
                : "asc",
            page: 1,
          }))
        }
        className="inline-flex items-center gap-1 font-semibold"
      >
        {label}
        <ArrowUpDown className="w-3.5 h-3.5" />
      </button>
    );

    return [
      {
        key: "id",
        title: sortableTitle("Order ID", "id"),
        render: (row) => (
          <button
            onClick={() => router.push(`/vendor/orders/${row.id}`)}
            className="font-mono text-sm text-orange-700 hover:underline"
          >
            #{String(row.id).slice(-8)}
          </button>
        ),
      },
      {
        key: "customer",
        title: "Customer",
        render: (row) => (
          <div>
            <p className="font-medium">{row.customerName}</p>
            <p className="text-xs text-gray-500">{row.phone}</p>
          </div>
        ),
      },
      {
        key: "status",
        title: sortableTitle("Status", "status"),
        render: (row) => (
          <Badge
            text={row.status}
            tone={row.status}
            className="capitalize"
          />
        ),
      },
      {
        key: "amount",
        title: sortableTitle("Amount", "amount"),
        render: (row) => (
          <span className="font-semibold">
            ${row.amount.toFixed(2)}
          </span>
        ),
      },
      {
        key: "actions",
        title: "Actions",
        render: (row) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-gray-600 hover:bg-gray-700 text-xs"
              onClick={() =>
                router.push(`/vendor/orders/${row.id}`)
              }
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              View
            </Button>

            {canCancel && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-xs"
              >
                <Ban className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        ),
      },
    ];
  }, [router, canCancel]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() =>
          setToast((prev) => ({ ...prev, open: false }))
        }
      />

      <h1 className="text-2xl sm:text-3xl font-bold">
        Vendor Orders
      </h1>

      {error && (
        <Alert
          variant="error"
          title="Unable to fetch orders"
          message={error}
        />
      )}

      <SectionWrapper>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatsCard
            title="Total Orders"
            value={isLoading ? "—" : stats.total}
            accent="orange"
          />
          <StatsCard
            title="Pending"
            value={isLoading ? "—" : stats.pending}
          />
          <StatsCard
            title="In Progress"
            value={isLoading ? "—" : stats.inProgress}
          />
          <StatsCard
            title="Completed"
            value={isLoading ? "—" : stats.completed}
          />
          <StatsCard
            title="Cancelled"
            value={isLoading ? "—" : stats.cancelled}
            accent="red"
          />
          <StatsCard
            title="Orders Today"
            value={isLoading ? "—" : stats.today}
          />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Orders Table">
        <Table columns={columns} data={tableRows} />

        {!isLoading && tableRows.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No orders found for the selected filters.
          </div>
        )}
      </SectionWrapper>
    </div>
  );
}