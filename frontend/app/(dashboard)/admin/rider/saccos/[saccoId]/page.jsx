"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Upload, Plus, Trash2 } from "lucide-react";
import { SaccosAPI } from "../../../../../lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const STATUS_OPTIONS = ["pending", "active", "suspended", "rejected"];

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  active: "bg-green-100 text-green-700 border-green-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-gray-200 text-gray-700 border-gray-300",
};

function StatusBadge({ status }) {
  const base = "px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center";
  return <span className={`${base} ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}>{String(status || "unknown").toUpperCase()}</span>;
}

function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = String(url).replace(/\\/g, "/");
  const uploadsIndex = normalized.indexOf("uploads/");
  if (uploadsIndex >= 0) {
    return `${BACKEND_URL}/${normalized.slice(uploadsIndex)}`;
  }
  const cleaned = normalized.replace(/^\/+/, "");
  return `${BACKEND_URL}/${cleaned}`;
}

export default function AdminSaccoDetailPage() {
  const { saccoId } = useParams();
  const [sacco, setSacco] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit states
  const [isEditingOfficials, setIsEditingOfficials] = useState(false);
  const [officials, setOfficials] = useState({});
  
  // Member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    idNumber: "",
    motorbikeModel: "",
    motorbikeRegNumber: "",
  });

  // Document upload
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Status update
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSacco = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await SaccosAPI.getSaccoById(saccoId);
      if (!resp.success) throw new Error(resp.error || "Failed to load sacco details");

      const data = resp.data;
      setSacco(data.sacco);
      setMissingFields(data.missingFields || []);
      setCanApprove(data.canApprove || false);
      setNewStatus(data.sacco?.status || "pending");
      setAdminNotes(data.sacco?.adminNotes || "");
      setOfficials({
        secretaryName: data.sacco?.secretaryName || "",
        secretaryPhone: data.sacco?.secretaryPhone || "",
        secretaryEmail: data.sacco?.secretaryEmail || "",
        treasurerName: data.sacco?.treasurerName || "",
        treasurerPhone: data.sacco?.treasurerPhone || "",
        treasurerEmail: data.sacco?.treasurerEmail || "",
      });
    } catch (e) {
      setError(e.message || "Failed to load sacco details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (saccoId) fetchSacco();
  }, [saccoId]);

  const handleSaveOfficials = async () => {
    setError("");
    setSuccess("");
    try {
      const resp = await SaccosAPI.updateSaccoDetails(saccoId, officials);
      if (!resp.success) throw new Error(resp.error || "Failed to update officials");
      
      let message = resp.data?.message || "Officials updated successfully";
      
      // Show credentials if new officials were created as riders
      if (resp.data?.newOfficialCredentials && resp.data.newOfficialCredentials.length > 0) {
        const credentials = resp.data.newOfficialCredentials;
        message += "\n\n🔐 New Rider Accounts Created:\n";
        credentials.forEach(cred => {
          message += `\n${cred.position}: ${cred.phone}\nPassword: ${cred.temporaryPassword}\n`;
        });
      }
      
      setSuccess(message);
      setIsEditingOfficials(false);
      await fetchSacco();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUploadRegistrationDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setError("");
    setSuccess("");

    try {
      const resp = await SaccosAPI.uploadRegistrationDocument(saccoId, file);
      if (!resp.success) throw new Error(resp.error || "Failed to upload document");
      setSuccess("Registration document uploaded successfully");
      await fetchSacco();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const resp = await SaccosAPI.addSaccoMember(saccoId, newMember);
      if (!resp.success) throw new Error(resp.error || "Failed to add member");
      setSuccess(`Member added successfully. Total: ${resp.data?.totalMembers || 0}`);
      setShowAddMember(false);
      setNewMember({
        fullName: "",
        phoneNumber: "",
        email: "",
        idNumber: "",
        motorbikeModel: "",
        motorbikeRegNumber: "",
      });
      await fetchSacco();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteMember = async (index) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setError("");
    setSuccess("");

    try {
      const resp = await SaccosAPI.deleteSaccoMember(saccoId, index);
      if (!resp.success) throw new Error(resp.error || "Failed to remove member");
      setSuccess("Member removed successfully");
      await fetchSacco();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    setError("");
    setSuccess("");

    try {
      const resp = await SaccosAPI.updateSaccoStatus(saccoId, {
        status: newStatus,
        adminNotes,
      });
      if (!resp.success) throw new Error(resp.data?.message || resp.error || "Failed to update status");
      setSuccess(`Sacco status updated to ${newStatus.toUpperCase()}`);
      await fetchSacco();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-gray-500">Loading sacco details...</p>
      </div>
    );
  }

  if (!sacco) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <Link href="/admin/rider/saccos" className="inline-flex items-center text-orange-700 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Saccos
        </Link>
        <p className="text-red-600">{error || "Sacco not found"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/rider/saccos" className="inline-flex items-center text-orange-700 hover:underline font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Saccos
        </Link>
        <button
          type="button"
          className="inline-flex items-center px-3 py-2 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50"
          onClick={fetchSacco}
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 whitespace-pre-line">{success}</p>
        </div>
      )}

      <header className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{sacco.name}</h1>
          <p className="text-sm text-gray-500">Stage: {sacco.stage}</p>
        </div>
        <StatusBadge status={sacco.status} />
      </header>

      {/* Missing Requirements Alert */}
      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <h3 className="text-sm font-bold text-yellow-900 mb-2">⚠️ Missing Requirements for Activation</h3>
          <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
            {missingFields.map((field, idx) => (
              <li key={idx}>{field}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>
          <p className="text-sm text-gray-700"><span className="font-semibold">Name:</span> {sacco.name}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Stage:</span> {sacco.stage}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Total Members:</span> {sacco.numberOfMembers || 0}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Created:</span> {new Date(sacco.createdAt).toLocaleDateString()}</p>
        </section>

        {/* Chairman */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Chairman</h2>
          <p className="text-sm text-gray-700"><span className="font-semibold">Name:</span> {sacco.chairmanName}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Phone:</span> {sacco.chairmanPhone}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Email:</span> {sacco.chairmanEmail || "—"}</p>
        </section>
      </div>

      {/* Officials Section */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Sacco Officials</h2>
          {!isEditingOfficials && (
            <button
              onClick={() => setIsEditingOfficials(true)}
              className="text-sm text-orange-700 hover:underline font-semibold"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingOfficials ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900 font-semibold mb-1">ℹ️ Auto-Registration</p>
              <p className="text-xs text-blue-800">
                When you add officials with phone numbers, they will automatically be:
              </p>
              <ul className="text-xs text-blue-800 list-disc list-inside mt-1">
                <li>Created as riders in the system</li>
                <li>Added to the member roster</li>
                <li>Sent login credentials via notification</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Secretary Name"
                value={officials.secretaryName}
                onChange={(e) => setOfficials({ ...officials, secretaryName: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="tel"
                placeholder="Secretary Phone *"
                value={officials.secretaryPhone}
                onChange={(e) => setOfficials({ ...officials, secretaryPhone: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Secretary Email"
                value={officials.secretaryEmail}
                onChange={(e) => setOfficials({ ...officials, secretaryEmail: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Treasurer Name"
                value={officials.treasurerName}
                onChange={(e) => setOfficials({ ...officials, treasurerName: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="tel"
                placeholder="Treasurer Phone *"
                value={officials.treasurerPhone}
                onChange={(e) => setOfficials({ ...officials, treasurerPhone: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Treasurer Email"
                value={officials.treasurerEmail}
                onChange={(e) => setOfficials({ ...officials, treasurerEmail: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveOfficials}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
              >
                Save Officials
              </button>
              <button
                onClick={() => setIsEditingOfficials(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Secretary</h3>
              <p className="text-sm text-gray-600">{sacco.secretaryName || "Not set"}</p>
              <p className="text-xs text-gray-500">{sacco.secretaryPhone || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Treasurer</h3>
              <p className="text-sm text-gray-600">{sacco.treasurerName || "Not set"}</p>
              <p className="text-xs text-gray-500">{sacco.treasurerPhone || "—"}</p>
            </div>
          </div>
        )}
      </section>

      {/* Registration Document */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Registration Document</h2>
        {sacco.registrationDocument ? (
          <div>
            <a
              href={resolveAssetUrl(sacco.registrationDocument)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700 hover:underline font-semibold text-sm"
            >
              View Document →
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No registration document uploaded</p>
        )}

        <div>
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            {uploadingDoc ? "Uploading..." : "Upload Document (Image Only)"}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleUploadRegistrationDoc}
              disabled={uploadingDoc}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500 mt-1">Only JPEG, JPG, PNG images allowed (max 10MB)</p>
        </div>
      </section>

      {/* Members Roster */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Member Roster ({sacco.numberOfMembers || 0})</h2>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Member
          </button>
        </div>

        {showAddMember && (
          <form onSubmit={handleAddMember} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name *"
                value={newMember.fullName}
                onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={newMember.phoneNumber}
                onChange={(e) => setNewMember({ ...newMember, phoneNumber: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="ID Number *"
                value={newMember.idNumber}
                onChange={(e) => setNewMember({ ...newMember, idNumber: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Motorbike Model"
                value={newMember.motorbikeModel}
                onChange={(e) => setNewMember({ ...newMember, motorbikeModel: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Bike Reg Number"
                value={newMember.motorbikeRegNumber}
                onChange={(e) => setNewMember({ ...newMember, motorbikeRegNumber: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                Add Member
              </button>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700">Phone</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700">ID Number</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700">Bike Model</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700">Bike Reg</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!sacco.members || sacco.members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No members added yet
                  </td>
                </tr>
              ) : (
                sacco.members.map((member, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{member.fullName}</td>
                    <td className="px-3 py-2">{member.phoneNumber}</td>
                    <td className="px-3 py-2">{member.idNumber}</td>
                    <td className="px-3 py-2">{member.motorbikeModel || "—"}</td>
                    <td className="px-3 py-2">{member.motorbikeRegNumber || "—"}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDeleteMember(idx)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Status Update */}
      <section className="bg-white border border-orange-200 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Update Sacco Status</h2>

        {!canApprove && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-semibold">⚠️ Cannot activate sacco</p>
            <p className="text-xs text-yellow-700 mt-1">Complete all missing requirements first</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes</label>
          <textarea
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Optional notes about this sacco"
          />
        </div>

        <button
          onClick={handleUpdateStatus}
          disabled={updatingStatus || (newStatus === "active" && !canApprove)}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg font-semibold disabled:cursor-not-allowed"
        >
          {updatingStatus ? "Updating..." : "Update Status"}
        </button>
      </section>
    </div>
  );
}
