import api from "./authService";

export const getLabMe = async () => {
  const { data } = await api.get("/api/lab/me");
  return data;
};

export const getLabInvitations = async () => {
  const { data } = await api.get("/api/lab/invitations");
  return data;
};

export const acceptLabInvitation = async (id) => {
  const { data } = await api.post(`/api/lab/invitations/${id}/accept`);
  return data;
};

export const rejectLabInvitation = async (id) => {
  const { data } = await api.post(`/api/lab/invitations/${id}/reject`);
  return data;
};

export const getLabDentists = async () => {
  const { data } = await api.get("/api/lab/dentists");
  return data;
};

export const getLabProthesesPage = async ({ page = 0, size = 20, q, status, dentistId, from, to } = {}) => {
  const params = { page, size };
  if (q) params.q = q;
  if (status) params.status = status;
  if (dentistId) params.dentistId = dentistId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get("/api/lab/protheses/paged", { params });
  return data;
};

export const getLabPaymentsPage = async ({ page = 0, size = 20, q, dentistId, from, to } = {}) => {
  const params = { page, size };
  if (q) params.q = q;
  if (dentistId) params.dentistId = dentistId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get("/api/lab/payments/paged", { params });
  return data;
};

export const approveLabProthesisCancel = async (id) => {
  const { data } = await api.put(`/api/lab/protheses/${id}/cancel/approve`);
  return data;
};

export const rejectLabProthesisCancel = async (id) => {
  const { data } = await api.put(`/api/lab/protheses/${id}/cancel/reject`);
  return data;
};

export const approveLabPaymentCancel = async (id) => {
  const { data } = await api.put(`/api/lab/payments/${id}/cancel/approve`);
  return data;
};

export const rejectLabPaymentCancel = async (id) => {
  const { data } = await api.put(`/api/lab/payments/${id}/cancel/reject`);
  return data;
};
