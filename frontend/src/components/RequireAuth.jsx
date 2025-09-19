import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import {jwtDecode} from "jwt-decode"; // fixed import
import { logout, loginSuccess } from "../store/authSlice";
import api from "../services/authService";

const RequireAuth = () => {
  const { token, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();
  const refreshTimer = useRef(null);

  useEffect(() => {
    if (!token) return;

    const handleLogout = () => {
      window.dispatchEvent(new Event("sessionExpired")); // trigger modal if needed
      dispatch(logout());
    };

    const refreshToken = async () => {
      try {
        const { data } = await api.post("/auth/refresh", {}, { withCredentials: true });
        dispatch(loginSuccess(data.accessToken));
        scheduleRefresh(data.accessToken);
      } catch (err) {
        console.error("Refresh failed:", err);
        handleLogout();
      }
    };

    const scheduleRefresh = (currentToken) => {
      try {
        const decoded = jwtDecode(currentToken);
        const exp = decoded.exp * 1000; // exp is in seconds
        const now = Date.now();
        const timeout = exp - now - 5000; // refresh 5s before expiration

        if (timeout <= 0) {
          // token already expired, refresh immediately
          refreshToken();
        } else {
          refreshTimer.current = setTimeout(refreshToken, timeout);
        }
      } catch {
        handleLogout();
      }
    };

    // Schedule the first refresh in background
    scheduleRefresh(token);

    // Cleanup timer on unmount or token change
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [token, dispatch]);

  // If no token or not authenticated, redirect to login
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Otherwise, render the app immediately
  return <Outlet />;
};

export default RequireAuth;
