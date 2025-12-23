import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const decode = (token) => {
  if (!token) return null;
  try { return jwtDecode(token); } 
  catch { return null; }
};

const initialState = {
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  user: decode(localStorage.getItem("token")),
  loading: true, // Starts true to allow the App.jsx sync to run
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        localStorage.setItem("token", token);
        // Initial user state from token
        if (!state.user) state.user = decode(token);
      }
      if (user) {
        // Merge decoded token data with fresh Database data
        state.user = { ...state.user, ...user };
      }
      state.loading = false;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;