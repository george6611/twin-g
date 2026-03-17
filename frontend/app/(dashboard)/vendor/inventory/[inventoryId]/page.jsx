"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import useAuth from "../../../../hooks/useAuth";
import { InventoryAPI } from "../../../../lib/api/inventory";
import SectionWrapper from "../../../../components/dashboard/SectionWrapper";
import StatsCard from "../../../../components/dashboard/StatsCard";
import Button from "../../../../components/ui/Button";
import EditInventoryModal from "../EditInventoryModal";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const normalized = String(url).replace(/\\/g, "/");
  const uploadsIndex = normalized.indexOf("uploads/");

  if (uploadsIndex >= 0) {
    return `${BACKEND_URL}/${normalized.slice(uploadsIndex)}`;
  }

  return `${BACKEND_URL}/${normalized.replace(/^\/+/, "")}`;
}

function currency(value) {
  const amount = Number(value || 0);
  return `KES ${amount.toLocaleString()}`;
}

export default function InventoryItemDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params?.inventoryId;

  const { user, loading: authLoading } = useAuth();

  const vendorId = user?.vendorId || user?.vendorIds?.[0] || null;

  const [item, setItem] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchItem = useCallback(async () => {
    if (!vendorId || !inventoryId) return;

    setLoading(true);
    setError("");

    try {
      const resp = await InventoryAPI.getInventoryItem(vendorId, inventoryId);

      if (!resp?.success) {
        if (resp?.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(resp?.error || "Failed to load inventory item");
      }

      const product = resp?.data?.product || null;
      if (!product) {
        throw new Error("Inventory item not found");
      }

      setItem(product);
    } catch (err) {
      setError(err.message || "Unable to load inventory item details");
    } finally {
      setLoading(false);
    }
  }, [vendorId, inventoryId, router]);

  useEffect(() => {
    if (!authLoading && vendorId && inventoryId) {
      fetchItem();
    }
  }, [authLoading, vendorId, inventoryId, fetchItem]);

  const images = useMemo(() => {
    const list = Array.isArray(item?.images) ? item.images : [];
    if (list.length > 0) return list;
    return item?.thumbnail ? [item.thumbnail] : [];
  }, [item]);

  const createdByLabel = useMemo(() => {
    if (!item) return "-";

    const staffName = item?.staffId?.userId?.name;
    const staffEmail = item?.staffId?.userId?.email;

    if (staffName || staffEmail) {
      return staffName || staffEmail;
    }

    const vendorName = item?.vendorId?.shopName || item?.vendorId?.name;
    return vendorName || "Main Vendor";
  }, [item]);

  const modalItem = useMemo(() => {
    if (!item) return null;
    return {
      ...item,
      quantity: item.stockQuantity ?? item.quantity ?? 0,
      branchId:
        typeof item.branchId === "object"
          ? item.branchId?._id || ""
          : item.branchId || "",
      category: item.category || item.categoryId?.name || "",
    };
  }, [item]);

  if (loading || authLoading) {
    return <div className="p-8 text-gray-600">Loading inventory item...</div>;
  }

  if (error) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-red-600 font-medium">{error}</div>
        <Button onClick={() => router.push("/vendor/inventory")}>
          Back to Inventory
        </Button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-gray-600">Inventory item not found.</div>
        <Button onClick={() => router.push("/vendor/inventory")}>
          Back to Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {item.name || "Inventory Item"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage inventory product details
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setEditing(true)} className="bg-orange-500 shadow-sm">
            Edit Item
          </Button>
          <Button
            onClick={() => router.push("/vendor/inventory")}
            className="shadow-sm"
          >
            Back to Inventory
          </Button>
        </div>
      </div>

      {/* Stats */}
      <SectionWrapper>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatsCard title="Price" value={currency(item.price)} accent="orange" />
          <StatsCard
            title="Items Sold"
            value={Number(item.totalOrders || 0).toLocaleString()}
          />
          <StatsCard
            title="Stock Quantity"
            value={Number(item.stockQuantity || 0).toLocaleString()}
          />
          <StatsCard title="Status" value={item.status || "active"} />
        </div>
      </SectionWrapper>

      {/* Product Info */}
      <SectionWrapper title="Product Information">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">

          <Info label="Name" value={item.name} />
          <Info label="SKU" value={item.sku} />
          <Info label="Brand" value={item.brand} />

          <Info
            label="Category"
            value={item.category || item.categoryId?.name}
          />

          <Info
            label="Subcategory"
            value={item.subCategory || item.subCategoryId?.name}
          />

          <Info label="Created By" value={createdByLabel} />

          <Info label="Branch" value={item.branchId?.name} />

          <Info
            label="Vendor"
            value={item.vendorId?.shopName || item.vendorId?.name}
          />

        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-sm">Description</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            {item.description || "No description available."}
          </p>
        </div>
      </SectionWrapper>

      {/* Images */}
      <SectionWrapper title="Product Images">
        {images.length === 0 ? (
          <div className="text-gray-500 text-sm">No images uploaded.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {images.map((img, index) => (
              <a
                key={`${img}-${index}`}
                href={resolveAssetUrl(img)}
                target="_blank"
                rel="noopener noreferrer"
                className="group border rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition"
              >
                <img
                  src={resolveAssetUrl(img)}
                  alt={`${item.name} image ${index + 1}`}
                  className="h-48 w-full object-cover group-hover:scale-105 transition"
                />
              </a>
            ))}
          </div>
        )}
      </SectionWrapper>

      {editing && modalItem && (
        <EditInventoryModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          vendorId={vendorId}
          item={modalItem}
          categories={[]}
          onUpdated={async () => {
            setEditing(false);
            await fetchItem();
          }}
        />
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-medium text-gray-900">{value || "-"}</p>
    </div>
  );
}