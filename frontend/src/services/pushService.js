import api from "./authService";

export const getWebPushVapidPublicKey = async () => {
  const res = await api.get("/api/push/vapid-public-key");
  return res.data;
};

export const upsertWebPushSubscription = async (subscriptionJson) => {
  const res = await api.post("/api/push/subscriptions", subscriptionJson);
  return res.data;
};

