import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { login } from "../services/authService"; // Assuming you have this service
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

  // Redirect on login status change (Handles users accessing /login while already logged in)
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
      } else {
        // DENTIST redirects based on plan status and verification status from the store
        // NOTE: The initial login redirect is handled in handleSubmit below.
        
        const isVerified = user.isEmailVerified && user.isPhoneVerified;

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
        isEmailVerified, 
        isPhoneVerified, 
        planStatus, 
        plan, 
        role, 
        expirationDate 
      } = userClaims;

      const isVerified = isEmailVerified && isPhoneVerified;

      // --- CRITICAL FIX: Handle unverified users first ---
      
      // We must dispatch loginSuccess before redirecting to /verify 
      // so the token and user details (including verification status) are stored in Redux.
      dispatch(loginSuccess(accessToken)); 

      if (role === "DENTIST" && !isVerified) {
        navigate("/verify", { replace: true });
        return; // Stop further execution
      }
      
      // --- End of Fix ---
      
      // ADMIN Redirection
      if (role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
        return;
      }

      // DENTIST Redirection (For verified dentists)
      switch (planStatus) {
        case "PENDING":
          navigate("/plan", { replace: true });
          break;
        case "WAITING":
          navigate("/waiting", { replace: true });
          break;
        case "ACTIVE":
          // Check for a valid plan code before redirecting to dashboard
          if (plan && ["FREE_TRIAL", "BASIC", "PRO"].includes(plan.code.toUpperCase())) {
            navigate("/dashboard", { replace: true });
          } else {
            // Should not happen often if planStatus is ACTIVE, but directs to plan page if plan data is missing/invalid
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
      // If login fails, remove the token and show error
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