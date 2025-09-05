import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const RequireAuth = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // redirect to login but keep track of the requested page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />; // allow access
};

export default RequireAuth;
