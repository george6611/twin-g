'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import useAuth from '../../../hooks/useAuth';
import { BranchesAPI } from '../../../lib/api/branches';

import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Alert from '../../../components/ui/Alert';
import Toast from '../../../components/ui/Toast';
import SectionWrapper from '../../../components/dashboard/SectionWrapper';
import StatsCard from '../../../components/dashboard/StatsCard';
import Table from '../../../components/dashboard/Table';

import CreateBranchModal from './CreateBranchModal';
import EditBranchModal from './EditBranchModal';
import DeleteBranchModal from './DeleteBranchModal';

function normalizeBranch(branch) {
  const locationValue = (() => {
    if (typeof branch?.location === 'string') return branch.location;
    if (
      branch?.location &&
      typeof branch.location === 'object' &&
      Array.isArray(branch.location.coordinates)
    ) {
      const [lng, lat] = branch.location.coordinates;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    }
    return branch?.address?.city || branch?.address?.street || '';
  })();

  return {
    ...branch,
    _id: branch?._id || branch?.id,
    location: locationValue,
    managerName: branch?.managerName || branch?.manager || '',
  };
}

function extractBranchArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.branches)) return payload.branches;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.branches)) return payload.data.branches;
  }
  return [];
}

export default function VendorBranchesPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isVendor,
    isVendorStaff,
    userRole,
    vendorId: loggedInVendorId,
  } = useAuth();

  const isVendorAccount =
    typeof isVendor === 'function' ? isVendor() : !!isVendor;
  const isVendorStaffAccount =
    typeof isVendorStaff === 'function' ? isVendorStaff() : !!isVendorStaff;

  const isMainVendor =
    (isVendorAccount && !isVendorStaffAccount) || userRole === 'vendor_main';

  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({
    totalBranches: 0,
    activeBranches: 0,
    totalStaff: 0,
    totalOrders: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [toast, setToast] = useState(null);

  // ================= FETCH =================
  const fetchBranches = useCallback(async () => {
    if (!isMainVendor || !loggedInVendorId) return;

    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const result = await BranchesAPI.getBranches(loggedInVendorId);

      if (result.status === 401) {
        router.push('/login');
        return;
      }

      if (result.status === 403) {
        setForbidden(true);
        return;
      }

      if (!result.success) {
        setError(result.error || 'Failed to load branches');
        return;
      }

      const branchesArray = extractBranchArray(result.data).map(normalizeBranch);

      setBranches(branchesArray);

      // Compute stats
      setStats({
        totalBranches: branchesArray.length,
        activeBranches: branchesArray.filter(
          (b) => b.status === 'active'
        ).length,
        totalStaff: branchesArray.reduce(
          (sum, b) => sum + (b.staffCount || 0),
          0
        ),
        totalOrders: branchesArray.reduce(
          (sum, b) => sum + (b.activeOrders || 0),
          0
        ),
      });
    } catch (err) {
      setError(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [loggedInVendorId, isMainVendor, router]);

  useEffect(() => {
    if (isMainVendor && loggedInVendorId) {
      fetchBranches();
    }
  }, [isMainVendor, loggedInVendorId, fetchBranches]);

  // ================= FILTERING =================
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      if (
        statusFilter !== 'all' &&
        branch.status !== statusFilter
      )
        return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          branch.name?.toLowerCase().includes(q) ||
          branch.location?.toLowerCase().includes(q) ||
          branch.managerName?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [branches, statusFilter, searchQuery]);

  const paginatedBranches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBranches.slice(start, start + itemsPerPage);
  }, [filteredBranches, currentPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredBranches.length / itemsPerPage)),
    [filteredBranches.length]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCreateSuccess = async () => {
    setCreateModalOpen(false);
    await fetchBranches();
    setToast({ type: 'success', message: 'Branch created successfully.' });
  };

  const handleEditSuccess = async () => {
    setEditModalOpen(false);
    setSelectedBranch(null);
    await fetchBranches();
    setToast({ type: 'success', message: 'Branch updated successfully.' });
  };

  const handleDeleteSuccess = async () => {
    setDeleteModalOpen(false);
    setSelectedBranch(null);
    await fetchBranches();
    setToast({ type: 'success', message: 'Branch deleted successfully.' });
  };

  // ================= TABLE COLUMNS =================
  const columns = [
    {
      key: 'name',
      title: 'Branch Name',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.name}</div>
          <div className="text-sm text-gray-500">
            {row.location}
          </div>
        </div>
      ),
    },
    {
      key: 'managerName',
      title: 'Manager',
      render: (row) => row.managerName || '—',
    },
    {
      key: 'staffCount',
      title: 'Staff',
      render: (row) => (
        <Badge text={row.staffCount || 0} />
      ),
    },
    {
      key: 'activeOrders',
      title: 'Active Orders',
      render: (row) => (
        <span className="font-semibold text-orange-600">
          {row.activeOrders || 0}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <Badge
          text={row.status}
          tone={
            row.status === 'active'
              ? 'success'
              : 'secondary'
          }
        />
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() =>
              router.push(
                `/vendor/branches/${row._id}`
              )
            }
          >
            View
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedBranch(row);
              setEditModalOpen(true);
            }}
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-red-600"
            onClick={() => {
              setSelectedBranch(row);
              setDeleteModalOpen(true);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // ================= PERMISSIONS =================
  if (!isAuthenticated) return null;

  if (forbidden) {
    return (
      <div className="p-6">
        <Alert
          variant="warning"
          title="Access Denied"
          message="Only main vendor accounts can manage branches."
        />
      </div>
    );
  }

  // ================= MAIN RENDER =================
  return (
    <div className="p-4 md:p-6 space-y-6">

      {error && (
        <Alert
          variant="error"
          title="Error Loading Branches"
          message={error}
        />
      )}

      {/* KPI SECTION */}
      <SectionWrapper title="Branch Overview">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Branches"
            value={loading ? '—' : stats.totalBranches}
            accent="orange"
          />
          <StatsCard
            title="Active Branches"
            value={loading ? '—' : stats.activeBranches}
          />
          <StatsCard
            title="Total Staff"
            value={loading ? '—' : stats.totalStaff}
          />
          <StatsCard
            title="Active Orders"
            value={loading ? '—' : stats.totalOrders}
          />
        </div>
      </SectionWrapper>

      {/* TABLE SECTION */}
      <SectionWrapper title="Branches">

        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
          <Button onClick={() => setCreateModalOpen(true)}>
            + Add Branch
          </Button>

          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search branch, location, manager"
              className="w-full md:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end mb-3">
          <div className="text-sm text-gray-500">
            {filteredBranches.length} branch
            {filteredBranches.length !== 1 ? 'es' : ''}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table columns={columns} data={paginatedBranches} />
        </div>

        {filteredBranches.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No branches found.
          </div>
        )}

        {filteredBranches.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </SectionWrapper>

      {/* MODALS */}
      <CreateBranchModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        vendorId={loggedInVendorId}
        onSuccess={handleCreateSuccess}
      />

      <EditBranchModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedBranch(null);
        }}
        vendorId={loggedInVendorId}
        branch={selectedBranch}
        onSuccess={handleEditSuccess}
      />

      <DeleteBranchModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedBranch(null);
        }}
        vendorId={loggedInVendorId}
        branch={selectedBranch}
        onSuccess={handleDeleteSuccess}
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
}