import { client } from './client';
import utils from '../utils';
import rolesUtils from '../auth/roles';

export async function getAdmins() {
  return await client.get('/api/admins');
}

export async function createAdmin(data) {
  // data should include role=admin
  return await client.post('/api/admins', { body: data });
}

export async function updateAdminRole(id, role) {
  if (!id) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  if (role === rolesUtils.ROLES.SUPER_ADMIN) {
    return { success: false, error: 'forbidden', status: 403 };
  }
  return await client.patch(`/api/admins/${id}/role`, { body: { role } });
}

export async function deleteAdmin(id) {
  if (!id) {
    return { success: false, error: 'invalid_id', status: 400 };
  }
  return await client.del(`/api/admins/${id}`);
}

export const AdminAPI = { getAdmins, createAdmin, updateAdminRole, deleteAdmin,
  /* analytics */
  getStaffAnalytics: async (params) => await client.get('/api/admin/analytics/staff', { params }),
};