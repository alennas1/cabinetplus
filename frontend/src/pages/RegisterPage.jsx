import React, { useState } from "react";
import { register } from "../services/authService";
import { Link } from "react-router-dom";
import "./Register.css";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "SECRETARY",
    firstname: "",
    lastname: "",
    email: "",
    phoneNumber: "",
  });

  const [errors, setErrors] = useState({}); // 🔹 holds field errors

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({
      ...errors,
      [e.target.name]: "", // clear error when typing
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // reset errors before submit

    try {
      await register(formData);
      alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    } catch (error) {
      if (error.response && error.response.data) {
        // 🔹 backend sends { field: "message" }
        setErrors(error.response.data);
      } else {
        alert("Erreur inconnue lors de l'inscription");
      }
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        {/* 🔹 Logo */}
        <div className="auth-logo">
          <img src="/logo.png" alt="CabinetPlus" />
        </div>

        <h2>Créer un compte</h2>

        <div className="auth-form">
          {/* Username */}
          <input
            type="text"
            name="username"
            placeholder="Nom d'utilisateur"
            value={formData.username}
            onChange={handleChange}
            required
          />
          {errors.username && <p className="error-text">{errors.username}</p>}

          {/* Password */}
          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={formData.password}
            onChange={handleChange}
            required
          />
          {errors.password && <p className="error-text">{errors.password}</p>}

          {/* Firstname + Lastname */}
          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                name="firstname"
                placeholder="Prénom"
                value={formData.firstname}
                onChange={handleChange}
              />
              {errors.firstname && (
                <p className="error-text">{errors.firstname}</p>
              )}
            </div>

            <div className="form-group">
              <input
                type="text"
                name="lastname"
                placeholder="Nom"
                value={formData.lastname}
                onChange={handleChange}
              />
              {errors.lastname && (
                <p className="error-text">{errors.lastname}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <p className="error-text">{errors.email}</p>}

          {/* Phone */}
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Numéro de téléphone"
            value={formData.phoneNumber}
            onChange={handleChange}
          />
          {errors.phoneNumber && (
            <p className="error-text">{errors.phoneNumber}</p>
          )}

          {/* Role */}
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="SECRETARY">Secrétaire</option>
            <option value="DENTIST">Dentiste</option>
          </select>
          {errors.role && <p className="error-text">{errors.role}</p>}

          <button type="submit">S'inscrire</button>
        </div>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;
