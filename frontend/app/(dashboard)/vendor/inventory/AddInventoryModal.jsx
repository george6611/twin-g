import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { InventoryAPI } from '../../../lib/api/inventory';
import { validateInventoryItem } from '../../../lib/validators';

export default function AddInventoryModal({
  isOpen,
  onClose,
  vendorId,
  branchId = null,
  categories: initialCategories = [],
  onAdded,
}) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    quantity: '',
    category: '',
    branchId: branchId || '',
    status: 'active',
  });
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: '',
        sku: '',
        quantity: '',
        category: '',
        branchId: branchId || '',
        status: 'active',
      });
      setError(null);
      if (!initialCategories.length && vendorId) {
        InventoryAPI.getCategories(vendorId).then((r) => {
          if (r.success) setCategories(r.data || []);
        });
      }
    }
  }, [isOpen, branchId, vendorId, initialCategories]);

  const handleSubmit = async () => {
    setError(null);
    const data = {
      name: form.name,
      sku: form.sku,
      quantity: Number(form.quantity),
      category: form.category,
      branchId: form.branchId || undefined,
      status: form.status,
    };

    const v = validateInventoryItem(data);
    if (!v.isValid) return setError(v.errors.map((e) => e.message).join(', '));

    setLoading(true);
    try {
      const resp = await InventoryAPI.createInventoryItem(vendorId, data);
      if (resp.success) {
        onAdded && onAdded(resp.data);
        onClose();
      } else {
        setError(resp.error || 'Failed to create item');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Add Inventory Item">
      <h3 className="text-lg font-semibold mb-2">Add Inventory Item</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <Input
        label="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        label="SKU / Code"
        value={form.sku}
        onChange={(e) => setForm({ ...form, sku: e.target.value })}
      />
      <Input
        label="Quantity"
        type="number"
        value={form.quantity}
        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
      />
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id || c._id || c.name} value={c.name || c.id || c._id}>
              {c.name || c.category}
            </option>
          ))}
        </select>
      </div>
      {!branchId && (
        <Input
          label="Branch ID"
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
        />
      )}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button loading={loading} onClick={handleSubmit} className="bg-orange-500">
          Add
        </Button>
      </div>
    </Modal>
  );
}
