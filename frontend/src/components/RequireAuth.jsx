import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { logout, loginSuccess } from "../store/authSlice";
import api from "../services/authService";

const RequireAuth = () => {
  // 👈 1. Get the 'user' object from Redux
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();
  const refreshTimer = useRef(null);

  // --- Token Refresh Logic (Keep as is) ---
  useEffect(() => {
    if (!token) return;

    const handleLogout = () => {
      window.dispatchEvent(new Event("sessionExpired"));
      dispatch(logout());
    };

    // ... (refreshToken and scheduleRefresh functions remain the same) ...
    const refreshToken = async () => {
      try {
        // Assuming api.post("/auth/refresh") returns { accessToken: 'new_token' }
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
        const exp = decoded.exp * 1000;
        const now = Date.now();
        // Refresh 5s before expiration
        const timeout = exp - now - 5000; 

        if (timeout <= 0) {
          refreshToken();
        } else {
          refreshTimer.current = setTimeout(refreshToken, timeout);
        }
      } catch {
        handleLogout();
      }
    };

    scheduleRefresh(token);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [token, dispatch]);
  // ----------------------------------------


  // 👈 2. Check for basic authentication first
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Ensure the user object is available for claim checks
  if (!user) {
    // This case suggests a corrupt token in storage; force logout
    console.error("Authenticated but missing user claims. Forcing logout.");
    dispatch(logout());
    return <Navigate to="/login" replace />;
  }

  // --- 3. Conditional Checks based on Claims ---
  const isVerified = user.isEmailVerified && user.isPhoneVerified;
  const planStatus = user.planStatus;
  const isPlanPending = planStatus === "PENDING_PLAN";

  // Check expiration locally to block access even if the token refresh hasn't run yet
  // This is redundant if scheduleRefresh works perfectly but adds safety.
  const isExpired = Date.now() >= user.exp * 1000;

  // 3a. Check Verification
  if (!isVerified) {
    // Redirect if not fully verified
    return <Navigate to="/verify" replace />;
  }

  // 3b. Check Plan Status/Expiration
  if (isPlanPending || isExpired) {
    // Redirect if plan is pending or the token has definitively expired
    return <Navigate to="/plan" replace />;
  }
  // ---------------------------------------------


  // 4. All checks pass: Grant access to the protected route's children
  return <Outlet />;
};

export default RequireAuth;