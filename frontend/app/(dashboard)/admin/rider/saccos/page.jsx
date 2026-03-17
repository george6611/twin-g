"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { SaccosAPI } from "../../../../lib/api";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  active: "bg-green-100 text-green-700 border-green-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-gray-200 text-gray-700 border-gray-300",
};

function StatusBadge({ status }) {
  const base = "px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center";
  return (
    <span className={`${base} ${statusStyles[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {String(status || "unknown").toUpperCase()}
    </span>
  );
}

export default function AdminSaccosPage() {
  const [saccos, setSaccos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddPopup, setShowAddPopup] = useState(false);

  const fetchSaccos = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await SaccosAPI.getSaccos(statusFilter);
      if (!resp.success) throw new Error(resp.error || "Failed to load saccos");
      setSaccos(resp.data?.saccos || []);
    } catch (e) {
      setError(e.message || "Failed to load saccos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaccos();
  }, [statusFilter]);

  const filteredSaccos = useMemo(() => {
    if (!searchTerm) return saccos;
    const term = searchTerm.toLowerCase();
    return saccos.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.stage?.toLowerCase().includes(term) ||
        s.chairmanName?.toLowerCase().includes(term) ||
        s.chairmanPhone?.includes(term)
    );
  }, [saccos, searchTerm]);

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === statusFilter) || STATUS_OPTIONS[0];
  const currentIndex = STATUS_OPTIONS.indexOf(currentStatus);

  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    setStatusFilter(STATUS_OPTIONS[index].value);
  };

  if (loading && saccos.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-gray-500">Loading saccos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Sacco Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage rider saccos and their members</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddPopup(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-semibold inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Sacco
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Status Filter Slider */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Filter by Status: <span className="text-orange-600">{currentStatus.label}</span>
        </label>
        <input
          type="range"
          min="0"
          max={STATUS_OPTIONS.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {STATUS_OPTIONS.map((opt) => (
            <span key={opt.value}>{opt.label}</span>
          ))}
        </div>
      </section>

      {/* Search Bar */}
      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, stage, chairman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </section>

      {/* Saccos Table */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Stage</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Chairman</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Members</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSaccos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? "No saccos match your search" : `No saccos with status: ${currentStatus.label}`}
                  </td>
                </tr>
              ) : (
                filteredSaccos.map((sacco) => (
                  <tr key={sacco._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{sacco.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{sacco.stage || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{sacco.chairmanName}</div>
                      <div className="text-xs text-gray-500">{sacco.chairmanPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{sacco.numberOfMembers || 0}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sacco.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/rider/saccos/${sacco._id}`}
                        className="text-orange-700 hover:underline font-semibold text-sm"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Sacco Popup */}
      {showAddPopup && (
        <AddSaccoPopup
          onClose={() => setShowAddPopup(false)}
          onSuccess={() => {
            setShowAddPopup(false);
            fetchSaccos();
          }}
        />
      )}
    </div>
  );
}

function AddSaccoPopup({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [stage, setStage] = useState("");
  const [chairmanName, setChairmanName] = useState("");
  const [chairmanPhone, setChairmanPhone] = useState("");
  const [chairmanEmail, setChairmanEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !stage || !chairmanName || !chairmanPhone) {
      setError("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await SaccosAPI.registerSacco({
        name,
        stage,
        chairmanName,
        chairmanPhone,
        chairmanEmail,
      });

      if (!resp.success) {
        throw new Error(resp.data?.message || resp.error || "Failed to register sacco");
      }

      // Show credentials if chairman was created as rider
      if (resp.data?.chairmanCredentials) {
        setCredentials(resp.data.chairmanCredentials);
      } else {
        onSuccess();
      }
    } catch (e) {
      setError(e.message || "Failed to register sacco");
    } finally {
      setSubmitting(false);
    }
  };

  // If credentials are shown, display them instead of form
  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
          <h2 className="text-xl font-bold text-green-700">✓ Sacco Registered Successfully!</h2>
          <p className="text-sm text-gray-600">
            The chairman has been created as a rider and added to the member roster.
          </p>

          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-900 mb-2">🔐 Chairman Rider Account</h3>
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Phone:</span> {credentials.phone}
            </p>
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Temporary Password:</span> <code className="bg-white px-2 py-1 rounded">{credentials.temporaryPassword}</code>
            </p>
            <p className="text-xs text-blue-700 mt-2">
              The chairman can login with these credentials and should upload documents to complete registration.
            </p>
          </div>

          <button
            onClick={onSuccess}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Register New Sacco</h2>
        <p className="text-sm text-gray-600">
          Add basic sacco information. You can add officials, members, and documents later.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Sacco Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Kikuyu Riders Sacco"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Stage of Operation <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Kikuyu, Banana"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Chairman Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={chairmanName}
              onChange={(e) => setChairmanName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Chairman Phone <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              value={chairmanPhone}
              onChange={(e) => setChairmanPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="0712345678"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Chairman Email</label>
            <input
              type="email"
              value={chairmanEmail}
              onChange={(e) => setChairmanEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="chairman@example.com"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-4 py-2.5 rounded-lg font-semibold"
            >
              {submitting ? "Registering..." : "Register Sacco"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
