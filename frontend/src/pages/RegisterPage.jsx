import React, { useState, useEffect } from "react";
import { register, login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { jwtDecode } from "jwt-decode";
import "./Register.css";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "DENTIST",
    firstname: "",
    lastname: "",
    phoneNumber: "", // Email removed
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

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
      await register(formData);
      const { accessToken } = await login(formData.username, formData.password);
      
      const userClaims = jwtDecode(accessToken);
      const { 
        isPhoneVerified, // isEmailVerified removed
        planStatus, 
        plan, 
        role,
      } = userClaims;
      
      // Verification now only depends on Phone
      const isVerified = isPhoneVerified;

      dispatch(loginSuccess(accessToken));

      if (role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
        return;
      }
      
      if (!isVerified) {
        navigate("/verify", { replace: true });
        return;
      }
      
      switch (planStatus) {
        case "ACTIVE":
          if (plan && ["FREE_TRIAL", "BASIC", "PRO"].includes(plan.code.toUpperCase())) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/plan", { replace: true });
          }
          break;
        case "PENDING":
        case "WAITING":
        case "INACTIVE":
        default:
          navigate("/plan", { replace: true });
          break;
      }
      
    } catch (error) {
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object' && errorData !== null) {
             setErrors(error.response.data);
        } else {
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