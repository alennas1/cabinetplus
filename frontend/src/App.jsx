import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux"; // Accessing Redux state
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";  // Protected page
import Layout from "./components/Layout"; // Layout with sidebar
import "./index.css";

function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated); // Authentication state

  console.log("isAuthenticated in App.jsx: ", isAuthenticated);  // Debugging line

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        {!isAuthenticated && (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </>
        )}

        {/* Protected routes */}
        {isAuthenticated ? (
          <>
            {/* If authenticated, always redirect to Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* Layout with sidebar wrapping protected pages */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}

        {/* Default redirect to login for unauthenticated users */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
