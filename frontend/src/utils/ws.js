import { getAccessToken } from "../services/authService";

export const buildMessagingWsUrl = (tokenOverride) => {
  const override =
    typeof tokenOverride === "string" && String(tokenOverride).trim() ? String(tokenOverride).trim() : null;
  const accessToken = override || getAccessToken();
  if (!accessToken) return null;

  const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");
  const wsBase = apiBase.startsWith("https://") ? apiBase.replace(/^https:\/\//, "wss://") : apiBase.replace(/^http:\/\//, "ws://");
  return `${wsBase}/ws/messaging?token=${encodeURIComponent(String(accessToken))}`;
};
