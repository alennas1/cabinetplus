import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

// 1. Helper to find token in any storage
const getPersistedToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

// 2. Helper to decode and prepare user data
const getDecodedUser = (t) => {
  if (t) {
    try {
      const decoded = jwtDecode(t);
      decoded.plan = decoded.plan || null;
      return decoded;
    } catch (error) {
      console.error("Invalid token found in storage:", error);
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      return null;
    }
  }
  return null;
};

const token = getPersistedToken();

const initialState = {
  token: token || null,
  isAuthenticated: !!token,
  user: getDecodedUser(token),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const accessToken = action.payload;
      state.token = accessToken;
      state.isAuthenticated = true;

      try {
        const decoded = jwtDecode(accessToken);
        decoded.plan = decoded.plan || null;
        state.user = decoded;
      } catch (error) {
        console.error("Failed to decode token after login:", error);
        state.user = null;
      }
    },

    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      if (user) state.user = user;
      if (token) {
        state.token = token;
        // Update whichever storage is active
        if (localStorage.getItem("token")) {
          localStorage.setItem("token", token);
        } else if (sessionStorage.getItem("token")) {
          sessionStorage.setItem("token", token);
        }
      }
    },

    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    },
  },
});

export const { loginSuccess, logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;