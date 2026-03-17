import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { VendorsAPI } from '../../../lib/api/vendors';
import validators from '../../../lib/validators';

export default function EditStaffModal({ isOpen, onClose, staff, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', role: '', permissions: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!staff) return;
    setForm({ name: staff.name || '', email: staff.email || '', role: staff.role || 'staff', permissions: staff.permissions || [] });
  }, [staff]);

  const handleSave = async () => {
    setError(null);
    const v = validators.validateStaffUpdate(form);
    if (!v.valid) return setError(v.error || 'Invalid input');
    setLoading(true);
    try {
      const resp = await VendorsAPI.updateStaffPermissions(staff.vendorId || staff.vendor, staff.id || staff._id, { role: form.role, permissions: form.permissions });
      if (resp.success) {
        onSaved && onSaved(resp.data);
        onClose();
      } else {
        setError(resp.error || 'Failed to save');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!staff) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Edit Staff">
      <h3 className="text-lg font-semibold mb-2">Edit Staff</h3>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="space-y-2">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" value={form.email} readOnly />
        <Input label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button loading={loading} onClick={handleSave} className="bg-orange-500">Save</Button>
      </div>
    </Modal>
  );
}
