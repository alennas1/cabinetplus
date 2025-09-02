// userService.js
const API_BASE = "http://localhost:8080/api/users"; // change to your backend URL

// Get current user's profile
export const getUserProfile = async (token) => {
  const res = await fetch(`${API_BASE}/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return res.json();
};

// Update current user's profile
export const updateUserProfile = async (data, token) => {
  const res = await fetch(`${API_BASE}/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to update user profile");
  }

  return res.json();
};
