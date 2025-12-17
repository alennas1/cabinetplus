import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireAuth = ({ allowedRoles }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const currentPath = location.pathname;

  // 1. Unauthenticated Check
  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { role, isEmailVerified, isPhoneVerified, planStatus, plan } = user;
  const isVerified = isEmailVerified && isPhoneVerified;

  // 2. Role Access Check
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // --- DENTIST SPECIFIC FLOW CONTROL ---
  if (role === "DENTIST") {
    
    // --- Determine Required Redirect Path ---
    let requiredRedirect = null;
    const isActive = planStatus === "ACTIVE" && plan && ["FREE_TRIAL", "BASIC", "PRO"].includes(plan.code?.toUpperCase());
    
    // PRIORITY 1: Verification is the first gate.
    if (!isVerified) {
      requiredRedirect = "/verify";
    } 
    // PRIORITY 2: If verified, check plan status.
    else if (!isActive) {
      if (planStatus === "WAITING") {
        requiredRedirect = "/waiting"; // Must wait for payment confirmation.
      } else {
        requiredRedirect = "/plan"; // Must choose a plan (PENDING, INACTIVE, or null).
      }
    }

    // --- Enforce Redirection ---
    
    // If a mandatory redirect is required (Verification or Plan Selection/Waiting)
    if (requiredRedirect) {
        // If the user is not currently on the page they are required to be on, redirect them.
        if (currentPath !== requiredRedirect) {
            return <Navigate to={requiredRedirect} replace />;
        }
    } 
    
    // If NO mandatory redirect is required (i.e., user is ACTIVE)
    else {
        // User is active. Block access to ALL intermediate pages.
        if (currentPath === "/verify" || currentPath === "/plan" || currentPath === "/waiting") {
            return <Navigate to="/dashboard" replace />;
        }
    }
  }

  // 3. Final Fallback: Allow access to the requested route
  // (This executes if requiredRedirect is null AND the currentPath is a valid app route, or if the user is an ADMIN).
  return <Outlet />;
};

export default RequireAuth;