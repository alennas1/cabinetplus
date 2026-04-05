import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { userHasPermission } from "../utils/permissions";

const RequirePermission = ({ permission, fallback = "/appointments" }) => {
  const { user, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Outlet />;

  if (!userHasPermission(user, permission)) {
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RequirePermission;

