import { getWebPushVapidPublicKey, upsertWebPushSubscription } from "../services/pushService";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

export const isWebPushSupported = () => {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
};

export const ensureMessagingPushSubscription = async ({ prompt = false } = {}) => {
  if (!isWebPushSupported()) return { ok: false, reason: "unsupported" };

  const perm = Notification.permission;
  if (perm === "denied") return { ok: false, reason: "denied" };

  const keyRes = await getWebPushVapidPublicKey();
  const publicKey = String(keyRes?.publicKey || "").trim();
  if (!publicKey) return { ok: false, reason: "missing_public_key" };

  const registration = await navigator.serviceWorker.ready;
  if (!registration?.pushManager) return { ok: false, reason: "no_push_manager" };

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    if (Notification.permission !== "granted") {
      if (!prompt) return { ok: false, reason: "not_granted" };
      const next = await Notification.requestPermission();
      if (next !== "granted") return { ok: false, reason: "not_granted" };
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await upsertWebPushSubscription(subscription.toJSON());
  return { ok: true };
};

