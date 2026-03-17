'use client';

import { useState } from 'react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Toast from '../../../components/ui/Toast';
import { BranchesAPI } from '../../../lib/api/branches';

/**
 * DeleteBranchModal
 * Main vendor only - delete branch (with confirmation)
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close handler
 * @param {string} props.vendorId - Vendor ID
 * @param {Object} props.branch - Branch data to delete
 * @param {function} props.onSuccess - Callback after successful deletion
 */
export default function DeleteBranchModal({ isOpen, onClose, vendorId, branch, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleConfirm = async () => {
    if (!branch?._id) {
      setToast({
        type: 'error',
        message: 'Branch ID is missing',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await BranchesAPI.deleteBranch(vendorId, branch._id);

      if (!result.success) {
        setToast({
          type: 'error',
          message: result.error || 'Failed to delete branch',
        });
        setLoading(false);
        return;
      }

      setToast({
        type: 'success',
        message: 'Branch deleted successfully!',
      });

      // Notify parent to refresh
      if (onSuccess) onSuccess();

      // Close modal after brief delay
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      console.error('Delete branch error:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete branch',
      });
      setLoading(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleConfirm}
        title="Delete Branch"
        message={`Are you sure you want to delete "${branch?.name}"? This action cannot be undone. Any staff or data associated with this branch may be affected.`}
        dangerZone
        loading={loading}
        confirmText="Delete Branch"
        cancelText="Cancel"
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
