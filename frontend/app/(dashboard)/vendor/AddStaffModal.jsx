import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { VendorsAPI } from '../../lib/api/vendors';

export default function AddStaffModal({ isOpen, onClose, vendorId, branchId: initialBranchId, onAdded, branches: propBranches }) {
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '123456',
    branchId: initialBranchId || '' 
  });
  const [branches, setBranches] = useState(Array.isArray(propBranches) ? propBranches : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // reset form when modal opens or branch context changes
  useEffect(() => {
    if (isOpen) {
      setForm({ 
        name: '', 
        email: '', 
        password: '123456',
        branchId: initialBranchId || '' 
      });
      setError(null);
      setShowPassword(false);
      setBranchesLoading(false);
    }
  }, [isOpen, initialBranchId]);

  // Update local state if prop branches provided and no branchId supplied
  useEffect(() => {
    if (isOpen && !initialBranchId && propBranches && Array.isArray(propBranches)) {
      setBranches(propBranches);
    } else if (isOpen && !initialBranchId && vendorId && (!propBranches || propBranches.length === 0)) {
      console.log("📦 [AddStaffModal] Fetching branches for vendor:", vendorId);
      setBranchesLoading(true);
      
      VendorsAPI.getBranches(vendorId).then((res) => {
        console.log("📦 [AddStaffModal] getBranches response:", res);
        
        if (res.success) {
          const items = res.data?.items || res.data || [];
          console.log("📦 [AddStaffModal] Branches loaded:", items.length, "branches");
          setBranches(items);
          
          // Auto-select first (or only) branch if there's only one
          if (items.length === 1) {
            const branchId = items[0]._id || items[0].id;
            console.log("📦 [AddStaffModal] Auto-selecting branch:", branchId);
            setForm(prev => ({ ...prev, branchId }));
          } else if (items.length === 0) {
            setError("No branches available. Please create a branch first.");
          }
        } else {
          console.error("❌ [AddStaffModal] Failed to fetch branches:", res.error);
          setError(res.error || "Failed to load branches");
        }
        
        setBranchesLoading(false);
      }).catch((err) => {
        console.error("❌ [AddStaffModal] Error fetching branches:", err);
        setError("Error loading branches: " + err.message);
        setBranchesLoading(false);
      });
    }
  }, [isOpen, vendorId, initialBranchId, propBranches]);

  const handleAdd = async () => {
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      return setError('Name, email, and password required');
    }
    if (!form.branchId) return setError('Branch is required');
    
    setLoading(true);
    try {
      const payload = { 
        name: form.name, 
        email: form.email,
        password: form.password,
        branchId: form.branchId 
      };
      
      console.log("📦 [AddStaffModal] Creating staff with payload:", payload);
      
      const resp = await VendorsAPI.createStaff(vendorId, payload);
      
      console.log("📦 [AddStaffModal] createStaff response:", resp);
      
      if (resp.success) {
        onAdded && onAdded(resp.data);
        onClose();
      } else {
        setError(resp.error || 'Failed to add staff member');
      }
    } catch (e) {
      console.error("❌ [AddStaffModal] Error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Add Staff">
      <h3 className="text-lg font-semibold mb-4">Add Staff Member</h3>
      {error && <p className="text-red-500 text-sm mb-3 p-3 bg-red-50 rounded border border-red-200">{error}</p>}
      
      <Input 
        label="Name" 
        value={form.name} 
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Staff member name"
      />
      
      <Input 
        label="Email" 
        type="email"
        value={form.email} 
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="staff@example.com"
      />
      
      {/* Password Field with Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <div className="relative flex items-center">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 10a1 1 0 100-2 1 1 0 000 2zm0 4a4 4 0 110-8 4 4 0 010 8zm0-10a6 6 0 100 12 6 6 0 000-12z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Default: 123456 (Change after first login)</p>
      </div>
      
      {/* Branch Selection */}
      {!initialBranchId && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch {branchesLoading && <span className="text-xs text-gray-400">(Loading...)</span>}
          </label>
          {branchesLoading ? (
            <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
              Loading branches...
            </div>
          ) : branches.length === 0 ? (
            <p className="text-gray-600 text-sm italic p-2 bg-yellow-50 border border-yellow-200 rounded">
              ⚠️ No branches available. Create a branch first.
            </p>
          ) : branches.length === 1 ? (
            <div className="p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
              ✓ {branches[0].name} (Auto-selected)
            </div>
          ) : (
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a branch...</option>
              {Array.isArray(branches) && branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      
      <div className="flex justify-end gap-2 mt-6">
        <Button onClick={onClose} disabled={loading} className="bg-gray-300 text-gray-700 hover:bg-gray-400">
          Cancel
        </Button>
        <Button loading={loading} onClick={handleAdd} className="bg-orange-500 hover:bg-orange-600">
          Add Staff
        </Button>
      </div>
    </Modal>
  );
}
