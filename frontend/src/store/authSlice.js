import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const token = localStorage.getItem("token");

const getDecodedUser = (t) => {
  if (t) {
    try {
      const decoded = jwtDecode(t);
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
        decoded.plan = decoded.plan || null;
        state.user = decoded;
      } catch (error) {
        console.error("Failed to decode token after login:", error);
        state.user = null;
      }
    },
    // ✅ New Reducer to update user data manually (Verification, Plan changes, etc.)
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      if (user) state.user = user;
      if (token) state.token = token;
    },
    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
    },
  },
});

export const { loginSuccess, logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;