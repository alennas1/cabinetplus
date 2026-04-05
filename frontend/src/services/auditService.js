import api from "./authService";

const BASE_URL = "/api/audit";

export const getMyAuditLogs = async () => {
  const response = await api.get(`${BASE_URL}/my`);
  return response.data;
};

export const getMyAuditLogsPage = async (
  { page = 0, size = 20, q, status, entity, action, sortKey, sortDirection, from, to } = {}
) => {
  const response = await api.get(`${BASE_URL}/my/paged`, {
    params: { page, size, q, status, entity, action, sortKey, sortDirection, from, to },
  });
  return response.data;
};

export const getSecurityAuditLogs = async () => {
  const response = await api.get(`${BASE_URL}/security`);
  return response.data;
};

export const getSecurityAuditLogsPage = async ({ page = 0, size = 20, q, status, from, to } = {}) => {
  const response = await api.get(`${BASE_URL}/security/paged`, {
    params: { page, size, q, status, from, to },
  });
  return response.data;
};

export const getPatientAuditLogs = async (
  patientId,
  { page = 0, size = 20, q, status, entity, action, sortKey, sortDirection, from, to } = {}
) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}`, {
    params: { page, size, q, status, entity, action, sortKey, sortDirection, from, to },
  });
  return response.data;
};
