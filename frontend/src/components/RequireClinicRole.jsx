import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";

const RequireClinicRole = ({ allowedClinicRoles = [] }) => {
  const { user, loading } = useSelector((state) => state.auth);

  if (loading) return null;
  const clinicRole = getClinicRole(user);
  if (!clinicRole || !allowedClinicRoles.includes(clinicRole)) {
    if (user?.role === "ADMIN") return <Navigate to="/admin-dashboard" replace />;
    const target = [CLINIC_ROLES.DENTIST, CLINIC_ROLES.PARTNER_DENTIST].includes(clinicRole)
      ? "/dashboard"
      : "/appointments";
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
};

export default RequireClinicRole;
