import React, { useState, useEffect } from "react";
import { register, login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { jwtDecode } from "jwt-decode"; // <-- Import jwtDecode
import "./Register.css";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "DENTIST",  // automatically set
    firstname: "",
    lastname: "",
    email: "",
    phoneNumber: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Redirect if already logged in (This logic is fine for pre-login checks)
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // 1️⃣ Register user
      await register(formData);

      // 2️⃣ Auto-login after registration
      const { accessToken } = await login(formData.username, formData.password);
      
      // 3️⃣ Decode JWT to get required user claims
      const userClaims = jwtDecode(accessToken);
      const { 
        isEmailVerified, 
        isPhoneVerified, 
        planStatus, 
        plan, 
        role,
      } = userClaims;
      
      const isVerified = isEmailVerified && isPhoneVerified;

      // 4️⃣ Dispatch loginSuccess (stores token and user claims)
      dispatch(loginSuccess(accessToken));

      // 5️⃣ Determine Redirection Path based on the claims

      // ADMINs go straight to their dashboard (Assuming ADMIN registration is separate or handled differently)
      if (role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
        return;
      }
      
      // DENTIST Redirection Logic
      
      // A. Check for verification first
      if (!isVerified) {
        navigate("/verify", { replace: true });
        return;
      }
      
      // B. If verified, check plan status
      switch (planStatus) {
        case "ACTIVE":
          // If active and has a valid plan, go to dashboard
          if (plan && ["FREE_TRIAL", "BASIC", "PRO"].includes(plan.code.toUpperCase())) {
            navigate("/dashboard", { replace: true });
          } else {
            // Should theoretically not happen for a new user, but directs to plan page as a safeguard
            navigate("/plan", { replace: true });
          }
          break;
        case "PENDING":
        case "WAITING":
        case "INACTIVE":
        default:
          // New registered users will likely have PENDING/INACTIVE/null plan status and are directed to select a plan
          navigate("/plan", { replace: true });
          break;
      }
      
    } catch (error) {
      if (error.response && error.response.data) {
        // Handle backend field errors (username already exists, invalid email format, etc.)
        const errorData = error.response.data;
        if (typeof errorData === 'object' && errorData !== null) {
             setErrors(error.response.data);
        } else {
             // Handle generic message if not field-specific
             alert(errorData.message || "Erreur inconnue lors de l'inscription");
        }
      } else {
        alert("Erreur inconnue lors de l'inscription");
      }
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

        <h2>Créer un compte</h2>

        <div className="auth-form">
          <input
            type="text"
            name="username"
            placeholder="Nom d'utilisateur"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={loading}
          />
          {errors.username && <p className="error-text">{errors.username}</p>}

          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />
          {errors.password && <p className="error-text">{errors.password}</p>}

          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                name="firstname"
                placeholder="Prénom"
                value={formData.firstname}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.firstname && <p className="error-text">{errors.firstname}</p>}
            </div>

            <div className="form-group">
              <input
                type="text"
                name="lastname"
                placeholder="Nom"
                value={formData.lastname}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.lastname && <p className="error-text">{errors.lastname}</p>}
            </div>
          </div>

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
          />
          {errors.email && <p className="error-text">{errors.email}</p>}

          <input
            type="tel"
            name="phoneNumber"
            placeholder="Numéro de téléphone"
            value={formData.phoneNumber}
            onChange={handleChange}
            disabled={loading}
          />
          {errors.phoneNumber && <p className="error-text">{errors.phoneNumber}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Inscription..." : "S'inscrire"}
          </button>
        </div>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;