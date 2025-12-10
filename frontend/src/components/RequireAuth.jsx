import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const RequireAuth = ({ allowedRoles }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);

  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const { role, isEmailVerified, isPhoneVerified, planStatus, plan } = user;
  const isVerified = isEmailVerified && isPhoneVerified;

  // --- DENTIST ROUTE RULES ---
  if (role === "DENTIST") {
    // Only allow main protected routes if verified & has active plan
    if (!isVerified || !plan || planStatus !== "ACTIVE") {
      return <Navigate to="/dashboard" replace />; 
      // user will still be able to manually access /verify, /plan, /waiting
    }
  }

  // --- ROLE ACCESS CONTROL ---
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === "ADMIN" ? "/admin-dashboard" : "/dashboard"} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
