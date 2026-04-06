import api from "./authService";

export const grantUserPlan = async (userId, payload) => {
  const response = await api.post(`/api/admin/subscriptions/users/${userId}/grant`, payload);
  return response.data;
};

