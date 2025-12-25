import React, { useState, useEffect } from "react";
import { register, login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../store/authSlice"; // Changed from loginSuccess
import "./Register.css";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "DENTIST",
    firstname: "",
    lastname: "",
    phoneNumber: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // --- Redirect Logic Helper ---
  const handleRedirect = (userData) => {
    if (!userData) return;

    const { role, isPhoneVerified, planStatus, plan } = userData;

    if (role === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
      return;
    }

    if (!isPhoneVerified) {
      navigate("/verify", { replace: true });
      return;
    }

    switch (planStatus) {
      case "ACTIVE":
        const planCode = plan?.code?.toUpperCase();
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
        break;
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      handleRedirect(user);
    }
  }, [isAuthenticated, user, navigate]);

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
      // 1. Register the user
      await register(formData);

      // 2. Login the user (This sets the cookies and returns user profile data)
      const userData = await login(formData.username, formData.password);

      // 3. Update Redux state with fetched user data
      dispatch(setCredentials(userData));

      // 4. Navigate based on account status
      handleRedirect(userData);

    } catch (error) {
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object' && errorData !== null) {
          setErrors(errorData);
        } else {
          alert(errorData.message || "Erreur lors de l'inscription");
        }
      } else {
        alert("Une erreur est survenue lors de l'inscription");
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