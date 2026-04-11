import api from "./authService";

export const listNotifications = async ({ limit = 20 } = {}) => {
  const res = await api.get("/api/notifications", { params: { limit } });
  return res.data;
};

export const getNotificationsUnreadCount = async () => {
  const res = await api.get("/api/notifications/unread-count");
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.post(`/api/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.post("/api/notifications/read-all");
  return res.data;
};

