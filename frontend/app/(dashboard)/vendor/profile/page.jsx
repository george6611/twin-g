'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../../hooks/useAuth';
import { VendorAPI } from '../../../lib/api/vendor';
import { BranchesAPI } from '../../../lib/api/branches';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Alert from '../../../components/ui/Alert';
import Toast from '../../../components/ui/Toast';
import Tabs from '../../../components/ui/Tabs';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import SectionWrapper from '../../../components/dashboard/SectionWrapper';
import StatsCard from '../../../components/dashboard/StatsCard';
import SettingsCard from '../../../components/dashboard/SettingsCard';
import BranchSummaryCard from '../../../components/dashboard/BranchSummaryCard';
import EditBusinessInfoModal from './EditBusinessInfoModal';
import ChangePasswordModal from './ChangePasswordModal';

const TABS = [
  { id: 'business', label: 'Business Profile' },
  { id: 'branches', label: 'Branch Overview' },
  { id: 'account', label: 'Account & Security' },
  { id: 'operational', label: 'Operational Settings' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations (Beta)' },
];

export default function VendorProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isVendor, isVendorStaff, userRole, vendorId: loggedInVendorId, loading: authLoading } = useAuth();

  console.log('useAuth values:', { isAuthenticated, isVendor, isVendorStaff, userRole, loggedInVendorId, authLoading });


  const [vendor, setVendor] = useState(null);
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState({});
  const [notifications, setNotifications] = useState({});
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('business');
  const [toast, setToast] = useState(null);
  const [editBusinessOpen, setEditBusinessOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const isMainVendor = (isVendor && !isVendorStaff) || userRole === 'vendor_main';

  const fetchProfileData = useCallback(async () => {
    if (!isAuthenticated || !loggedInVendorId) return;

    setLoading(true);
    setError(null);

    try {
      const [
        vendorResult,
        branchesResult,
        settingsResult,
        notificationsResult,
        loginHistoryResult,
      ] = await Promise.all([
        VendorAPI.getVendorProfile(loggedInVendorId).catch(() => ({ success: false })),
        isMainVendor
          ? BranchesAPI.getBranches(loggedInVendorId).catch(() => ({ success: false, data: [] }))
          : Promise.resolve({ success: true, data: [] }),
        isMainVendor
          ? VendorAPI.getVendorSettings(loggedInVendorId).catch(() => ({ success: false, data: {} }))
          : Promise.resolve({ success: true, data: {} }),
        VendorAPI.getNotificationPreferences(loggedInVendorId).catch(() => ({ success: false, data: {} })),
        VendorAPI.getLoginHistory(loggedInVendorId, { limit: 5 }).catch(() => ({ success: false, data: [] })),
      ]);

      if (vendorResult.status === 401) {
        router.push('/login');
        return;
      }

      if (!vendorResult.success) {
        setError(vendorResult.error || 'Failed to load profile');
        setVendor(null);
      } else {
        setVendor(vendorResult.data || {});
      }

      setBranches(branchesResult.success ? branchesResult.data || [] : []);
      setSettings(settingsResult.success ? settingsResult.data || {} : {});
      setNotifications(notificationsResult.success ? notificationsResult.data || {} : {});
      setLoginHistory(loginHistoryResult.success ? loginHistoryResult.data || [] : []);
    } catch (err) {
      console.error('Fetch vendor data error:', err);
      setError(err.message || 'Failed to fetch vendor data');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loggedInVendorId, isMainVendor, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && loggedInVendorId) {
      fetchProfileData();
    }
  }, [authLoading, isAuthenticated, loggedInVendorId, fetchProfileData]);

  const handleRefresh = () => {
    setToast({ type: 'info', message: 'Refreshing profile...' });
    fetchProfileData();
  };

  // ====== RENDER LOGIC ======
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          <span className="text-gray-600 dark:text-gray-400">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Alert variant="error" title="Not Authenticated" message="Please log in to access this page." />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading profile...</span>
          </div>
        )}

        {!loading && error && (
          <Alert variant="error" title="Error" message={error} actionLabel="Retry" onAction={handleRefresh} />
        )}

        {!loading && vendor && (
          <>
            {/* HERO, STATS, TABS */}
            <SectionWrapper>
              <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
                {/* BUSINESS PROFILE TAB */}
                {activeTab === 'business' && (
                  <div className="space-y-4 p-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Business Profile</h2>
                    <p>Business name: {vendor.businessName || '—'}</p>
                    <p>Email: {vendor.businessEmail || '—'}</p>
                    {/* Add your other fields here */}
                    {isMainVendor && (
                      <Button size="sm" onClick={() => setEditBusinessOpen(true)}>Edit Profile</Button>
                    )}
                  </div>
                )}

                {/* BRANCHES TAB */}
                {activeTab === 'branches' && (
                  <div className="space-y-4 p-4">
                    {branches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {branches.map(branch => (
                          <BranchSummaryCard
                            key={branch._id}
                            branch={branch}
                            onViewClick={(id) => router.push(`/vendor/branches/${id}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">No branches yet.</p>
                    )}
                  </div>
                )}

                {/* Other tabs placeholder */}
                {activeTab !== 'business' && activeTab !== 'branches' && (
                  <div className="p-4 text-gray-600 dark:text-gray-400">
                    {`Content for ${activeTab} tab goes here.`}
                  </div>
                )}
              </Tabs>
            </SectionWrapper>

            {/* MODALS */}
            <EditBusinessInfoModal
              isOpen={editBusinessOpen}
              onClose={() => setEditBusinessOpen(false)}
              vendorId={loggedInVendorId}
              vendor={vendor}
              onSuccess={handleRefresh}
            />
            <ChangePasswordModal
              isOpen={changePasswordOpen}
              onClose={() => setChangePasswordOpen(false)}
              vendorId={loggedInVendorId}
              onSuccess={() => {
                setToast({ type: 'success', message: 'Password changed! Logging out...' });
                setTimeout(() => router.push('/login'), 2000);
              }}
            />
          </>
        )}

        {toast && (
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        )}
      </div>
    </>
  );
}