import React, { useState, useEffect } from 'react';
import { VendorsAPI } from '../../lib/api';

export default function VendorsTable() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await VendorsAPI.getVendors({ limit: 10 });
      if (resp.success) setVendors(resp.data || []);
      else throw new Error(resp.error || 'Unable to load vendors');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  if (loading) return <p>Loading vendors...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead>
          <tr>
            <th className="py-2 px-4">Vendor ID</th>
            <th className="py-2 px-4">Name</th>
            <th className="py-2 px-4">Email</th>
            <th className="py-2 px-4">Active</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.id} className="border-b">
              <td className="py-2 px-4">{v.id}</td>
              <td className="py-2 px-4">{v.businessName || v.name}</td>
              <td className="py-2 px-4">{v.email}</td>
              <td className="py-2 px-4">{v.isActive ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {vendors.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-500">
                No vendors found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
