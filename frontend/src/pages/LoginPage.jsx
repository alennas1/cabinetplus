import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../store/authSlice";
import { login, getCurrentUser } from "../services/authService";
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

  const handleRedirect = (userData) => {
    if (!userData) return navigate("/login", { replace: true });

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
      // 1. Login via API (accessToken stored in memory)
      const { accessToken } = await login(username.trim(), password.trim());

      // 2. Fetch current user details
      const currentUser = await getCurrentUser();

      // 3. Update Redux store
      dispatch(setCredentials({ token: accessToken, user: currentUser }));

      // 4. Alert if plan expired
      if (currentUser.planStatus === "INACTIVE" && currentUser.expirationDate) {
        alert(
          `Votre offre a expiré le ${new Date(
            currentUser.expirationDate
          ).toLocaleDateString()}`
        );
      }

      // 5. Redirect based on role / status
      handleRedirect(currentUser);
    } catch (err) {
      setError(err.response?.data?.error || "Identifiants invalides");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="Logo" />
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