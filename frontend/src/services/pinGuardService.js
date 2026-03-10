const SESSION_KEY_PREFIX = "cabinetplus:gc_pin_session:";
import api from "./authService";

const sessionKey = (userId) => `${SESSION_KEY_PREFIX}${userId}`;

const notifyPinStatusChanged = () => {
  try {
    window.dispatchEvent(new Event("gcPinStatusChanged"));
  } catch {
    // ignore
  }
};

export const getGestionCabinetPinStatus = async () => {
  const { data } = await api.get("/api/security/gestion-cabinet-pin");
  return data; // { enabled }
};

export const enableGestionCabinetPin = async (pin) => {
  const { data } = await api.post("/api/security/gestion-cabinet-pin", { pin });
  notifyPinStatusChanged();
  return data;
};

export const changeGestionCabinetPin = async (pin, password) => {
  const { data } = await api.put("/api/security/gestion-cabinet-pin", { pin, password });
  notifyPinStatusChanged();
  return data;
};

export const disableGestionCabinetPin = async (password) => {
  const { data } = await api.post("/api/security/gestion-cabinet-pin/disable", { password });
  notifyPinStatusChanged();
  return data;
};

export const verifyGestionCabinetPin = async (pin) => {
  const { data } = await api.post("/api/security/gestion-cabinet-pin/verify", { pin });
  return !!data?.valid;
};

export const setGestionCabinetUnlocked = (userId, minutes = 30) => {
  const expiresAt = Date.now() + minutes * 60 * 1000;
  sessionStorage.setItem(sessionKey(userId), JSON.stringify({ expiresAt }));
  return expiresAt;
};

export const clearGestionCabinetUnlocked = (userId) => {
  if (!userId) return;
  sessionStorage.removeItem(sessionKey(userId));
};

export const isGestionCabinetUnlocked = (userId) => {
  if (!userId) return false;
  try {
    const raw = sessionStorage.getItem(sessionKey(userId));
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw);
    if (!expiresAt || Date.now() > expiresAt) {
      sessionStorage.removeItem(sessionKey(userId));
      return false;
    }
    return true;
  } catch {
    sessionStorage.removeItem(sessionKey(userId));
    return false;
  }
};
