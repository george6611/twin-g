import React, { useState, useEffect } from 'react';
import { AdminAPI } from '../../lib/api/admin';

export default function AdminTable() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await AdminAPI.getAdmins();
      if (resp.success) setAdmins(resp.data || []);
      else throw new Error(resp.error || 'Unable to load admins');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  if (loading) return <p>Loading admins...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead>
          <tr>
            <th className="py-2 px-4">Admin ID</th>
            <th className="py-2 px-4">Name</th>
            <th className="py-2 px-4">Email</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="py-2 px-4">{a.id}</td>
              <td className="py-2 px-4">{a.name}</td>
              <td className="py-2 px-4">{a.email}</td>
            </tr>
          ))}
          {admins.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-gray-500">
                No admins found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
