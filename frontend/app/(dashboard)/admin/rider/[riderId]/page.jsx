"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { RidersAPI } from "../../../../lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const STATUS_OPTIONS = ["submitted", "pending", "active", "suspended", "rejected"];

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

function DocLink({ label, value }) {
  const href = resolveAssetUrl(value);
  if (!href) return <p className="text-sm text-gray-500">{label}: Not uploaded</p>;
  return (
    <p className="text-sm">
      <span className="text-gray-600">{label}: </span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-700 font-semibold hover:underline">
        View file
      </a>
    </p>
  );
}

export default function AdminRiderDetailPage() {
  const { riderId } = useParams();
  const [rider, setRider] = useState(null);
  const [saccos, setSaccos] = useState([]);
  const [saccosLoading, setSaccosLoading] = useState(false);
  const [saccosError, setSaccosError] = useState("");
  const [selectedSaccoId, setSelectedSaccoId] = useState("");
  const [status, setStatus] = useState("submitted");
  const [adminNotes, setAdminNotes] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [motorbikeModel, setMotorbikeModel] = useState("");
  const [vehicleRegNumber, setVehicleRegNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [assigningSacco, setAssigningSacco] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingDetails, setUpdatingDetails] = useState(false);
  const [passportFile, setPassportFile] = useState(null);
  const [drivingLicenseFile, setDrivingLicenseFile] = useState(null);
  const [validInsuranceFile, setValidInsuranceFile] = useState(null);
  const [saccoProofFile, setSaccoProofFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const profileImageUrl = useMemo(() => resolveAssetUrl(rider?.profileImage), [rider]);

  const fetchRider = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await RidersAPI.getRiderById(riderId);
      if (!resp.success) throw new Error(resp.error || "Failed to load rider details");

      const fetched = resp.data?.rider;
      setRider(fetched || null);
      setSelectedSaccoId(fetched?.saccoId?._id || "");
      setStatus(fetched?.status || "submitted");
      setAdminNotes(fetched?.adminNotes || "");
      setNationalId(fetched?.nationalId || "");
      setMotorbikeModel(fetched?.motorbikeModel || "");
      setVehicleRegNumber(fetched?.vehicleRegNumber || "");
    } catch (e) {
      setError(e.message || "Failed to load rider details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (riderId) fetchRider();
  }, [riderId]);

  useEffect(() => {
    let mounted = true;

    const fetchSaccos = async () => {
      setSaccosLoading(true);
      setSaccosError("");
      try {
        const resp = await RidersAPI.getOnboardingSaccos();
        if (!mounted) return;

        if (!resp.success) {
          setSaccos([]);
          setSaccosError(resp.data?.message || resp.error || "Failed to load saccos");
          return;
        }

        const items = Array.isArray(resp.data?.saccos) ? resp.data.saccos : [];
        const assignable = items.filter((item) => ["pending", "active"].includes(String(item.status || "").toLowerCase()));
        setSaccos(assignable);
        if (assignable.length === 0) {
          setSaccosError("No pending or active saccos available for assignment");
        }
      } catch (e) {
        if (!mounted) return;
        setSaccos([]);
        setSaccosError(e?.message || "Failed to load saccos");
      } finally {
        if (mounted) {
          setSaccosLoading(false);
        }
      }
    };

    fetchSaccos();
    return () => {
      mounted = false;
    };
  }, []);

  const submitStatus = async (nextStatus) => {
    if (!riderId) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const resp = await RidersAPI.updateRiderStatus(riderId, {
        status: nextStatus,
        adminNotes,
      });

      if (!resp.success) {
        const message = resp.data?.message || resp.error || "Failed to update rider status";
        throw new Error(message);
      }

      setSuccess(`Rider status updated to ${nextStatus.toUpperCase()}`);
      await fetchRider();
    } catch (e) {
      setError(e.message || "Failed to update rider status");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDocuments = async (verified = true) => {
    if (!riderId) return;
    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const resp = await RidersAPI.verifyRiderDocuments(riderId, {
        verified,
        adminNotes,
      });

      if (!resp.success) {
        const message = resp.data?.message || resp.error || "Failed to verify documents";
        throw new Error(message);
      }

      setSuccess(verified ? "Documents verified successfully" : "Verification removed");
      await fetchRider();
    } catch (e) {
      setError(e.message || "Failed to verify documents");
    } finally {
      setVerifying(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (!riderId) return;
    if (!passportFile && !drivingLicenseFile && !validInsuranceFile && !saccoProofFile) {
      setError("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const files = {};
      if (passportFile) files.profileImage = passportFile;
      if (drivingLicenseFile) files.drivingLicense = drivingLicenseFile;
      if (validInsuranceFile) files.validInsurance = validInsuranceFile;
      if (saccoProofFile) files.saccoProof = saccoProofFile;

      const resp = await RidersAPI.uploadRiderDocuments(riderId, files);

      if (!resp.success) {
        const message = resp.data?.message || resp.error || "Failed to upload documents";
        throw new Error(message);
      }

      setSuccess("Files uploaded successfully");
      setPassportFile(null);
      setDrivingLicenseFile(null);
      setValidInsuranceFile(null);
      setSaccoProofFile(null);
      await fetchRider();
    } catch (e) {
      setError(e.message || "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleAssignSacco = async () => {
    if (!riderId) return;
    if (!selectedSaccoId) {
      setError("Please select a sacco");
      return;
    }

    setAssigningSacco(true);
    setError("");
    setSuccess("");

    try {
      const resp = await RidersAPI.assignRiderSacco(riderId, {
        saccoId: selectedSaccoId,
        adminNotes,
      });

      if (!resp.success) {
        const message = resp.data?.message || resp.error || "Failed to assign sacco";
        throw new Error(message);
      }

      setSuccess("Rider sacco updated successfully");
      await fetchRider();
    } catch (e) {
      setError(e.message || "Failed to assign sacco");
    } finally {
      setAssigningSacco(false);
    }
  };

  const handleUpdateDetails = async () => {
    if (!riderId) return;

    setUpdatingDetails(true);
    setError("");
    setSuccess("");

    try {
      const resp = await RidersAPI.updateRiderDetails(riderId, {
        nationalId,
        motorbikeModel,
        vehicleRegNumber,
        adminNotes,
      });

      if (!resp.success) {
        const message = resp.data?.message || resp.error || "Failed to update rider details";
        throw new Error(message);
      }

      setSuccess("Rider details updated successfully");
      await fetchRider();
    } catch (e) {
      setError(e.message || "Failed to update rider details");
    } finally {
      setUpdatingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-gray-500">Loading rider details...</p>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <Link href="/admin/rider" className="inline-flex items-center text-orange-700 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Riders
        </Link>
        <p className="text-red-600">{error || "Rider not found"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700"><span className="font-semibold">National ID:</span> {rider.nationalId || "—"}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Motorbike Model:</span> {rider.motorbikeModel || "—"}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Bike Reg Number:</span> {rider.vehicleRegNumber || "—"}</p>
        <Link href="/admin/rider" className="inline-flex items-center text-orange-700 hover:underline font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Riders
        </Link>
        <button
          type="button"
          className="inline-flex items-center px-3 py-2 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50"
          onClick={fetchRider}
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </button>
      </div>

      <header className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{rider.fullName || "Rider"}</h1>
          <p className="text-sm text-gray-500">Rider ID: {rider._id}</p>
        </div>
        <StatusBadge status={rider.status} />
      </header>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Rider Details</h2>
          <p className="text-sm text-gray-700"><span className="font-semibold">Name:</span> {rider.fullName || "—"}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Phone:</span> {rider.phoneNumber || "—"}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Email:</span> {rider.email || "—"}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Sacco:</span> {rider.saccoId?.name || rider.declaredSaccoName || "—"}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Stage:</span> {rider.stage || "—"}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Rating:</span> {(typeof rider.rating === "number" ? rider.rating : 0).toFixed(1)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Registration Status:</span> {rider.registrationStatus || "—"}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Passport Photo</h2>
          {profileImageUrl ? (
            <img src={profileImageUrl} alt="Rider passport" className="w-full h-52 object-cover rounded-lg border border-gray-200" />
          ) : (
            <div className="w-full h-52 rounded-lg border border-dashed border-gray-300 text-gray-500 flex items-center justify-center text-sm">
              No passport photo uploaded
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
            <label className="block text-xs font-semibold text-gray-700">Upload Passport Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2"
            />
            {passportFile && <p className="text-xs text-green-600">Selected: {passportFile.name}</p>}
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Uploaded Documents</h2>
        <DocLink label="Driving License" value={rider.onboardingDocuments?.drivingLicenseUrl} />
        <DocLink label="Valid Insurance" value={rider.onboardingDocuments?.validInsuranceUrl} />
        <DocLink label="Sacco Proof" value={rider.onboardingDocuments?.saccoProofUrl} />

        <div className="pt-3 border-t border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Upload Documents (Admin)</h3>
          <p className="text-xs text-gray-600 mb-3">
            Upload documents on behalf of the rider. When all required onboarding documents are present, they are auto-verified.
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Driving License
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setDrivingLicenseFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2"
              />
              {drivingLicenseFile && (
                <p className="text-xs text-green-600 mt-1">Selected: {drivingLicenseFile.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Valid Insurance
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setValidInsuranceFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2"
              />
              {validInsuranceFile && (
                <p className="text-xs text-green-600 mt-1">Selected: {validInsuranceFile.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sacco Proof
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSaccoProofFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2"
              />
              {saccoProofFile && (
                <p className="text-xs text-green-600 mt-1">Selected: {saccoProofFile.name}</p>
              )}
            </div>

            <button
              type="button"
              disabled={uploading || (!passportFile && !drivingLicenseFile && !validInsuranceFile && !saccoProofFile)}
              onClick={handleUploadDocuments}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-semibold text-sm"
            >
              {uploading ? "Uploading..." : "Upload Selected Documents"}
            </button>
          </div>
        </div>

        {rider.onboardingDocuments?.verified && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Verification Status</h3>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                ✓ VERIFIED
              </span>
            </div>
            {rider.onboardingDocuments?.verifiedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Verified on {new Date(rider.onboardingDocuments.verifiedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Motorcycle & ID Details</h2>
        <p className="text-xs text-gray-600">
          These details sync with the sacco member roster to maintain data consistency.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">National ID Number</label>
            <input
              type="text"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter national ID"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Motorbike Model</label>
            <input
              type="text"
              value={motorbikeModel}
              onChange={(e) => setMotorbikeModel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Honda CB 125"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Bike Registration Number</label>
            <input
              type="text"
              value={vehicleRegNumber}
              onChange={(e) => setVehicleRegNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., KXX 123Y"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={updatingDetails}
          onClick={handleUpdateDetails}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-lg font-semibold"
        >
          {updatingDetails ? "Saving..." : "Save Motorcycle Details"}
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Sacco Information</h2>
        {rider.saccoId ? (
          <>
            <p className="text-sm text-gray-700"><span className="font-semibold">Sacco Name:</span> {rider.saccoId.name || "—"}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Stage:</span> {rider.saccoId.stage || "—"}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Chairman:</span> {rider.saccoId.chairmanName || "—"}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Chairman Phone:</span> {rider.saccoId.chairmanPhone || "—"}</p>
            {rider.saccoId.members && rider.saccoId.members.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Roster Members ({rider.saccoId.members.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {rider.saccoId.members.slice(0, 10).map((member, idx) => (
                    <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <span className="font-medium">{member.fullName}</span>
                      {member.phoneNumber && <span className="ml-2">• {member.phoneNumber}</span>}
                      {member.email && <span className="ml-2">• {member.email}</span>}
                    </div>
                  ))}
                  {rider.saccoId.members.length > 10 && (
                    <p className="text-xs text-gray-500 italic">...and {rider.saccoId.members.length - 10} more</p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">No sacco assigned. Declared sacco: {rider.declaredSaccoName || "—"}</p>
        )}

        <div className="pt-3 border-t border-gray-200 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Assign / Change Sacco</h3>
          {!rider.onboardingDocuments?.verified ? (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                Verify rider documents first, then you can assign or change the rider sacco.
              </p>
            </div>
          ) : null}

          {saccosLoading ? <p className="text-xs text-gray-500">Loading saccos...</p> : null}
          {saccosError ? <p className="text-xs text-red-600">{saccosError}</p> : null}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Registered Sacco</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={selectedSaccoId}
              onChange={(e) => setSelectedSaccoId(e.target.value)}
              disabled={!rider.onboardingDocuments?.verified || assigningSacco || saccosLoading || saccos.length === 0}
            >
              <option value="">Select sacco</option>
              {saccos.map((sacco) => (
                <option key={sacco._id} value={sacco._id}>
                  {sacco.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAssignSacco}
            disabled={!rider.onboardingDocuments?.verified || assigningSacco || !selectedSaccoId}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:cursor-not-allowed"
          >
            {assigningSacco ? "Saving..." : "Save Sacco"}
          </button>
        </div>
      </section>

      <section className="bg-white border border-orange-200 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Update Rider Status</h2>

        {!rider.onboardingDocuments?.verified && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-semibold">⚠️ Documents Not Verified</p>
            <p className="text-xs text-yellow-700 mt-1">
              You must verify the rider's documents before changing status to Active or Suspended.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
            placeholder="Optional note for this rider"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => submitStatus(status)}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-lg font-semibold"
          >
            {saving ? "Saving..." : "Save Status"}
          </button>

          <button
            type="button"
            disabled={saving || !rider.onboardingDocuments?.verified}
            onClick={() => submitStatus("active")}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg font-semibold disabled:cursor-not-allowed"
            title={!rider.onboardingDocuments?.verified ? "Documents must be verified first" : ""}
          >
            Activate Rider
          </button>

          <button
            type="button"
            disabled={saving || !rider.onboardingDocuments?.verified}
            onClick={() => submitStatus("suspended")}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg font-semibold disabled:cursor-not-allowed"
            title={!rider.onboardingDocuments?.verified ? "Documents must be verified first" : ""}
          >
            Deactivate Rider
          </button>
        </div>

        {success ? <p className="text-sm text-green-700">{success}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
