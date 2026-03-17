'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../../hooks/useAuth';
import { StaffAPI } from '../../../lib/api/staff';
import { VendorsAPI } from '../../../lib/api/vendors';
import Button from '../../../components/ui/Button';
import SectionWrapper from '../../../components/dashboard/SectionWrapper';
import Table from '../../../components/dashboard/Table';
import AddStaffModal from '../AddStaffModal';

// Helper to extract staff array from response
function extractStaffArray(response) {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];
  
  // Try common response shapes
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray(response.data.items)) return response.data.items;
  
  return [];
}

// Helper to extract branches array
function extractBranchesArray(response) {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];
  
  // Try common response shapes
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray(response.data.items)) return response.data.items;
  
  return [];
}

export default function VendorStaffPage() {
  const router = useRouter();
  const { user, loading: authLoading, isVendor } = useAuth();
  
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);

  const vendorId = user?.vendorId || (user?.vendorIds && user.vendorIds[0]);

  const fetchStaff = async () => {
    if (!vendorId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await StaffAPI.getAllStaff(vendorId);
      
      console.log("📦 [VendorStaffPage] Staff fetch result:", result);
      
      if (result.success) {
        const staffData = extractStaffArray(result.data);
        console.log("📦 [VendorStaffPage] Extracted staff array:", staffData);
        setStaff(Array.isArray(staffData) ? staffData : []);
      } else {
        setError(result.error || 'Failed to load staff');
      }
    } catch (err) {
      console.error("❌ [VendorStaffPage] Error fetching staff:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!vendorId) return;
    
    try {
      const result = await VendorsAPI.getBranches(vendorId);
      
      if (result.success) {
        const branchesData = extractBranchesArray(result.data);
        setBranches(Array.isArray(branchesData) ? branchesData : []);
      }
    } catch (err) {
      console.error("❌ [VendorStaffPage] Error fetching branches:", err);
    }
  };

  const onStaffAdded = () => {
    fetchStaff();
  };

  useEffect(() => {
    if (vendorId) {
      fetchStaff();
      fetchBranches();
    }
  }, [vendorId]);

  if (authLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isVendor()) {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <Button
          onClick={() => setShowAddStaff(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Add Staff Member
        </Button>
      </div>

      <SectionWrapper title="All Staff">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading staff...</div>
        ) : !Array.isArray(staff) || staff.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No staff members yet.
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => setShowAddStaff(true)}
                className="bg-orange-500"
              >
                Add Your First Staff Member
              </Button>
            </div>
          </div>
        ) : (
          <Table
            columns={[
              { key: 'name', title: 'Name' },
              { key: 'email', title: 'Email' },
              { key: 'position', title: 'Position' },
              { key: 'staffLevel', title: 'Level' },
              { key: 'branch', title: 'Branch' },
              {
                key: 'status',
                title: 'Status',
                render: (row) => (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    row.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {row.isActive ? '✓ Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'actions',
                title: 'Actions',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button size="sm">Edit</Button>
                    <Button size="sm" className="bg-red-500">
                      Deactivate
                    </Button>
                  </div>
                ),
              },
            ]}
            data={staff.map((s) => ({
              ...s,
              position: s.position || 'Staff',
              staffLevel: s.staffLevel || 'junior',
              branch: s.branchName || '-',
            }))}
          />
        )}
      </SectionWrapper>

      <AddStaffModal
        isOpen={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        vendorId={vendorId}
        branches={branches}
        onAdded={onStaffAdded}
      />
    </div>
  );
}
