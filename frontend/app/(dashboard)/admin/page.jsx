"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../hooks/useAuth';
import HeroStats from './HeroStats';
import RecentOrders from './RecentOrders';
import VendorsTable from './VendorsTable';
import AdminTable from './AdminTable';
import { OrdersAPI, VendorsAPI } from '../../lib/api';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [vendorsCount, setVendorsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [error, setError] = useState(null);


  useEffect(() => {
    if (!user) return;
    // fetch summary stats
    const fetchDashboardData = async () => {
      try {
        const [vendorsResp, ordersResp] = await Promise.all([
          VendorsAPI.getVendors({ limit: 1 }),
          OrdersAPI.getOrders({ limit: 1 }),
        ]);
        if (vendorsResp.success) setVendorsCount(vendorsResp.data?.meta?.total || 0);
        if (ordersResp.success) setOrdersCount(ordersResp.data?.meta?.total || 0);
        // optionally compute staff and revenue via additional endpoints if exist
      } catch (e) {
        setError(e.message);
      }
    };
    fetchDashboardData();
  }, [user]);

  const isSuper = useMemo(() => user && user.role === 'super_admin', [user]);
  const isAdmin = useMemo(() => user && (user.role === 'admin' || isSuper), [user, isSuper]);

  // quick actions
  const handleCreateVendor = () => router.push('/dashboard/admin/vendors/new');
  const handleCreateAdmin = () => router.push('/dashboard/admin/admins/new');

  if (authLoading || !user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </header>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <section className="mb-8">
        <HeroStats
          vendors={vendorsCount}
          orders={ordersCount}
          staffCount={staffCount}
          revenue={revenue}
        />
      </section>

      <section className="mb-8 flex flex-wrap gap-4">
        {isAdmin && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleCreateVendor}
          >
            Create Vendor
          </button>
        )}
        {isSuper && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={handleCreateAdmin}
          >
            Create Admin
          </button>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Recent Orders</h2>
        <RecentOrders />
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Vendors</h2>
        <VendorsTable />
      </section>

      {isSuper && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Admins</h2>
          <AdminTable />
        </section>
      )}

      <footer className="mt-12 text-center text-gray-500">
        &copy; {new Date().getFullYear()} Delivery Platform
      </footer>
    </div>
  );
}
