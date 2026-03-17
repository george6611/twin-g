'use client';

import { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import TextArea from '../../../components/ui/TextArea';
import FileUpload from '../../../components/ui/FileUpload';
import Toast from '../../../components/ui/Toast';
import { VendorAPI } from '../../../lib/api/vendor';

/**
 * EditBusinessInfoModal
 * Main vendor only - edit business profile information
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close handler
 * @param {string} props.vendorId - Vendor ID
 * @param {Object} props.vendor - Vendor data
 * @param {function} props.onSuccess - Callback after successful save
 */
export default function EditBusinessInfoModal({
  isOpen,
  onClose,
  vendorId,
  vendor,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    registrationNumber: '',
    taxNumber: '',
    website: '',
    businessDescription: '',
  });

  useEffect(() => {
    if (vendor && isOpen) {
      setFormData({
        businessName: vendor.businessName || '',
        businessEmail: vendor.businessEmail || '',
        businessPhone: vendor.businessPhone || '',
        businessAddress: vendor.businessAddress || '',
        registrationNumber: vendor.registrationNumber || '',
        taxNumber: vendor.taxNumber || '',
        website: vendor.website || '',
        businessDescription: vendor.businessDescription || '',
      });
      setLogoFile(null);
      setError(null);
    }
  }, [vendor, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleLogoSelect = (file) => {
    setLogoFile(file);
  };

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (!formData.businessEmail.trim()) {
      setError('Business email is required');
      return false;
    }
    if (!formData.businessPhone.trim()) {
      setError('Business phone is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);

    try {
      const updateData = {
        businessName: formData.businessName.trim(),
        businessEmail: formData.businessEmail.trim(),
        businessPhone: formData.businessPhone.trim(),
        businessAddress: formData.businessAddress.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        taxNumber: formData.taxNumber.trim(),
        website: formData.website.trim(),
        businessDescription: formData.businessDescription.trim(),
      };

      // Update profile
      let result = await VendorAPI.updateVendorProfile(vendorId, updateData);

      if (!result.success) {
        setError(result.error || 'Failed to update business info');
        setToast({
          type: 'error',
          message: result.error || 'Failed to update business info',
        });
        setLoading(false);
        return;
      }

      // Upload logo if provided
      if (logoFile) {
        const logoResult = await VendorAPI.uploadVendorLogo(vendorId, logoFile);
        if (!logoResult.success) {
          setToast({
            type: 'warning',
            message: 'Profile updated, but logo upload failed',
          });
        }
      }

      setToast({
        type: 'success',
        message: 'Business information updated successfully!',
      });

      if (onSuccess) onSuccess();
      
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      console.error('Update business info error:', err);
      const message = err.message || 'Failed to update business info';
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
    setLogoFile(null);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Edit Business Information">
        <div className="space-y-4 p-6 max-h-96 overflow-y-auto">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Business Name *"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Your Business Name"
              disabled={loading}
              required
            />

            <Input
              label="Business Email *"
              name="businessEmail"
              type="email"
              value={formData.businessEmail}
              onChange={handleChange}
              placeholder="contact@business.com"
              disabled={loading}
              required
            />

            <Input
              label="Business Phone *"
              name="businessPhone"
              type="tel"
              value={formData.businessPhone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              disabled={loading}
              required
            />

            <Input
              label="Business Address"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleChange}
              placeholder="123 Business Ave, Suite 100"
              disabled={loading}
            />

            <Input
              label="Registration Number"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              placeholder="REG-2024-001"
              disabled={loading}
            />

            <Input
              label="Tax Number"
              name="taxNumber"
              value={formData.taxNumber}
              onChange={handleChange}
              placeholder="TAX-123456789"
              disabled={loading}
            />

            <Input
              label="Website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              disabled={loading}
            />

            <TextArea
              label="Business Description"
              name="businessDescription"
              value={formData.businessDescription}
              onChange={handleChange}
              placeholder="Describe your business..."
              disabled={loading}
              rows="3"
            />

            <FileUpload
              label="Business Logo"
              onFileSelect={handleLogoSelect}
              acceptedFormats={['image/jpeg', 'image/png']}
              maxSizeMB={2}
              preview={logoFile ? URL.createObjectURL(logoFile) : vendor?.logoUrl}
              previewAlt="Business Logo"
              disabled={loading}
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
                Save Changes
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
