"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "../../hooks/useAuth";
import useVendorDashboard from "../../hooks/useVendorDashboard";
import StatsCard from "../../components/dashboard/StatsCard";
import SectionWrapper from "../../components/dashboard/SectionWrapper";
import Table from "../../components/dashboard/Table";
import Button from "../../components/ui/Button";
import AddStaffModal from "./AddStaffModal";
import AddBranchModal from "./AddBranchModal";
import EditBranchModal from "./branches/EditBranchModal";
import DeleteBranchModal from "./branches/DeleteBranchModal";

export default function VendorDashboard() {
  const router = useRouter();
  const { user, userRole, loading: authLoading, isVendor, isVendorStaff } = useAuth();

  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState({
    open: false,
    branchId: null,
  });
  const [showEditBranch, setShowEditBranch] = useState(false);
  const [showDeleteBranch, setShowDeleteBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const mainVendor = (isVendor() && !isVendorStaff()) || userRole === "vendor_main";
  const branchStaff = isVendorStaff() || userRole === "vendor_staff";

  const vendorId =
    user?.vendorId || (user?.vendorIds && user.vendorIds[0]);

  const {
    stats = {},
    branches = [],
    staff = [],
    orders = [],
    loading: dataLoading,
    error,
    refresh: fetchData,
  } = useVendorDashboard(branchStaff ? user?.branchId : null);

  // Ensure branches is always an array
  const branchesArray = Array.isArray(branches) ? branches : [];
  const staffArray = Array.isArray(staff) ? staff : [];
  const ordersArray = Array.isArray(orders) ? orders : [];
  
  

  const isLoading = authLoading || dataLoading;

  const onBranchAdded = async (newBranch) => {
    
    await fetchData();
    
  };
  
  const normalizeBranchForModal = (branch) => {
    if (!branch) return null;
    return {
      ...branch,
      _id: branch._id || branch.id,
      location:
        branch.location ||
        branch.address?.city ||
        branch.address?.street ||
        "",
      address:
        typeof branch.address === "string"
          ? branch.address
          : [branch.address?.street, branch.address?.city, branch.address?.region]
              .filter(Boolean)
              .join(", "),
      managerName: branch.managerName || branch.manager || "",
    };
  };

  const onViewBranch = (branch) => {
    const branchId = branch?._id || branch?.id;
    if (!branchId) return;
    router.push(`/vendor/branches/${branchId}`);
  };

  const onEditBranch = (branch) => {
    setSelectedBranch(normalizeBranchForModal(branch));
    setShowEditBranch(true);
  };

  const onDeleteBranch = (branch) => {
    setSelectedBranch(normalizeBranchForModal(branch));
    setShowDeleteBranch(true);
  };
  
  const onBranchUpdatedOrDeleted = async () => {
    await fetchData();
    setShowEditBranch(false);
    setShowDeleteBranch(false);
    setSelectedBranch(null);
  };
  
  const onStaffAdded = () => fetchData();

  if (error) {
    return (
      <div className="p-6 text-red-600 font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">

      {/* ================= KPI SECTION ================= */}
      <SectionWrapper>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="Orders Processed"
            value={isLoading ? "—" : stats.total || 0}
            accent="orange"
            loading={isLoading}
          />
          <StatsCard
            title="Revenue Generated"
            value={isLoading ? "—" : stats.revenue || 0}
            loading={isLoading}
          />
          <StatsCard
            title="Active Orders"
            value={isLoading ? "—" : stats.active || 0}
            loading={isLoading}
          />
          <StatsCard
            title="Branches (Active)"
            value={isLoading ? "—" : `${stats.activeBranches || 0}/${stats.branches || 0}`}
            loading={isLoading}
          />
          <StatsCard
            title="Staff"
            value={isLoading ? "—" : stats.staff || 0}
            loading={isLoading}
          />
          <StatsCard
            title="Customers Served"
            value={isLoading ? "—" : stats.customers || 0}
            loading={isLoading}
          />
        </div>
      </SectionWrapper>

      {/* ================= QUICK ACTIONS ================= */}
      {mainVendor && (
        <SectionWrapper title="Quick Actions">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowAddBranch(true)}
              className="bg-orange-500"
            >
              Add Branch
            </Button>
            <Button
              onClick={() => setShowAddStaff({ open: true })}
              className="bg-orange-400"
            >
              Add Staff
            </Button>
            <Button
              onClick={() => {}}
              className="bg-orange-200"
            >
              Search Orders
            </Button>
          </div>
        </SectionWrapper>
      )}

      {/* ================= BRANCHES ================= */}
      {mainVendor && (
        <SectionWrapper title="Branches Overview">
          {branchesArray.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-gray-500">
              No branches yet.
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => setShowAddBranch(true)}
                  className="bg-orange-500"
                >
                  Create Your First Branch
                </Button>
              </div>
            </div>
          ) : (
            <Table
              columns={[
                { 
                  key: "name", 
                  title: "Branch Name",
                  render: (r) => (
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      {r.status === 'pending' && r.missingFields && r.missingFields.length > 0 && (
                        <span className="text-xs text-yellow-600 mt-1">
                          ⚠️ Missing: {r.missingFields.join(', ')}
                        </span>
                      )}
                    </div>
                  )
                },
                { 
                  key: "status", 
                  title: "Status",
                  render: (r) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : r.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {r.status === 'active' ? '✓ Active' : r.status === 'pending' ? '⏳ Pending' : r.status || 'Unknown'}
                    </span>
                  )
                },
                { key: "staffCount", title: "Staff" },
                { key: "activeOrders", title: "Active Orders" },
                {
                  key: "actions",
                  title: "Actions",
                  render: (r) => (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onViewBranch(r)}>View</Button>
                      <Button size="sm" onClick={() => onEditBranch(r)}>Edit</Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          setShowAddStaff({
                            open: true,
                            branchId: r.id || r._id,
                          })
                        }
                        className="bg-green-200 text-green-800"
                      >
                        Add Staff
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500"
                        onClick={() => onDeleteBranch(r)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={branchesArray.map((b) => ({
                ...b,
                staffCount: b.staffCount || 0,
                activeOrders: b.activeOrders || 0,
              }))}
            />
          )}
        </SectionWrapper>
      )}

      {/* ================= STAFF ================= */}
      {(mainVendor || branchStaff) && (
        <SectionWrapper title="Staff Overview">
          {staffArray.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-gray-500">
              No staff members yet.
            </div>
          ) : (
            <Table
              columns={[
                { key: "name", title: "Name" },
                { key: "email", title: "Email" },
                { key: "role", title: "Role" },
                { key: "branch", title: "Branch" },
                { 
                  key: "status", 
                  title: "Status",
                  render: (s) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {s.isActive ? '✓ Active' : 'Inactive'}
                    </span>
                  )
                },
                {
                  key: "actions",
                  title: "Actions",
                  render: () => (
                    <div className="flex gap-2">
                      {mainVendor && <Button size="sm">Edit</Button>}
                      {mainVendor && (
                        <Button size="sm" variant="ghost">
                          Deactivate
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={staffArray.map((s) => ({
                ...s,
                branch: s.branchName || s.branch || "",
                status: s.isActive ? 'Active' : 'Inactive',
              }))}
            />
          )}
        </SectionWrapper>
      )}

      {/* ================= ORDERS ================= */}
      {(mainVendor || branchStaff) && (
        <SectionWrapper title="Recent Orders">
          {ordersArray.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-gray-500">
              No orders yet.
            </div>
          ) : (
            <Table
              columns={[
                { key: "id", title: "Order ID" },
                { key: "customer", title: "Customer" },
                { key: "status", title: "Status" },
                { key: "branch", title: "Branch" },
                {
                  key: "actions",
                  title: "Actions",
                  render: () => (
                    <Button size="sm">View</Button>
                  ),
                },
              ]}
              data={ordersArray.map((o) => ({
                ...o,
                customer: o.customerName || o.customer?.name,
                branch: o.branchName || o.branch || "",
              }))}
            />
          )}
        </SectionWrapper>
      )}

      {/* ================= MODALS ================= */}
      <AddBranchModal
        isOpen={showAddBranch}
        onClose={() => setShowAddBranch(false)}
        vendorId={vendorId}
        onAdded={onBranchAdded}
      />

      <AddStaffModal
        isOpen={showAddStaff.open}
        onClose={() =>
          setShowAddStaff({ open: false, branchId: null })
        }
        vendorId={vendorId}
        branchId={showAddStaff.branchId}
        branches={branchesArray}
        onAdded={onStaffAdded}
      />

      <EditBranchModal
        isOpen={showEditBranch}
        onClose={() => {
          setShowEditBranch(false);
          setSelectedBranch(null);
        }}
        vendorId={vendorId}
        branch={selectedBranch}
        onSuccess={onBranchUpdatedOrDeleted}
      />

      <DeleteBranchModal
        isOpen={showDeleteBranch}
        onClose={() => {
          setShowDeleteBranch(false);
          setSelectedBranch(null);
        }}
        vendorId={vendorId}
        branch={selectedBranch}
        onSuccess={onBranchUpdatedOrDeleted}
      />
    </div>
  );
}