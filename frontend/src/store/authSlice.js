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
      // Ensure plan exists to avoid UI crashes
      decoded.plan = decoded.plan || null;
      return decoded;
    } catch (error) {
      console.error("Invalid token found in storage:", error);
      // Clear both just in case
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
      // Note: We don't set localStorage here anymore because 
      // authService.js handles the logic of WHERE to save it 
      // based on the 'Remember Me' checkbox.
      
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
        // If a new token comes in (e.g., via refresh), 
        // update whichever storage is currently holding it
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
      // Wipe everything
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    },
  },
});

export const { loginSuccess, logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;