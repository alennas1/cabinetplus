import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';
import "./Login.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Access the authentication state AND user object (MODIFIED)
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Auto-redirect if already authenticated (MODIFIED LOGIC)
  useEffect(() => {
    // Check if authenticated AND user data (containing role) is present
    if (isAuthenticated && user) {
      let redirectPath = "/dashboard"; // Default for DENTIST

      // Determine the correct landing page based on the role
      if (user.role === "ADMIN") {
        redirectPath = "/admin-dashboard";
      }
      
      // Navigate the authenticated user to their correct dashboard
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]); // Added 'user' to dependency array

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { accessToken } = await login(username.trim(), password.trim());

      // --- New Logic: Decode and Check Claims for Navigation ---
      const userClaims = jwtDecode(accessToken);
      const { isEmailVerified, isPhoneVerified, planStatus, exp } = userClaims;
      
      const isVerified = isEmailVerified && isPhoneVerified;
      const isPlanPending = planStatus === "PENDING_PLAN";
      
      const isExpired = Date.now() >= exp * 1000; 

      // Save access token in Redux (This also stores the decoded user claims in state)
      dispatch(loginSuccess(accessToken));

      // Conditional Navigation based on JWT claims
      if (!isVerified) {
        navigate("/verify", { replace: true }); 
      } else if (isPlanPending || isExpired) {
        navigate("/plan", { replace: true }); 
      } else {
        // All checks pass, navigate based on role (POST-LOGIN REDIRECT)
        const userRole = userClaims.role;
        
        if (userRole === "ADMIN") {
          navigate("/admin-dashboard", { replace: true }); // New Admin landing
        } else if (userRole === "DENTIST") {
          navigate("/dashboard", { replace: true }); // Existing Dentist landing
        } else {
          // Fallback for unknown role
          navigate("/unauthorized", { replace: true }); 
        }
      }
      // -----------------------------------------------------------

    } catch (err) {
      const msg = err.response?.data?.message || "Identifiants invalides";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="CabinetPlus" />
        </div>

        <h2>Connexion</h2>

        <div className="auth-form">
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </div>

        <p className="auth-footer">
          Pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;