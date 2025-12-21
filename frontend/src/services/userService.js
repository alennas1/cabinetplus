const API_BASE = "${process.env.REACT_APP_API_URL}/api/users";

// ==========================
// HELPER
// ==========================
const handleResponse = async (res) => {
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "API request failed");
  }
  return res.status === 204 ? null : res.json();
};

// ==========================
// CURRENT USER ENDPOINTS
// ==========================
export const getUserProfile = (token) =>
  fetch(`${API_BASE}/me`, {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  }).then(handleResponse);

export const updateUserProfile = (data, token) =>
  fetch(`${API_BASE}/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateUserPassword = (passwords, token) =>
  fetch(`${API_BASE}/me/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(passwords),
  }).then(handleResponse);

export const verifyEmail = (token) =>
  fetch(`${API_BASE}/me/verify-email`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  }).then(handleResponse);

export const verifyPhone = (token) =>
  fetch(`${API_BASE}/me/verify-phone`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  }).then(handleResponse);

export const selectPlan = (planId, token) =>
  fetch(`${API_BASE}/me/plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId }),
  }).then(handleResponse);

// ==========================
// ADMIN ENDPOINTS
// ==========================
export const getAllUsers = (token) =>
  fetch(`${API_BASE}`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
    .then(handleResponse);

export const getAllDentists = (token) =>
  fetch(`${API_BASE}/dentists`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
    .then(handleResponse);

export const getAllAdmins = (token) =>
  fetch(`${API_BASE}/admins`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
    .then(handleResponse);

export const createAdmin = (data, token) =>
  fetch(`${API_BASE}/admin/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteAdmin = async (id, token) => {
  const res = await fetch(`${API_BASE}/admin/delete/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to delete admin");
  }

  // no need to parse JSON
  return true;
};
// ==========================
// EXPIRING USERS
// ==========================
export const getUsersExpiringInDays = (days, token) =>
  fetch(`${API_BASE}/expiring-in/${days}`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
    .then(handleResponse);

    
