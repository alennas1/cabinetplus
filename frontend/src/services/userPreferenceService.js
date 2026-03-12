import api from "./authService";

const BASE_URL = "/api/users/me/preferences";

export const getUserPreferences = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const updateUserPreferences = async (payload) => {
  const response = await api.put(BASE_URL, payload);
  return response.data;
};
