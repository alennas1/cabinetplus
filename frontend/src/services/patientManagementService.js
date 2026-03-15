import api from "./authService";

const BASE_URL = "/api/users/me/patient-management";

export const getPatientManagementSettings = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const updatePatientManagementSettings = async (payload) => {
  const response = await api.put(BASE_URL, payload);
  return response.data;
};

