"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, Eye } from 'lucide-react';
import Link from 'next/link';

import useAuth from '../../../hooks/useAuth';
import useOrders from '../../../hooks/useOrders';
import Button from '../../../components/ui/Button';

// Local Components
import StatsSection from './_components/StatsSection'; 
import OrdersTable from './_components/OrdersTable';

export default function AdminOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { orders, loading: ordersLoading, fetchOrders } = useOrders();
  
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Initial Data Fetch
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  // 2. Filter Logic (Local for performance)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  // 3. Auth Guard Flicker Protection
  // If Middleware passed, we know they are admin, but we wait for the 'user' object to load
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Monitoring</h1>
          <p className="text-sm text-gray-500">Real-time overview of all platform deliveries</p>
        </div>
        <Button onClick={() => fetchOrders()} variant="outline">
          <RefreshCw size={16} className="mr-2" /> Refresh Data
        </Button>
      </header>

      {/* Quick Insights */}
      <StatsSection orders={orders} />

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by Order ID or Customer..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="secondary">
          <Filter size={18} className="mr-2" /> Filters
        </Button>
      </div>

      {/* The Table - View Only */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <OrdersTable 
          orders={filteredOrders} 
          isLoading={ordersLoading} 
          renderActions={(order) => (
            <Link href={`/admin/orders/${order.id}`}>
              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50">
                <Eye size={16} className="mr-2" /> View Details
              </Button>
            </Link>
          )}
        />
      </div>
    </div>
  );
}