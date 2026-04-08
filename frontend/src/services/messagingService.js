import api from "./authService";

export const listMessagingContacts = async () => {
  const res = await api.get("/api/messaging/contacts");
  return res.data;
};

export const listMessagingThreads = async () => {
  const res = await api.get("/api/messaging/threads");
  return res.data;
};

export const ensureMessagingThreadWith = async (publicId) => {
  const id = String(publicId || "").trim();
  const res = await api.post(`/api/messaging/threads/with/${encodeURIComponent(id)}`);
  return res.data;
};

export const getMessagingThreadMessages = async (threadId) => {
  const res = await api.get(`/api/messaging/threads/${threadId}/messages`);
  return res.data;
};

export const sendMessagingThreadMessage = async (threadId, content) => {
  const res = await api.post(`/api/messaging/threads/${threadId}/messages`, { content });
  return res.data;
};

export const listAdminGroupMessages = async () => {
  const res = await api.get("/api/messaging/admin-group/messages");
  return res.data;
};

export const sendAdminGroupMessage = async (content) => {
  const res = await api.post("/api/messaging/admin-group/messages", { content });
  return res.data;
};

export const markMessagingThreadRead = async (threadId) => {
  const res = await api.post(`/api/messaging/threads/${threadId}/read`);
  return res.data;
};

export const heartbeatMessagingPresence = async () => {
  const res = await api.post("/api/messaging/presence/heartbeat");
  return res.data;
};
