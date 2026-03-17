"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "../../../hooks/useAuth";
import useInventory from "../../../hooks/useInventory";

import StatsCard from "../../../components/dashboard/StatsCard";
import SectionWrapper from "../../../components/dashboard/SectionWrapper";
import Table from "../../../components/dashboard/Table";
import Button from "../../../components/ui/Button";

import InventoryUploadModal from "./InventoryUploadModal";
import EditInventoryModal from "./EditInventoryModal";
import DeleteInventoryModal from "./DeleteInventoryModal";

export default function InventoryPage() {
  const router = useRouter();
  const { user, loading: authLoading, isVendor, isVendorStaff } = useAuth();

  const mainVendor = isVendor() && !isVendorStaff();
  const branchStaff = isVendorStaff();

  const vendorId =
    user?.vendorId || (user?.vendorIds && user.vendorIds[0]);

  const branchId = branchStaff ? user?.branchId : null;

  const {
    items = [],
    categories = [],
    stats = {},
    loading,
    error,
    refresh,
  } = useInventory(branchId);

  const isLoading = loading || authLoading;

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const onAdded = () => refresh({ search: searchTerm.trim(), sort: sortBy });
  const onUpdated = () => refresh({ search: searchTerm.trim(), sort: sortBy });
  const onDeleted = () => refresh({ search: searchTerm.trim(), sort: sortBy });

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh({
        search: searchTerm.trim(),
        sort: sortBy,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, sortBy, refresh]);

  // 🔥 SAFE VALUE NORMALIZER (Prevents React Object Crash)
  const safeValue = (val) => {
    if (val === null || val === undefined) return "";

    if (Array.isArray(val)) {
      return val
        .map((v) =>
          typeof v === "object"
            ? v.name || v.value || JSON.stringify(v)
            : v
        )
        .join(", ");
    }

    if (typeof val === "object") {
      return val.name || val.value || JSON.stringify(val);
    }

    return val;
  };

  // 🔥 SANITIZED TABLE DATA
  const sanitizedData = useMemo(() => {
    return items.map((i) => ({
      ...i,
      name: safeValue(i.name),
      sku: safeValue(i.sku),
      quantity: safeValue(i.quantity),
      category: safeValue(i.category),
      status: safeValue(i.status),
      branchId: safeValue(i.branchId),
    }));
  }, [items]);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Items"
            value={isLoading ? "—" : stats.total || 0}
            accent="orange"
            loading={isLoading}
          />
          <StatsCard
            title="Low Stock"
            value={isLoading ? "—" : stats.lowStock || 0}
            loading={isLoading}
          />
          <StatsCard
            title="Categories"
            value={isLoading ? "—" : stats.categories || 0}
            loading={isLoading}
          />
          {mainVendor && (
            <StatsCard
              title="Branches"
              value={isLoading ? "—" : stats.branches || 0}
              loading={isLoading}
            />
          )}
        </div>
      </SectionWrapper>

      {/* ================= QUICK ACTIONS ================= */}
      <SectionWrapper title="Quick Actions">
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-orange-500"
          >
            Add Item
          </Button>
        </div>
      </SectionWrapper>

      {/* ================= INVENTORY TABLE ================= */}
      <SectionWrapper title="Inventory">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU, category, brand..."
            className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-60 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="newest">Newest to Oldest</option>
            <option value="oldest">Oldest to Newest</option>
            <option value="alpha_asc">Alphabetical (A-Z)</option>
            <option value="alpha_desc">Alphabetical (Z-A)</option>
            <option value="most_sold">Most Sold</option>
            <option value="least_sold">Least Sold</option>
          </select>
        </div>

        {sanitizedData.length === 0 && !isLoading ? (
          <div className="py-10 text-center text-gray-500">
            No inventory items yet.
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => setShowAdd(true)}
                className="bg-orange-500"
              >
                Add Your First Item
              </Button>
            </div>
          </div>
        ) : (
          <Table
            columns={[
              {
                key: "name",
                title: "Name",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => router.push(`/vendor/inventory/${row.id || row._id}`)}
                    className="text-orange-700 hover:text-orange-800 hover:underline font-medium"
                  >
                    {row.name}
                  </button>
                ),
              },
              { key: "sku", title: "SKU" },
              { key: "quantity", title: "Qty" },
              { key: "category", title: "Category" },
              ...(mainVendor
                ? [{ key: "branchId", title: "Branch" }]
                : []),
              { key: "status", title: "Status" },
              {
                key: "actions",
                title: "Actions",
                render: (r) => (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setEditing(r)}
                    >
                      Edit
                    </Button>
                    {mainVendor && (
                      <Button
                        size="sm"
                        className="bg-red-500"
                        onClick={() => setDeleting(r)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={sanitizedData}
          />
        )}
      </SectionWrapper>

      {/* ================= MODALS ================= */}
      {showAdd && (
        <InventoryUploadModal
          vendorId={vendorId}
          onAdded={() => {
            refresh({ search: searchTerm.trim(), sort: sortBy });
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <EditInventoryModal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          vendorId={vendorId}
          item={editing}
          categories={categories.map(c =>
    typeof c === "object"
      ? c.name || c.value
      : c
  )}
          onUpdated={onUpdated}
        />
      )}

      {deleting && (
        <DeleteInventoryModal
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          vendorId={vendorId}
          itemId={deleting.id || deleting._id}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}