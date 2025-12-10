import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode"; // ✅ Correct import

const token = localStorage.getItem("token");

// Helper function to decode token safely
const getDecodedUser = (t) => {
  if (t) {
    try {
      const decoded = jwtDecode(t);
      // Ensure plan object exists
      decoded.plan = decoded.plan || null;
      return decoded;
    } catch (error) {
      console.error("Invalid token found in storage:", error);
      localStorage.removeItem("token");
      return null;
    }
  }
  return null;
};

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
      localStorage.setItem("token", accessToken);

      try {
        const decoded = jwtDecode(accessToken);
        decoded.plan = decoded.plan || null; // ensure plan exists
        state.user = decoded;
      } catch (error) {
        console.error("Failed to decode token after login:", error);
        state.user = null;
      }
    },
    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
