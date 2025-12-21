import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const getPersistedToken = () => {
  return localStorage.getItem("token");
};

const getDecodedUser = (t) => {
  if (!t) return null;
  try {
    const decoded = jwtDecode(t);
    decoded.plan = decoded.plan || null;
    return decoded;
  } catch (error) {
    localStorage.removeItem("token");
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
      state.token = action.payload;
      state.isAuthenticated = true;
      state.user = getDecodedUser(action.payload);
    },
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      if (user) state.user = user;
      if (token) {
        state.token = token;
        localStorage.setItem("token", token);
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

export const { loginSuccess, logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;