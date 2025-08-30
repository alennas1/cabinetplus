import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;  // Render the children (Dashboard, etc.) if authenticated
};

export default ProtectedRoute;
