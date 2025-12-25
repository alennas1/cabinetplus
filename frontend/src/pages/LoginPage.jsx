import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../store/authSlice"; // Changed from loginSuccess
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // --- Redirect Logic ---
  const handleRedirect = (userData) => {
    if (!userData) return;

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
      default:
        navigate("/plan", { replace: true });
    }
  };

  // If user is already logged in, redirect them away from login page
  useEffect(() => {
    if (isAuthenticated && user) {
      handleRedirect(user);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Call login (Backend sets cookies)
      // 2. authService.login now returns the user object from /api/users/me
      const userData = await login(username.trim(), password.trim());

      // 3. Update Redux with the actual user data from the DB
      dispatch(setCredentials(userData));

      // 4. Handle expired plan alert
      if (userData.planStatus === "INACTIVE" && userData.expirationDate) {
        alert(`Votre offre a expiré le ${new Date(userData.expirationDate).toLocaleDateString()}`);
      }

      // 5. Navigate based on the fetched user data
      handleRedirect(userData);

    } catch (err) {
      // Handle 401 Unauthorized or other errors
      if (err.response?.status === 401) {
        setError("Nom d'utilisateur ou mot de passe incorrect");
      } else {
        setError("Une erreur est survenue lors de la connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <div className="auth-logo"><img src="/logo.png" alt="Logo" /></div>
        <h2>Connexion</h2>
        <div className="auth-form">
          <input 
            type="text" 
            placeholder="Nom d'utilisateur" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            disabled={loading} 
            autoComplete="username"
          />
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            disabled={loading} 
            autoComplete="current-password"
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