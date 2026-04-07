import api from "./authService";

export const getLabMe = async () => {
  const { data } = await api.get("/api/lab/me");
  return data;
};

export const updateLabMe = async ({ name, contactPerson, address, password } = {}) => {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (contactPerson !== undefined) payload.contactPerson = contactPerson;
  if (address !== undefined) payload.address = address;
  if (password !== undefined) payload.password = password;
  const { data } = await api.put("/api/lab/me", payload);
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

export const getLabDentistSummary = async (dentistPublicId) => {
  const id = String(dentistPublicId || "").trim();
  const { data } = await api.get(`/api/lab/dentists/${id}/summary`);
  return data;
};

export const getLabProthesesPage = async ({
  page = 0,
  size = 20,
  q,
  status,
  filterBy,
  dateType,
  dentistId,
  from,
  to,
} = {}) => {
  const params = { page, size };
  if (q) params.q = q;
  if (status) params.status = status;
  if (filterBy) params.filterBy = filterBy;
  if (dateType) params.dateType = dateType;
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

export const getLabPaymentsSummary = async ({ q, dentistId, from, to } = {}) => {
  const params = {};
  if (q) params.q = q;
  if (dentistId) params.dentistId = dentistId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get("/api/lab/payments/summary", { params });
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

export const updateLabProthesesStatus = async ({ ids = [], status } = {}) => {
  const payload = { ids, status };
  const { data } = await api.put("/api/lab/protheses/status", payload);
  return data;
};

export const getLabPending = async () => {
  const { data } = await api.get("/api/lab/pending");
  return data;
};

export const downloadLabProthesisStl = async (id) => {
  const response = await api.get(`/api/lab/protheses/${id}/stl`, {
    params: { download: true },
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"];
  let fileName = `prothese_${id}.stl`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename=\"(.+?)\"/);
    if (fileNameMatch && fileNameMatch[1]) {
      fileName = fileNameMatch[1];
    }
  }

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadLabProthesisFilesZip = async (id) => {
  const response = await api.get(`/api/lab/protheses/${id}/files.zip`, {
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"];
  let fileName = `prothese_${id}_fichiers.zip`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename=\"(.+?)\"/);
    if (fileNameMatch && fileNameMatch[1]) {
      fileName = fileNameMatch[1];
    }
  }

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
