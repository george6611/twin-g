'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { BranchesAPI } from '../../../lib/api/branches';

export default function CreateBranchModal({ isOpen, onClose, vendorId, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    street: '',
    city: '',
    region: 'Kenya',
    postalCode: '',
    country: 'Kenya',
    phone: '',
    email: '',
    manager: '',
    latitude: -1.286389, // Default to Nairobi
    longitude: 36.817223,
    isPrimary: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: '',
        description: '',
        street: '',
        city: '',
        region: 'Kenya',
        postalCode: '',
        country: 'Kenya',
        phone: '',
        email: '',
        manager: '',
        latitude: -1.286389,
        longitude: 36.817223,
        isPrimary: false,
      });
      setError(null);
      setUseCurrentLocation(false);
    }
  }, [isOpen]);

  // Get current location from GPS
  const handleGetCurrentLocation = () => {
    setGpsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
       
        setForm((prev) => ({
          ...prev,
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
        }));
        setUseCurrentLocation(true);
        setGpsLoading(false);
      },
      (err) => {
        console.error('❌ GPS Error:', err);
        setError(`GPS Error: ${err.message}`);
        setGpsLoading(false);
      }
    );
  };

  const handleAdd = async () => {
    setError(null);

    // Validation
    if (!form.name.trim()) {
      return setError('Branch name is required');
    }
    if (!form.city.trim()) {
      return setError('City is required');
    }

    if (form.latitude === null || form.longitude === null) {
      return setError('Location coordinates are required');
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name,
        description: form.description,
        address: {
          street: form.street,
          city: form.city,
          region: form.region,
          postalCode: form.postalCode,
          country: form.country,
          description: form.description,
        },
        phone: form.phone,
        email: form.email,
        manager: form.manager || null,
        latitude: form.latitude,
        longitude: form.longitude,
        isPrimary: form.isPrimary,
      };

    const resp = await BranchesAPI.createBranch(vendorId, payload);

if (!resp || resp.success !== true) {
  setError(resp?.error || resp?.message || 'Failed to create branch');
  return;
}

onSuccess && onSuccess(resp.data);
onClose();   
    
     
    } catch (e) {
      console.error('❌ Error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" ariaLabel="Add Branch">
      <div className="flex flex-col h-full bg-white max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-orange-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">➕ Add New Branch</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-3 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Branch Details Section */}
          <div className="space-y-4 pb-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 text-base">Branch Details</h4>

            <Input
              label="Branch Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Downtown Branch"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Branch description (optional)"
                rows="2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Manager Name"
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                placeholder="Branch manager (optional)"
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="branch@example.com"
            />

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <input
                type="checkbox"
                id="isPrimary"
                checked={form.isPrimary}
                onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                className="w-4 h-4 text-orange-500 rounded accent-orange-500"
              />
              <label htmlFor="isPrimary" className="text-sm text-gray-700 font-medium">
                Set as primary/main branch
              </label>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4 pb-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 text-base">Address</h4>

            <Input
              label="Street"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="Street address (optional)"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City *"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g., Nairobi"
                required
              />
              <Input
                label="Region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="e.g., Kenya"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Postal Code"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="00100"
              />
              <Input
                label="Country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Kenya"
              />
            </div>
          </div>

          {/* GPS Section */}
          <div className="space-y-4 pb-4">
            <h4 className="font-semibold text-gray-900 text-base">📍 Location Coordinates</h4>

            {useCurrentLocation && form.latitude && form.longitude && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm font-medium">
                  ✓ GPS: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitude *"
                type="number"
                step="0.000001"
                value={form.latitude || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    latitude: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="-1.286389"
                required
              />
              <Input
                label="Longitude *"
                type="number"
                step="0.000001"
                value={form.longitude || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    longitude: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="36.817223"
                required
              />
            </div>

            <Button
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading || loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {gpsLoading ? '⏳ Getting location...' : '📍 Use Current Location (GPS)'}
            </Button>

            <p className="text-xs text-gray-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
              💡 Default is Nairobi center. Click GPS button for your exact location, or enter coordinates manually.
            </p>
          </div>
        </div>

        {/* Footer Actions - Fixed at bottom */}
        <div className="flex gap-3 pt-4 border-t border-orange-100 mt-auto flex-shrink-0 bg-white">
          <Button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium py-2 rounded-lg transition-colors"
          >
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={handleAdd}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Branch'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
