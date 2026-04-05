const SESSION_KEY_PREFIX = "cabinetplus:gc_pin_session:";
const PIN_STATUS_KEY_PREFIX = "cabinetplus:gc_pin_enabled:";
import api from "./authService";

const sessionKey = (userId) => `${SESSION_KEY_PREFIX}${userId}`;
const pinStatusKey = (userId) => `${PIN_STATUS_KEY_PREFIX}${userId}`;

const notifyPinStatusChanged = () => {
  try {
    window.dispatchEvent(new Event("gcPinStatusChanged"));
  } catch {
    // ignore
  }
};

export const getGestionCabinetPinStatus = async ({ silent } = {}) => {
  const { data } = await api.get("/api/security/gestion-cabinet-pin", {
    params: { silent: silent === true ? true : undefined },
  });
  return data; // { pinSet, requirePin, enabled }
};

export const enableGestionCabinetPin = async (pin, password) => {
  const { data } = await api.post("/api/security/gestion-cabinet-pin", { pin, password });
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

export const setGestionCabinetPinRequirement = async (enabled, password) => {
  const { data } = await api.put("/api/security/gestion-cabinet-pin/requirement", { enabled, password });
  notifyPinStatusChanged();
  return data;
};

export const verifyGestionCabinetPin = async (pin) => {
  const { data } = await api.post("/api/security/gestion-cabinet-pin/verify", { pin });
  return !!data?.valid;
};

export const setCachedGestionCabinetPinEnabled = (userId, enabled, minutes = 10) => {
  if (!userId) return;
  const expiresAt = Date.now() + minutes * 60 * 1000;
  sessionStorage.setItem(pinStatusKey(userId), JSON.stringify({ enabled: !!enabled, expiresAt }));
};

export const getCachedGestionCabinetPinEnabled = (userId) => {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(pinStatusKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(pinStatusKey(userId));
      return null;
    }
    return !!parsed.enabled;
  } catch {
    sessionStorage.removeItem(pinStatusKey(userId));
    return null;
  }
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
