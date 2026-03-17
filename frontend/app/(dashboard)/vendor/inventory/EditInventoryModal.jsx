import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { InventoryAPI } from '../../../lib/api/inventory';
import { validateInventoryItem } from '../../../lib/validators';

export default function EditInventoryModal({
  isOpen,
  onClose,
  vendorId,
  item,
  categories: initialCategories = [],
  onUpdated,
}) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    quantity: '',
    category: '',
    branchId: '',
    status: 'active',
  });
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [error, setError] = useState(null);

  const normalizeCategoryOption = (category) => {
    if (!category) return null;
    if (typeof category === 'string') {
      const trimmed = category.trim();
      return trimmed ? { key: trimmed, value: trimmed, label: trimmed } : null;
    }

    const value = category.name || category.value || category.category || category._id || category.id;
    const label = category.name || category.category || category.value || value;
    if (!value) return null;

    return {
      key: category._id || category.id || value,
      value,
      label,
    };
  };

  const normalizedCategories = (Array.isArray(categories) ? categories : [])
    .map(normalizeCategoryOption)
    .filter(Boolean);

  useEffect(() => {
    if (isOpen && item) {
      setForm({
        name: item.name || '',
        sku: item.sku || '',
        quantity: item.quantity || 0,
        category: item.category || '',
        branchId: item.branchId || '',
        status: item.status || 'active',
      });
      setError(null);
      setImageFiles([]);
      if (!initialCategories.length && vendorId) {
        InventoryAPI.getCategories(vendorId).then((r) => {
          if (r.success) setCategories(r.data || []);
        });
      }
    }
  }, [isOpen, item, vendorId, initialCategories]);

  const handleSubmit = async () => {
    setError(null);
    const validationData = {
      name: form.name,
      sku: form.sku,
      quantity: Number(form.quantity),
      category: form.category,
      branchId: form.branchId || undefined,
      status: form.status,
    };

    const v = validateInventoryItem(validationData);
    if (!v.isValid) return setError(v.errors.map((e) => e.message).join(', '));

    const data = {
      ...validationData,
      stockQuantity: validationData.quantity,
    };
    delete data.quantity;

    setLoading(true);
    try {
      const resp = await InventoryAPI.updateInventoryItem(vendorId, item.id || item._id, data);
      if (!resp.success) {
        setError(resp.error || 'Failed to update item');
        return;
      }

      if (imageFiles.length > 0) {
        const imageResp = await InventoryAPI.uploadInventoryImages(vendorId, item.id || item._id, imageFiles);
        if (!imageResp.success) {
          setError(imageResp.error || 'Item updated but image upload failed');
          return;
        }
      }

      onUpdated && onUpdated(resp.data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Edit Inventory Item">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <h3 className="text-lg font-semibold mb-2">Edit Inventory Item</h3>
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
            {normalizedCategories.map((c) => (
              <option key={c.key} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700">Add Images</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          />
          {imageFiles.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">{imageFiles.length} image(s) selected</p>
          )}
        </div>
        <Input
          label="Branch ID"
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
        />
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
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button loading={loading} onClick={handleSubmit} className="bg-orange-500">
          Update
        </Button>
      </div>
    </Modal>
  );
}
