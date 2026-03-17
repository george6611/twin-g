'use client';

import { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Toast from '../../../components/ui/Toast';
import { BranchesAPI } from '../../../lib/api/branches';

/**
 * EditBranchModal
 * Main vendor only - edit branch details
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close handler
 * @param {string} props.vendorId - Vendor ID
 * @param {Object} props.branch - Branch data to edit
 * @param {function} props.onSuccess - Callback after successful edit
 */
export default function EditBranchModal({ isOpen, onClose, vendorId, branch, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    managerName: '',
    status: 'active',
  });

  // Populate form when branch data is available
  useEffect(() => {
    if (branch && isOpen) {
      setFormData({
        name: branch.name || '',
        location: branch.location || '',
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        managerName: branch.managerName || '',
        status: branch.status || 'active',
      });
      setError(null);
    }
  }, [branch, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Branch name is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!branch?._id) {
      setError('Branch ID is missing');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const result = await BranchesAPI.updateBranch(vendorId, branch._id, {
        name: formData.name.trim(),
        location: formData.location.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        managerName: formData.managerName.trim(),
        status: formData.status,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update branch');
        setToast({
          type: 'error',
          message: result.error || 'Failed to update branch. Please try again.',
        });
        return;
      }

      setToast({
        type: 'success',
        message: 'Branch updated successfully!',
      });

      // Notify parent to refresh
      if (onSuccess) onSuccess();
      
      // Close modal after brief delay to show success toast
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      console.error('Update branch error:', err);
      const message = err.message || 'Failed to update branch';
      setError(message);
      setToast({
        type: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Edit Branch">
        <div className="space-y-4 p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Branch Name *"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Downtown Branch"
              disabled={loading}
              required
            />

            <Input
              label="Location *"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., New York, NY"
              disabled={loading}
              required
            />

            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main St, Suite 100"
              disabled={loading}
            />

            <Input
              label="Phone Number *"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              disabled={loading}
              required
            />

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="branch@example.com"
              disabled={loading}
            />

            <Input
              label="Manager Name"
              name="managerName"
              value={formData.managerName}
              onChange={handleChange}
              placeholder="Manager name"
              disabled={loading}
            />

            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={loading}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
              >
                Update Branch
              </Button>
            </div>
          </form>
        </div>
      </Modal>

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
