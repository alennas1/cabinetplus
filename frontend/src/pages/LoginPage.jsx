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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
      } else {
        const isVerified = user.isPhoneVerified; // Email removed

        if (!isVerified) {
          navigate("/verify", { replace: true });
          return;
        }

        switch (user.planStatus) {
          case "ACTIVE":
            navigate("/dashboard", { replace: true });
            break;
          case "WAITING":
            navigate("/waiting", { replace: true });
            break;
          case "PENDING":
          case "INACTIVE":
          default:
            navigate("/plan", { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { accessToken } = await login(username.trim(), password.trim());
      const userClaims = jwtDecode(accessToken);
      const { 
        isPhoneVerified, 
        planStatus, 
        plan, 
        role, 
        expirationDate 
      } = userClaims;

      const isVerified = isPhoneVerified;

      dispatch(loginSuccess(accessToken)); 

      if (role === "DENTIST" && !isVerified) {
        navigate("/verify", { replace: true });
        return; 
      }
      
      if (role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
        return;
      }

      switch (planStatus) {
        case "PENDING":
          navigate("/plan", { replace: true });
          break;
        case "WAITING":
          navigate("/waiting", { replace: true });
          break;
        case "ACTIVE":
          if (plan && ["FREE_TRIAL", "BASIC", "PRO"].includes(plan.code.toUpperCase())) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/plan", { replace: true }); 
          }
          break;
        case "INACTIVE":
          if (expirationDate) {
            alert(`Votre offre a expiré le ${new Date(expirationDate).toLocaleDateString()}`);
          }
          navigate("/plan", { replace: true });
          break;
        default:
          navigate("/plan", { replace: true });
      }
      
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