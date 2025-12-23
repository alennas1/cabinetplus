import { createSlice } from "@reduxjs/toolkit";
import jwtDecode from "jwt-decode";

const getPersistedToken = () => localStorage.getItem("token");

const initialToken = getPersistedToken();
const initialState = {
  token: initialToken || null,
  isAuthenticated: !!initialToken,
  user: initialToken ? jwtDecode(initialToken) : null,
  loading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload;
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        state.user = user || jwtDecode(token);
        localStorage.setItem("token", token);
      }
      state.loading = false;
    },
    loginSuccess: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = true;
      state.user = jwtDecode(action.payload);
      state.loading = false;
    },
    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
    },
    sessionExpired: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, loginSuccess, logout, sessionExpired, setLoading } = authSlice.actions;
export default authSlice.reducer;
