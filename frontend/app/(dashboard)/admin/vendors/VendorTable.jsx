import React, { useState, useEffect, useMemo } from 'react';
import Table from '../../../components/dashboard/Table';
import Button from '../../../components/ui/Button';
import { VendorsAPI } from '../../../lib/api';
import utils from '../../../lib/utils';

export default function VendorTable({ onEdit, onDelete, onAssignStaff }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await VendorsAPI.getVendors({ limit: 20, page });
      if (resp.success) setVendors(resp.data?.data || []);
      else throw new Error(resp.error || 'Unable to load vendors');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page]);

  const columns = useMemo(() => [
    { key: 'businessName', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'phone', title: 'Phone' },
    {
      key: 'isActive',
      title: 'Status',
      render: (row) => (row.isActive ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button size="sm" className="bg-orange-500" onClick={() => onAssignStaff(row)}>
            Staff
          </Button>
          {onDelete && (
            <Button size="sm" className="bg-red-500" onClick={() => onDelete(row)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ], [onEdit, onDelete, onAssignStaff]);

  if (loading) return <p>Loading vendors...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return <Table columns={columns} data={vendors} />;
}
