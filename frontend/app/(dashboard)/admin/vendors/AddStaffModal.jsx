import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { VendorsAPI } from '../../../lib/api/vendors';
import validators from '../../../lib/validators';

export default function AddStaffModal({ isOpen, onClose, vendorId, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAdd = async () => {
    setError(null);
    const v = validators.validateStaffCreation(form);
    if (!v.valid) return setError(v.error || 'Invalid input');
    setLoading(true);
    try {
      const resp = await VendorsAPI.createStaff(vendorId, form);
      if (resp.success) {
        onAdded && onAdded(resp.data);
        onClose();
      } else {
        setError(resp.error || 'Failed to add');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Add Staff">
      <h3 className="text-lg font-semibold mb-2">Add Staff</h3>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="space-y-2">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button loading={loading} onClick={handleAdd} className="bg-orange-500">Add</Button>
      </div>
    </Modal>
  );
}
