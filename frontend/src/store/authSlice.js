import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from 'jwt-decode'; // ✅ CORRECT (Using named import)
const token = localStorage.getItem("token");

// ℹ️ Helper function to decode token if it exists
const getDecodedUser = (t) => {
  if (t) {
    try {
      return jwtDecode(t);
    } catch (error) {
      console.error("Invalid token found in storage:", error);
      localStorage.removeItem("token"); // Clear bad token
      return null;
    }
  }
  return null;
};

const initialState = {
  token: token || null,
  isAuthenticated: !!token,
  user: getDecodedUser(token), // 👈 2. ADD & INITIALIZE
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const accessToken = action.payload; // Use a clearer variable name
      state.token = accessToken;
      state.isAuthenticated = true;
      localStorage.setItem("token", accessToken);

      // 3. DECODE AND SAVE THE USER CLAIMS
      try {
        state.user = jwtDecode(accessToken);
      } catch (error) {
        console.error("Failed to decode token after login:", error);
        state.user = null; // Token is invalid, treat as unauthenticated logic might follow
      }
    },
    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null; // 4. CLEAR USER DATA ON LOGOUT
      localStorage.removeItem("token");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;