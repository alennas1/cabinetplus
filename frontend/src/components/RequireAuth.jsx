import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";

const RequireAuth = ({ allowedRoles }) => {
  const { token, isAuthenticated, user, loading } = useSelector(
    (state) => state.auth
  );
  const location = useLocation();
  const currentPath = location.pathname;
  const redirectByRole = () => {
    if (user?.role === "ADMIN") return "/admin-dashboard";
    const clinicRole = getClinicRole(user);
    return [CLINIC_ROLES.DENTIST, CLINIC_ROLES.PARTNER_DENTIST].includes(clinicRole)
      ? "/dashboard"
      : "/appointments";
  };

  // 1️⃣ Loading state (wait until session initializes)
  if (loading || (!user && token)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 font-medium">
          Chargement de votre session...
        </p>
      </div>
    );
  }

  // 2️⃣ Basic authentication check
  if (!loading && (!token || !isAuthenticated)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3️⃣ Role authorization
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={redirectByRole()} replace />;
  }

  // 4️⃣ Dentist setup workflow
  if (user?.role === "DENTIST" && getClinicRole(user) === CLINIC_ROLES.DENTIST) {
    const isVerified = user.phoneVerified === true;
    const isPlanActive = isPlanActiveForAccess(user);

    let targetPath = null;

    if (!isVerified) targetPath = "/verify";
    else if (!isPlanActive && user.planStatus === "WAITING") targetPath = "/waiting";
    else if (!isPlanActive) targetPath = "/plan";

    if (targetPath && currentPath !== targetPath) {
      return <Navigate to={targetPath} replace />;
    }

    // Only force dentists out of setup pages when setup is fully complete.
    if (!targetPath) {
      const setupPages = ["/verify", "/plan", "/waiting"];
      if (setupPages.includes(currentPath)) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // 5️⃣ Success → Render protected route
  return <Outlet />;
};

export default RequireAuth;
