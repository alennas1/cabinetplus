import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireAuth = ({ allowedRoles }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const currentPath = location.pathname;

  // 1. Basic Auth Check
  // Since our Redux state initializes from storage, this 'stays logged in'
  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { role, isPhoneVerified, planStatus, plan } = user;

  // 2. Role Authorization
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Dentist Workflow (Verification -> Plan -> Dashboard)
  if (role === "DENTIST") {
    const isVerified = isPhoneVerified;
    const planCode = plan?.code?.toUpperCase();
    const isPlanActive = planStatus === "ACTIVE" && ["FREE_TRIAL", "BASIC", "PRO"].includes(planCode);

    // Determine where the user SHOULD be
    let targetPath = null;

    if (!isVerified) {
      targetPath = "/verify";
    } else if (planStatus === "WAITING") {
      targetPath = "/waiting";
    } else if (!isPlanActive) {
      targetPath = "/plan";
    }

    // Redirect Logic
    if (targetPath) {
      // If they are not where they are supposed to be, send them there
      if (currentPath !== targetPath) {
        return <Navigate to={targetPath} replace />;
      }
    } else {
      // If they are fully active but trying to access setup pages, send to dashboard
      const setupPages = ["/verify", "/plan", "/waiting"];
      if (setupPages.includes(currentPath)) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <Outlet />;
};

export default RequireAuth;