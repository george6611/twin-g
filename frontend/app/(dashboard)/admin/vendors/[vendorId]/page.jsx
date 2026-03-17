"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useAuth from '../../../../hooks/useAuth';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { VendorsAPI } from '../../../../lib/api/vendors';
import { OrdersAPI } from '../../../../lib/api/orders';
import Button from '../../../../components/ui/Button';
import StatsCard from '../../../../components/dashboard/StatsCard';
import Table from '../../../../components/dashboard/Table';
import SectionWrapper from '../../../../components/dashboard/SectionWrapper';
import EditVendorModal from '../EditVendorModal';
import AddStaffModal from '../AddStaffModal';
import EditStaffModal from '../EditStaffModal';
import DeleteVendorModal from '../DeleteVendorModal';

function VendorDetailsPageContent() {
  const params = useParams();
  const router = useRouter();
  const { vendorId } = params || {};

  const { user, loading: authLoading } = useAuth();

  const [vendor, setVendor] = useState(null);
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({ totalStaff: 0, activeOrders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');

  const [openEditVendor, setOpenEditVendor] = useState(false);
  const [openAddStaff, setOpenAddStaff] = useState(false);
  const [openEditStaff, setOpenEditStaff] = useState(null);
  const [openDeleteVendor, setOpenDeleteVendor] = useState(false);

  const isSuper = useMemo(() => user?.role === 'super_admin', [user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  const allowed = useMemo(() => {
    if (!user) return false;
    if (isSuper) return true;
    const ids = user?.vendorIds || user?.vendors || [];
    return Array.isArray(ids) && ids.includes(vendorId);
  }, [user, isSuper, vendorId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isSuper && !allowed) {
      router.push('/dashboard');
      return;
    }
  }, [authLoading, user, isSuper, allowed, router]);

  const fetchData = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    try {
      const [vResp, sResp] = await Promise.all([
        VendorsAPI.getVendorById(vendorId),
        VendorsAPI.getVendorStaff(vendorId, { page, perPage, sortBy, sortDir, status: filterStatus }),
      ]);

      if (!vResp.success) {
        if (vResp.status === 401) return router.push('/login');
        if (vResp.status === 403) return router.push('/dashboard');
        throw new Error(vResp.error || 'Failed to load vendor');
      }

      setVendor(vResp.data);

      if (!sResp.success) {
        throw new Error(sResp.error || 'Failed to load staff');
      }

      setStaff(sResp.data.items || sResp.data || []);

      const oResp = await OrdersAPI.getOrders({ vendorId, limit: 100, status: 'all' });
      if (oResp.success) {
        const items = oResp.data.items || oResp.data || [];
        const activeOrders = items.filter((o) => o.status && !['delivered', 'cancelled'].includes(o.status)).length;
        const revenue = items.reduce((acc, it) => acc + (Number(it.total || 0) || 0), 0);
        setStats({ totalStaff: (sResp.data.total || sResp.data.length || staff.length), activeOrders, revenue });
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [vendorId, page, perPage, sortBy, sortDir, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onVendorUpdated = (updated) => {
    setVendor(updated);
    fetchData();
  };

  const onStaffAdded = () => fetchData();
  const onStaffUpdated = () => fetchData();
  const onVendorDeleted = () => router.push('/dashboard/admin/vendors');

  if (loading || authLoading) {
    return <div className="p-6">Loading vendor...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-orange-600">{vendor?.name || 'Vendor'}</h1>
          <p className="text-sm text-gray-600">{vendor?.location || vendor?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenEditVendor(true)} className="bg-orange-500 hover:bg-orange-600">Edit</Button>
          {(isAdmin || isSuper) && <Button onClick={() => setOpenAddStaff(true)} className="bg-orange-400 hover:bg-orange-500">Add Staff</Button>}
          {isSuper && (
            <Button variant="danger" onClick={() => setOpenDeleteVendor(true)} className="bg-red-600">Delete</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total Staff" value={stats.totalStaff} accent="orange" />
        <StatsCard title="Active Orders" value={stats.activeOrders} accent="orange" />
        <StatsCard title="Revenue" value={`$${Number(stats.revenue || 0).toFixed(2)}`} accent="orange" />
      </div>

      <SectionWrapper title="Staff" subtitle="Manage vendor staff and permissions">
        <div className="overflow-x-auto">
          <Table
            columns={[
              { key: 'name', title: 'Name' },
              { key: 'role', title: 'Role' },
              { key: 'permissions', title: 'Permissions' },
              { key: 'status', title: 'Status' },
              { key: 'actions', title: 'Actions', render: (r) => r.actions },
            ]}
            data={staff.map((s) => ({
              ...s,
              actions: (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setOpenEditStaff(s)} className="bg-orange-500">Edit</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    try {
                      await VendorsAPI.deactivateStaff(vendorId, s.id);
                      onStaffUpdated();
                    } catch (e) {
                      console.error(e);
                    }
                  }}>Deactivate</Button>
                </div>
              ),
            }))}
            pagination={{ page, perPage, onPageChange: setPage }}
            sort={{ sortBy, sortDir, onSort: (k, d) => { setSortBy(k); setSortDir(d); } }}
            filter={{ status: filterStatus, onFilter: setFilterStatus }}
            rowKey={(r) => r.id || r._id}
          />
        </div>
      </SectionWrapper>

      <SectionWrapper title="Analytics (preview)" subtitle="Vendor level analytics and reports">
        <div className="p-4 border rounded-md bg-white/50">Coming soon — analytics graphs and export tools.</div>
      </SectionWrapper>

      <EditVendorModal isOpen={openEditVendor} onClose={() => setOpenEditVendor(false)} vendor={vendor} onSaved={onVendorUpdated} />
      <AddStaffModal isOpen={openAddStaff} onClose={() => setOpenAddStaff(false)} vendorId={vendorId} onAdded={onStaffAdded} />
      <EditStaffModal staff={openEditStaff} isOpen={!!openEditStaff} onClose={() => setOpenEditStaff(null)} onSaved={onStaffUpdated} />
      <DeleteVendorModal isOpen={openDeleteVendor} onClose={() => setOpenDeleteVendor(false)} vendor={vendor} onDeleted={onVendorDeleted} />
    </div>
  );
}

export default function VendorDetailsPage() {
  return (
    <ProtectedRoute requiredRoles={["admin", "super_admin"]} fallbackUrl="/">
      <VendorDetailsPageContent />
    </ProtectedRoute>
  );
}
