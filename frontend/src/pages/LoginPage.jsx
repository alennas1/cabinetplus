import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./Login.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false); // New state for persistence
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Helper function to handle redirection logic
  const handleRedirect = (userData) => {
    if (userData.role === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
      return;
    }

    if (!userData.isPhoneVerified) {
      navigate("/verify", { replace: true });
      return;
    }

    switch (userData.planStatus) {
      case "ACTIVE":
        // Check for specific plan codes if necessary
        const planCode = userData.plan?.code?.toUpperCase();
        if (planCode && ["FREE_TRIAL", "BASIC", "PRO"].includes(planCode)) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/plan", { replace: true });
        }
        break;
      case "WAITING":
        navigate("/waiting", { replace: true });
        break;
      case "PENDING":
      case "INACTIVE":
      default:
        navigate("/plan", { replace: true });
    }
  };

  // 1. Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      handleRedirect(user);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Pass rememberMe to the service to decide between localStorage/sessionStorage
      const { accessToken } = await login(
        username.trim(), 
        password.trim(), 
        rememberMe
      );

      const userClaims = jwtDecode(accessToken);
      
      // Update Redux state
      dispatch(loginSuccess(accessToken)); 

      // Alert user if expired before redirecting
      if (userClaims.planStatus === "INACTIVE" && userClaims.expirationDate) {
        alert(`Votre offre a expiré le ${new Date(userClaims.expirationDate).toLocaleDateString()}`);
      }

      // 2. Initial redirect after successful login
      handleRedirect(userClaims);
      
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

          {/* New Remember Me Checkbox Section */}
          <div className="remember-me-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Rester connecté</span>
            </label>
          </div>

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