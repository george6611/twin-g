import { client } from './client';

async function getSaccos(status) {
  const params = status && status !== 'all' ? { status } : undefined;
  return client.get('/api/admin/saccos', { params });
}

async function getSaccoById(saccoId) {
  return client.get(`/api/admin/saccos/${saccoId}`);
}

async function registerSacco(payload) {
  return client.post('/api/admin/saccos', { body: payload });
}

async function updateSaccoDetails(saccoId, payload) {
  return client.patch(`/api/admin/saccos/${saccoId}`, { body: payload });
}

async function uploadRegistrationDocument(saccoId, file) {
  const formData = new FormData();
  formData.append('registrationDocument', file);
  
  return client.postFormData(`/api/admin/saccos/${saccoId}/upload-registration`, formData);
}

async function uploadAdditionalDocuments(saccoId, files) {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('additionalDocuments', file);
  });
  
  return client.postFormData(`/api/admin/saccos/${saccoId}/upload-additional`, formData);
}

async function updateSaccoStatus(saccoId, payload) {
  return client.patch(`/api/admin/saccos/${saccoId}/status`, { body: payload });
}

async function addSaccoMember(saccoId, member) {
  return client.post(`/api/admin/saccos/${saccoId}/members`, { body: member });
}

async function deleteSaccoMember(saccoId, memberIndex) {
  return client.delete(`/api/admin/saccos/${saccoId}/members/${memberIndex}`);
}

export const SaccosAPI = {
  getSaccos,
  getSaccoById,
  registerSacco,
  updateSaccoDetails,
  uploadRegistrationDocument,
  uploadAdditionalDocuments,
  updateSaccoStatus,
  addSaccoMember,
  deleteSaccoMember,
};
