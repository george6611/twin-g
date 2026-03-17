import { client } from './client';

// generic settings API; backend endpoints need to exist and check roles

export async function getProfileSettings() {
  return await client.get('/api/settings/profile');
}

export async function updateProfileSettings(data) {
  return await client.patch('/api/settings/profile', { body: data });
}

export async function getPlatformSettings() {
  return await client.get('/api/settings/platform');
}

export async function updatePlatformSettings(data) {
  return await client.patch('/api/settings/platform', { body: data });
}

export async function getVendorDefaults() {
  return await client.get('/api/settings/vendor-defaults');
}

export async function updateVendorDefaults(data) {
  return await client.patch('/api/settings/vendor-defaults', { body: data });
}

export const SettingsAPI = {
  getProfileSettings,
  updateProfileSettings,
  getPlatformSettings,
  updatePlatformSettings,
  getVendorDefaults,
  updateVendorDefaults,
};
