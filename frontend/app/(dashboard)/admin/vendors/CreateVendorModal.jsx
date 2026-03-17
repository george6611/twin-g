import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { VendorsAPI } from '../../../lib/api';
import validators from '../../../lib/validators';

export default function CreateVendorModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ businessName: '', email: '', phone: '', address: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async () => {
    const v = validators.validateVendorCreation(form);
    if (!v.isValid) {
      setError(v.errors.map((e) => e.message).join(', '));
      return;
    }
    setLoading(true);
    try {
      const resp = await VendorsAPI.createVendor(form);
      if (resp.success) {
        onCreated && onCreated(resp.data);
        onClose();
      } else {
        setError(resp.error || 'Failed to create vendor');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Create Vendor">
      <h3 className="text-lg font-semibold mb-2">Create Vendor</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <div className="space-y-2">
        <input
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          placeholder="Business Name"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Address"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={loading}
          onClick={handleSubmit}
          className="bg-orange-600"
        >
          Create
        </Button>
      </div>
    </Modal>
  );
}
