import React, { useEffect, useState } from 'react';
import { VendorsAPI } from '../../../lib/api';

export default function VendorFilter({ vendorId, onChange }) {
  const [vendors, setVendors] = useState([]);
  useEffect(() => {
    VendorsAPI.getVendors({ limit: 100 }).then((r) => {
      if (r.success) setVendors(r.data.items || r.data || []);
    });
  }, []);
  return (
    <select
      value={vendorId || ''}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1"
    >
      <option value="">All vendors</option>
      {vendors.map((v) => (
        <option key={v.id || v._id} value={v.id || v._id}>{v.name}</option>
      ))}
    </select>
  );
}
