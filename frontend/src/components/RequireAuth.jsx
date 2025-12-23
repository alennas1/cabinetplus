import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireAuth = ({ allowedRoles }) => {
  const { token, isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const location = useLocation();
  const currentPath = location.pathname;

  // 1. Loading State Check
  // Prevents the "Empty App" white screen while Redux is initializing or 
  // while the token is being verified by the refresh logic.
  if (loading) {
    return (
      <div clsassName="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 font-medium">Chargement de votre session...</p>
      </div>
    );
  }

  // 2. Basic Auth Check
  // If no token or not authenticated, bounce to login immediately.
  // We include !user here because if the user object is missing, the role checks will crash.
  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { role, isPhoneVerified, planStatus, plan } = user;

  // 3. Role Authorization
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Dentist Workflow (Verification -> Plan -> Dashboard)
  if (role === "DENTIST") {
    const isVerified = isPhoneVerified;
    const planCode = plan?.code?.toUpperCase();
    
    // An active plan requires the ACTIVE status AND a valid plan code
    const isPlanActive = planStatus === "ACTIVE" && ["FREE_TRIAL", "BASIC", "PRO"].includes(planCode);

    // Determine where the user SHOULD be based on their account status
    let targetPath = null;

    if (!isVerified) {
      targetPath = "/verify";
    } else if (planStatus === "WAITING") {
      targetPath = "/waiting";
    } else if (!isPlanActive) {
      targetPath = "/plan";
    }

    // Redirect Logic:
    // If the user has a "targetPath" (meaning they haven't finished setup),
    // and they aren't already on that page, redirect them.
    if (targetPath) {
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

  // 5. Success: Render the child routes
  return <Outlet />;
};

export default RequireAuth;