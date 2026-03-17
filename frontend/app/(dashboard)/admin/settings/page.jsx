"use client";

import React, { useEffect, useState } from 'react';
import useAuth from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Tabs from '../../../components/dashboard/Tabs';
import SectionWrapper from '../../../components/dashboard/SectionWrapper';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import { SettingsAPI } from '../../../lib/api/settings';
import validators from '../../../lib/validators';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isSuper = !!user && user.role === 'super_admin';

  const [profile, setProfile] = useState({ name:'', email:'' });
  const [platform, setPlatform] = useState({ featureToggle: false, apiKey: '' });
  const [vendorDefaults, setVendorDefaults] = useState({ commissionRate: '' });
  const [notifications, setNotifications] = useState({ emailTemplate: '' });
  const [security, setSecurity] = useState({ currentPassword:'', newPassword:'' });
  const [features, setFeatures] = useState({ betaAccess: false });

  useEffect(() => {
    if (!authLoading && user) {
      fetchAll();
    }
  }, [authLoading, user]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pResp, platResp, vdResp] = await Promise.all([
        SettingsAPI.getProfileSettings(),
        isSuper ? SettingsAPI.getPlatformSettings() : Promise.resolve({success:false}),
        SettingsAPI.getVendorDefaults(),
      ]);
      if (pResp.success) setProfile(pResp.data);
      if (platResp && platResp.success) setPlatform(platResp.data);
      if (vdResp.success) setVendorDefaults(vdResp.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchAll(); }, [user]);

  const handleSaveProfile = async () => {
    const v = validators.validateRegisterInput({ name: profile.name, email: profile.email, password: '' });
    if (!v.valid) return setError(v.error);
    setLoading(true);
    try {
      const resp = await SettingsAPI.updateProfileSettings(profile);
      if (!resp.success) setError(resp.error);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSavePlatform = async () => {
    if (!isSuper) return;
    setLoading(true);
    try {
      const resp = await SettingsAPI.updatePlatformSettings(platform);
      if (!resp.success) setError(resp.error);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSaveVendorDefaults = async () => {
    const rate = Number(vendorDefaults.commissionRate);
    if (isNaN(rate) || rate < 0) return setError('Invalid commission rate');
    setLoading(true);
    try {
      const resp = await SettingsAPI.updateVendorDefaults(vendorDefaults);
      if (!resp.success) setError(resp.error);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (loading || authLoading) {
    return <div className="p-6">Loading settings...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  const tabs = [
    { key: 'profile', label: 'Profile & Account' },
    ...(isSuper ? [{ key: 'platform', label: 'Platform Config' }] : []),
    { key: 'vendor', label: 'Vendor Defaults' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'security', label: 'Security' },
    { key: 'features', label: 'Feature Toggles' },
  ];

  return (
    <div className="p-6 space-y-6">
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <SectionWrapper title="Profile & Account">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveProfile} className="bg-orange-500">Save</Button>
          </div>
        </SectionWrapper>
      )}

      {activeTab === 'platform' && isSuper && (
        <SectionWrapper title="Platform Configuration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="API Key"
              value={platform.apiKey}
              onChange={(e) => setPlatform({ ...platform, apiKey: e.target.value })}
              type="password"
            />
            <div className="flex items-center gap-2">
              <ToggleSwitch
                checked={platform.featureToggle}
                onChange={(v) => setPlatform({ ...platform, featureToggle: v })}
              />
              <span>Enable new feature</span>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSavePlatform} className="bg-orange-500">Save</Button>
          </div>
        </SectionWrapper>
      )}

      {activeTab === 'vendor' && (
        <SectionWrapper title="Vendor Defaults">
          <Input
            label="Commission Rate (%)"
            value={vendorDefaults.commissionRate}
            onChange={(e) => setVendorDefaults({ ...vendorDefaults, commissionRate: e.target.value })}
          />
          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveVendorDefaults} className="bg-orange-500">Save</Button>
          </div>
        </SectionWrapper>
      )}

      {activeTab === 'notifications' && (
        <SectionWrapper title="Notifications & Email Templates">
          <Input
            label="Email Template"
            textarea
            rows={4}
            value={notifications.emailTemplate}
            onChange={(e) => setNotifications({ ...notifications, emailTemplate: e.target.value })}
          />
          <div className="flex justify-end mt-4">
            <Button onClick={() => {}} className="bg-orange-500">Save</Button>
          </div>
        </SectionWrapper>
      )}

      {activeTab === 'security' && (
        <SectionWrapper title="Security & Access Control">
          <Input
            label="Current Password"
            type="password"
            value={security.currentPassword}
            onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
          />
          <Input
            label="New Password"
            type="password"
            value={security.newPassword}
            onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
          />
          <div className="flex justify-end mt-4">
            <Button onClick={() => {}} className="bg-orange-500">Change Password</Button>
          </div>
        </SectionWrapper>
      )}

      {activeTab === 'features' && (
        <SectionWrapper title="Feature Toggles / Beta Features">
          <div className="flex items-center gap-2">
            <ToggleSwitch
              checked={features.betaAccess}
              onChange={(v) => setFeatures({ ...features, betaAccess: v })}
            />
            <span>Allow beta access</span>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => {}} className="bg-orange-500">Save</Button>
          </div>
        </SectionWrapper>
      )}
    </div>
  );
}

