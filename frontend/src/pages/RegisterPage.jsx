import React, { useState, useEffect } from "react";
import { register, login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import "./Register.css";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "DENTIST",  // automatically set
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

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
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
      dispatch(loginSuccess(accessToken));

      // 3️⃣ Navigate to dashboard
      navigate("/dashboard");

    } catch (error) {
      if (error.response && error.response.data) {
        setErrors(error.response.data); // backend field errors
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

          {/* Role is now automatic; no select */}
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
/*
so fill out info then click sign up => account created but not verified so it won't let you into the app ou first need to 
confirm mail and phone and if you already sign up did not confirm you can login into your account but it will be directed 
to the confirmation place for mail and phone you have logout button or confrim then if done both confirmations it will take
 you to the chossing of plans 
free-7 days trial
basic  4000dzd
pro 5000dzd

if you dont' chose the plan anytime logged in it will take you here so you ahve to chose plan or logout 
*/