import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { VendorsAPI } from '../../../lib/api/vendors';

export default function DeleteVendorModal({ isOpen, onClose, vendor, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!vendor) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await VendorsAPI.deleteVendor(vendor.id || vendor._id);
      if (resp.success) {
        onDeleted && onDeleted(resp.data);
      } else {
        setError(resp.error || 'Failed to delete');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" ariaLabel="Delete Vendor">
      <h3 className="text-lg font-semibold mb-2">Delete Vendor</h3>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <p>Are you sure you want to permanently delete <strong>{vendor?.name}</strong>? This action cannot be undone.</p>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button loading={loading} variant="danger" onClick={handleDelete} className="bg-red-600">Delete</Button>
      </div>
    </Modal>
  );
}
