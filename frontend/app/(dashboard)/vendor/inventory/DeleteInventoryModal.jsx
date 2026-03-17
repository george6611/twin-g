import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { InventoryAPI } from '../../../lib/api/inventory';

export default function DeleteInventoryModal({ isOpen, onClose, vendorId, itemId, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await InventoryAPI.deleteInventoryItem(vendorId, itemId);
      if (resp.success) {
        onDeleted && onDeleted(itemId);
        onClose();
      } else {
        setError(resp.error || 'Failed to delete');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" ariaLabel="Delete Inventory Item">
      <h3 className="text-lg font-semibold mb-2">Delete Item</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <p>Are you sure you want to permanently delete this inventory item?</p>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button loading={loading} onClick={handleDelete} className="bg-red-500">
          Delete
        </Button>
      </div>
    </Modal>
  );
}
