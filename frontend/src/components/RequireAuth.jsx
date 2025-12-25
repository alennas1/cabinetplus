import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireAuth = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const location = useLocation();
  const currentPath = location.pathname;

  // 1. Loading State Check
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 font-medium">Chargement de votre session...</p>
      </div>
    );
  }

  // 2. Basic Auth Check
  // Note: We no longer check for 'token' here because it's in a secure cookie 
  // hidden from JS. We rely entirely on isAuthenticated and the user object.
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { role, isPhoneVerified, planStatus, plan } = user;

  // 3. Role Authorization
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Dentist Workflow (Verification -> Plan -> Dashboard)
  // This is your core business logic - restored and fully functional.
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
    if (targetPath) {
      // If they have a pending step, and aren't already there, move them.
      if (currentPath !== targetPath) {
        return <Navigate to={targetPath} replace />;
      }
    } else {
      // If they are fully active but trying to access setup pages (like /verify), send to dashboard
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