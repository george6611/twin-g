import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { OrdersAPI } from '../../../lib/api/orders';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function UpdateStatusModal({ isOpen, onClose, order, onUpdated }) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setStatus(order.status || '');
      setNote('');
      setError('');
    }
  }, [isOpen, order]);

  const submit = async () => {
    if (!order?.id || !status) {
      setError('Order and status are required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await OrdersAPI.updateOrderStatus(order.id, status);
      if (!res.success) {
        throw new Error(res.error || 'Failed to update status');
      }

      if (note.trim()) {
        await OrdersAPI.addOrderNote(order.id, note.trim());
      }

      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Update order status">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Order Status</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">Order #{order?.id}</p>

      <Select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        options={STATUS_OPTIONS}
        placeholder="Choose status"
      />

      <Input
        name="statusNote"
        textarea
        rows={3}
        placeholder="Optional note for timeline/audit"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancel</Button>
        <Button onClick={submit} loading={submitting} className="bg-orange-600 hover:bg-orange-700">
          Confirm Update
        </Button>
      </div>
    </Modal>
  );
}
