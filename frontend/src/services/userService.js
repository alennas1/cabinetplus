const API_BASE = "https://cabinetplus-production.up.railway.app/api/users";

// ==========================
// HELPER (With Cookie Support)
// ==========================
const request = async (url, options = {}) => {
  const defaultOptions = {
    // MANDATORY: Tells the browser to send cookies to Railway
    credentials: "include", 
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Erreur de communication avec le serveur");
  }

  return response.status === 204 ? null : response.json();
};

// ==========================
// CURRENT USER ENDPOINTS
// ==========================

// No more 'token' parameters needed!
export const getUserProfile = () => 
  request(`${API_BASE}/me`, { method: "GET" });

export const updateUserProfile = (data) =>
  request(`${API_BASE}/me`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const updateUserPassword = (passwords) =>
  request(`${API_BASE}/me/password`, {
    method: "PUT",
    body: JSON.stringify(passwords),
  });

export const verifyPhone = () =>
  request(`${API_BASE}/me/verify-phone`, { method: "PUT" });

export const selectPlan = (planId) =>
  request(`${API_BASE}/me/plan`, {
    method: "PUT",
    body: JSON.stringify({ planId }),
  });

// ==========================
// ADMIN ENDPOINTS
// ==========================

export const getAllUsers = () => request(`${API_BASE}`);

export const getAllDentists = () => request(`${API_BASE}/dentists`);

export const getAllAdmins = () => request(`${API_BASE}/admins`);

export const createAdmin = (data) =>
  request(`${API_BASE}/admin/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteAdmin = async (id) => {
  return request(`${API_BASE}/admin/delete/${id}`, {
    method: "DELETE",
  });
};

// ==========================
// EXPIRING USERS
// ==========================
export const getUsersExpiringInDays = (days) =>
  request(`${API_BASE}/expiring-in/${days}`);