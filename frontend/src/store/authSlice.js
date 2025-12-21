import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

/**
 * Helper to retrieve the token regardless of which 
 * storage method the user chose (Persistent vs Session)
 */
const getPersistedToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

/**
 * Decodes the JWT safely and handles potential corruption
 */
const getDecodedUser = (t) => {
  if (!t) return null;
  try {
    const decoded = jwtDecode(t);
    // Ensure nested objects exist to prevent UI 'undefined' crashes
    decoded.plan = decoded.plan || null;
    return decoded;
  } catch (error) {
    console.error("Invalid or corrupted token in storage:", error);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    return null;
  }
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
      
      // Decode and set user data immediately after login
      const decoded = getDecodedUser(accessToken);
      state.user = decoded;
    },

    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      if (user) state.user = user;
      
      if (token) {
        state.token = token;
        // Update whichever storage is currently active so the 
        // user stays logged in after a background refresh
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
      
      // Hard wipe of all possible storage locations
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    },
  },
});

export const { loginSuccess, logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;