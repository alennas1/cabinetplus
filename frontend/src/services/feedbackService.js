import api from "./authService";

const BASE = "/api/feedback";
const BASE_ADMIN = "/api/admin/feedback";

export const createFeedback = async (payload) => {
  const res = await api.post(BASE, payload);
  return res.data;
};

export const getMyFeedback = async () => {
  const res = await api.get(`${BASE}/mine`);
  return res.data;
};

export const adminListFeedback = async () => {
  const res = await api.get(BASE_ADMIN);
  return res.data;
};

export const adminGetFeedbackById = async (id) => {
  const res = await api.get(`${BASE_ADMIN}/${id}`);
  return res.data;
};
