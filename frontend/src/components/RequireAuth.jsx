// RequireAuth.jsx
import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { logout, loginSuccess } from "../store/authSlice";
import api from "../services/authService";

const RequireAuth = ({ allowedRoles }) => {
  // 1. Get state and hooks
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();
  const refreshTimer = useRef(null);
  
  // Helper function to get the user's main dashboard path
  const getDashboardPath = (role) => { // 👈 NEW HELPER FUNCTION
      if (role === "ADMIN") return "/admin-dashboard";
      return "/dashboard"; // Default to DENTIST dashboard
  };

  // --- Token Refresh Logic (Keep as is) ---
  useEffect(() => {
    if (!token) return;
    // ... (rest of token refresh logic remains unchanged) ...
    const handleLogout = () => {
      window.dispatchEvent(new Event("sessionExpired"));
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
        const exp = decoded.exp * 1000;
        const now = Date.now();
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


  // 2. Check for basic authentication first
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Ensure the user object is available for claim checks
  if (!user) {
    console.error("Authenticated but missing user claims. Forcing logout.");
    dispatch(logout());
    return <Navigate to="/login" replace />;
  }

  // --- 3. Conditional Checks based on Claims ---
  const isVerified = user.isEmailVerified && user.isPhoneVerified;
  const planStatus = user.planStatus;
  const isPlanPending = planStatus === "PENDING_PLAN";
  const userRole = user.role; 

  const isExpired = Date.now() >= user.exp * 1000;

  // 3a. Check Verification (ADMIN BYPASSES)
  if (userRole === "DENTIST" && !isVerified) {
    return <Navigate to="/verify" replace />;
  }

  // 3b. Check Plan Status/Expiration (ADMIN BYPASSES)
  if (userRole === "DENTIST" && (isPlanPending || isExpired)) {
    return <Navigate to="/plan" replace />;
  }
  // ---------------------------------------------


  // 4. ROLE-BASED ACCESS CONTROL CHECK (MODIFIED REDIRECTION)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    const dashboard = getDashboardPath(userRole); // Get the correct dashboard
    console.warn(`Access denied: User role '${userRole}' not in allowed roles: [${allowedRoles.join(', ')}]. Redirecting to ${dashboard}`);
    // Redirect to the user's main dashboard instead of /unauthorized
    return <Navigate to={dashboard} replace />; 
  }


  // 5. All checks pass: Grant access to the protected route's children
  return <Outlet />;
};

export default RequireAuth;