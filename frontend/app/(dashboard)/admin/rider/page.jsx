"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, ChevronRight } from "lucide-react";
import { RidersAPI } from "../../../lib/api";

const STATUS_OPTIONS = ["all", "submitted", "pending", "active", "suspended", "rejected"];

const statusStyles = {
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  active: "bg-green-100 text-green-700 border-green-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-gray-200 text-gray-700 border-gray-300",
};

function StatusBadge({ status }) {
  const base = "px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center";
  return <span className={`${base} ${statusStyles[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>{String(status || "unknown").toUpperCase()}</span>;
}

export default function AdminRiderPage() {
  const [statusIndex, setStatusIndex] = useState(0);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedStatus = STATUS_OPTIONS[statusIndex] || "all";

  const fetchRiders = async (status) => {
    setLoading(true);
    setError("");
    try {
      const resp = await RidersAPI.getRiders(status);
      if (!resp.success) throw new Error(resp.error || "Failed to load riders");
      setRiders(resp.data?.riders || []);
    } catch (e) {
      setError(e.message || "Failed to load riders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders(selectedStatus);
  }, [selectedStatus]);

  const filteredRiders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return riders;

    return riders.filter((rider) => {
      const fields = [
        rider.fullName,
        rider.phoneNumber,
        rider.email,
        rider.declaredSaccoName,
        rider.saccoId?.name,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return fields.some((f) => f.includes(term));
    });
  }, [riders, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Rider Management</h1>
          <p className="text-sm text-gray-500 mt-1">View riders by status and manage onboarding lifecycle.</p>
        </div>
        <button
          className="inline-flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold"
          onClick={() => fetchRiders(selectedStatus)}
          type="button"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </button>
      </header>

      <section className="bg-white border border-orange-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-700">Status slider</p>
          <StatusBadge status={selectedStatus === "all" ? "submitted" : selectedStatus} />
        </div>

        <input
          type="range"
          min={0}
          max={STATUS_OPTIONS.length - 1}
          step={1}
          value={statusIndex}
          onChange={(e) => setStatusIndex(Number(e.target.value))}
          className="w-full accent-orange-600"
        />

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map((status, index) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusIndex(index)}
              className={`px-3 py-1.5 rounded-full border text-sm whitespace-nowrap ${
                statusIndex === index
                  ? "bg-orange-600 border-orange-600 text-white"
                  : "bg-white border-orange-200 text-orange-700 hover:bg-orange-50"
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5"
          placeholder="Search by name, phone, email, sacco..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-gray-500">Loading riders...</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sacco</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRiders.map((rider) => (
                  <tr key={rider._id} className="border-t hover:bg-orange-50/40">
                    <td className="px-4 py-3 text-sm text-gray-800">{rider.fullName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{rider.phoneNumber || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{rider.email || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{rider.saccoId?.name || rider.declaredSaccoName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{typeof rider.rating === "number" ? rider.rating.toFixed(1) : "0.0"}</td>
                    <td className="px-4 py-3"><StatusBadge status={rider.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/rider/${rider._id}`}
                        className="inline-flex items-center text-orange-700 hover:text-orange-800 font-semibold text-sm"
                      >
                        View <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}

                {filteredRiders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No riders found for this status/filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
