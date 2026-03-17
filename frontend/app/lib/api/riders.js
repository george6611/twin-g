import { client } from './client';

async function getRiders(status) {
  const params = status && status !== 'all' ? { status } : undefined;
  return client.get('/api/admin/onboarding/riders', { params });
}

async function getRiderById(riderId) {
  return client.get(`/api/admin/onboarding/riders/${riderId}`);
}

async function getOnboardingSaccos() {
  const onboardingResp = await client.get('/api/admin/onboarding/saccos');
  if (onboardingResp.success) {
    return onboardingResp;
  }

  return client.get('/api/admin/saccos');
}

async function updateRiderStatus(riderId, payload) {
  return client.patch(`/api/admin/onboarding/riders/${riderId}/status`, { body: payload });
}

async function updateRiderDetails(riderId, payload) {
  return client.patch(`/api/admin/onboarding/riders/${riderId}/details`, { body: payload });
}

async function verifyRiderDocuments(riderId, payload) {
  return client.post(`/api/admin/onboarding/riders/${riderId}/verify-documents`, { body: payload });
}

async function assignRiderSacco(riderId, payload) {
  return client.patch(`/api/admin/onboarding/riders/${riderId}/assign-sacco`, { body: payload });
}

async function uploadRiderDocuments(riderId, files) {
  const formData = new FormData();
  if (files.profileImage) {
    formData.append('profileImage', files.profileImage);
  }
  if (files.drivingLicense) {
    formData.append('drivingLicense', files.drivingLicense);
  }
  if (files.validInsurance) {
    formData.append('validInsurance', files.validInsurance);
  }
  if (files.saccoProof) {
    formData.append('saccoProof', files.saccoProof);
  }
  return client.postFormData(`/api/admin/onboarding/riders/${riderId}/upload-documents`, formData);
}

export const RidersAPI = {
  getRiders,
  getRiderById,
  getOnboardingSaccos,
  updateRiderStatus,
  updateRiderDetails,
  verifyRiderDocuments,
  assignRiderSacco,
  uploadRiderDocuments,
};
