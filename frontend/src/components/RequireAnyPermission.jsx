import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { userHasPermission } from "../utils/permissions";

const RequireAnyPermission = ({ permissions = [], fallback = "/appointments" }) => {
  const { user, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Outlet />;

  const list = Array.isArray(permissions) ? permissions.filter(Boolean) : [];
  const allowed = list.some((perm) => userHasPermission(user, perm));

  if (!allowed) {
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RequireAnyPermission;
