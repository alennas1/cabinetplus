import api from "./authService";

const BASE_SUPPORT = "/api/support";
const BASE_ADMIN = "/api/admin/support";

export const getMySupportMessages = async () => {
  const res = await api.get(`${BASE_SUPPORT}/messages`);
  return res.data;
};

export const sendMySupportMessage = async (content) => {
  const res = await api.post(`${BASE_SUPPORT}/messages`, { content });
  return res.data;
};

export const listMySupportThreads = async () => {
  const res = await api.get(`${BASE_SUPPORT}/threads`);
  return res.data;
};

export const createMySupportThread = async () => {
  const res = await api.post(`${BASE_SUPPORT}/threads`);
  return res.data;
};

export const markMySupportThreadsRead = async () => {
  const res = await api.post(`${BASE_SUPPORT}/threads/mark-read`);
  return res.data;
};

export const getMyThreadMessages = async (threadId) => {
  const res = await api.get(`${BASE_SUPPORT}/threads/${threadId}/messages`);
  return res.data;
};

export const sendMyThreadMessage = async (threadId, content) => {
  const res = await api.post(`${BASE_SUPPORT}/threads/${threadId}/messages`, { content });
  return res.data;
};

export const sendMyThreadImage = async (threadId, file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`${BASE_SUPPORT}/threads/${threadId}/messages/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getSupportAttachmentBlob = async (attachmentUrl) => {
  const res = await api.get(attachmentUrl, { responseType: "blob" });
  return res.data;
};

export const adminListSupportThreads = async (q = "") => {
  const res = await api.get(`${BASE_ADMIN}/threads`, { params: q ? { q } : undefined });
  return res.data;
};

export const adminGetThreadMessages = async (threadId) => {
  const res = await api.get(`${BASE_ADMIN}/threads/${threadId}/messages`);
  return res.data;
};

export const adminSendThreadMessage = async (threadId, content) => {
  const res = await api.post(`${BASE_ADMIN}/threads/${threadId}/messages`, { content });
  return res.data;
};

export const adminSendThreadImage = async (threadId, file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`${BASE_ADMIN}/threads/${threadId}/messages/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const adminFinishThread = async (threadId) => {
  const res = await api.post(`${BASE_ADMIN}/threads/${threadId}/finish`);
  return res.data;
};

export const adminTakeoverThread = async (threadId) => {
  const res = await api.post(`${BASE_ADMIN}/threads/${threadId}/takeover`);
  return res.data;
};
