import api from "./authService";

const BASE_URL = "/api/audit";

export const getMyAuditLogs = async () => {
  const response = await api.get(`${BASE_URL}/my`);
  return response.data;
};

export const getSecurityAuditLogs = async () => {
  const response = await api.get(`${BASE_URL}/security`);
  return response.data;
};
