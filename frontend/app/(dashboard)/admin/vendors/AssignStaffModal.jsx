import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { VendorsAPI } from '../../../lib/api';
import validators from '../../../lib/validators';

export default function AssignStaffModal({ isOpen, onClose, vendor, onAssigned }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError('Email required');
      return;
    }
    setLoading(true);
    try {
      const resp = await VendorsAPI.createStaff(vendor.id, { email });
      if (resp.success) {
        onAssigned && onAssigned(resp.data);
        onClose();
      } else {
        setError(resp.error || 'Failed to invite');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Assign Staff">
      <h3 className="text-lg font-semibold mb-2">Invite Vendor Staff</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <input
        type="email"
        placeholder="Staff email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={loading}
          onClick={handleSubmit}
          className="bg-orange-600"
        >
          Invite
        </Button>
      </div>
    </Modal>
  );
}
