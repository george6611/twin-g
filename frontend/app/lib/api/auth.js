import { client } from './client';

async function login(credentials) {
  const resp = await client.post('/api/auth/login', { body: credentials });
  if (!resp.success && resp.status === 401) {
    return { success: false, error: 'Invalid credentials' };
  }
  return resp;
}

async function logout() {
  const resp = await client.post('/api/auth/logout');
  return resp;
}

async function getSession() {
  const resp = await client.get('/api/auth/me');
  if (resp.success && resp.data) {
    return resp.data;
  }
  return null;
}

export const AuthAPI = { login, logout, getSession };