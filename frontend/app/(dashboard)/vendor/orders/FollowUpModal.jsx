import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { OrdersAPI } from '../../../lib/api/orders';

export default function FollowUpModal({ isOpen, onClose, order, onAdded }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmed = note.trim();
    if (!order?.id || !trimmed) {
      setError('Please enter a follow-up note');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await OrdersAPI.addOrderNote(order.id, trimmed);
      if (!res.success) {
        throw new Error(res.error || 'Failed to add note');
      }
      onAdded?.();
    } catch (err) {
      setError(err.message || 'Failed to add follow-up note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Add follow-up note">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Follow-up Note</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">Order #{order?.id}</p>

      <Input
        name="followUp"
        textarea
        rows={4}
        placeholder="Write action/update note for this order"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancel</Button>
        <Button onClick={handleSubmit} loading={submitting} className="bg-orange-600 hover:bg-orange-700">
          Save Note
        </Button>
      </div>
    </Modal>
  );
}
