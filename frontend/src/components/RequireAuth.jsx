import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireAuth = ({ allowedRoles }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const currentPath = location.pathname;

  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { role, isPhoneVerified, planStatus, plan } = user;
  const isVerified = isPhoneVerified; // Email removed

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (role === "DENTIST") {
    let requiredRedirect = null;
    const isActive = planStatus === "ACTIVE" && plan && ["FREE_TRIAL", "BASIC", "PRO"].includes(plan.code?.toUpperCase());
    
    if (!isVerified) {
      requiredRedirect = "/verify";
    } 
    else if (!isActive) {
      if (planStatus === "WAITING") {
        requiredRedirect = "/waiting";
      } else {
        requiredRedirect = "/plan";
      }
    }

    if (requiredRedirect) {
        if (currentPath !== requiredRedirect) {
            return <Navigate to={requiredRedirect} replace />;
        }
    } 
    else {
        if (currentPath === "/verify" || currentPath === "/plan" || currentPath === "/waiting") {
            return <Navigate to="/dashboard" replace />;
        }
    }
  }

  return <Outlet />;
};

export default RequireAuth;