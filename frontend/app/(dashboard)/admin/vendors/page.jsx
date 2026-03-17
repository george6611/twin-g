"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
// No need for useRouter or redirect Effects anymore!
import VendorStats from './Stats';
import VendorTable from './VendorTable';
import CreateVendorModal from './CreateVendorModal';
import EditVendorModal from './EditVendorModal';
import AssignStaffModal from './AssignStaffModal';
import Button from '../../../components/ui/Button';
import { VendorsAPI } from '../../../lib/api/vendors';
import { Search, Plus } from 'lucide-react';

export default function VendorsPage({ user }) {
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [assignVendor, setAssignVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isSuper = useMemo(() => user?.role === 'super_admin', [user]);

  const fetchStats = useCallback(async () => {
    try {
      const resp = await VendorsAPI.getVendors({ limit: 1 });
      if (resp.success) {
        const total = resp.data?.meta?.total || 0;
        setStats({ total, active: total, pending: 0 });
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleDelete = async (v) => {
    if (!isSuper) return;
    if (confirm(`Deactivate ${v.name}?`)) {
      const resp = await VendorsAPI.updateVendor(v.id, { isActive: false });
      if (resp.success) fetchStats();
    }
  };

  // 🚩 ALL THE "IF (!USER) REDIRECT" STUFF IS GONE!

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Vendor Management</h1>
        <Button variant="primary" className="bg-orange-600" onClick={() => setShowCreate(true)}>
          <Plus className="w-5 h-5 mr-2" /> Create Vendor
        </Button>
      </header>

      <VendorStats {...stats} />

      <div className="relative my-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          className="w-full border rounded-xl pl-10 pr-4 py-3"
          placeholder="Search..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <VendorTable
        searchTerm={searchTerm}
        onEdit={setEditVendor}
        onAssignStaff={setAssignVendor}
        onDelete={isSuper ? handleDelete : null}
      />

      {/* Modals remain the same... */}
    </div>
  );
}