import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const getPersistedToken = () => localStorage.getItem("token");

const getDecodedUser = (t) => {
  if (!t) return null;
  try {
    const decoded = jwtDecode(t);
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
  loading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = true;
      state.user = getDecodedUser(action.payload);
      state.loading = false;
    },
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      if (user) state.user = user;
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        localStorage.setItem("token", token);
      }
      state.loading = false;
    },
    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
    },
    // New action to handle session expiration specifically
    sessionExpired: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  },
});

export const { loginSuccess, logout, setCredentials, sessionExpired, setLoading } = authSlice.actions;
export default authSlice.reducer;