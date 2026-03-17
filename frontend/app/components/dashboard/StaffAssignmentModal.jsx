import React from 'react';
import { Modal } from '../ui/Modal';
import { useState } from 'react';

export default function StaffAssignmentModal({ isOpen, onClose, onAssign, vendorId }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  const handleAssign = () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    onAssign({ email, vendorId });
    setEmail('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Assign staff">
      <h3 className="text-lg font-semibold mb-2">Assign Staff</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <input
        type="email"
        placeholder="Staff email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
      />
      <div className="flex justify-end gap-2">
        <button className="px-4 py-2" onClick={onClose}>
          Cancel
        </button>
        <button className="px-4 py-2 bg-orange-600 text-white rounded" onClick={handleAssign}>
          Assign
        </button>
      </div>
    </Modal>
  );
}
