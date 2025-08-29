import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom"; // 👈 import useNavigate
import "./Login.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate(); // 👈 create navigate

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(username, password);
      dispatch(loginSuccess(data.token));

      // 👇 Redirect to dashboard after login
      navigate("/dashboard");
    } catch {
      alert("Identifiants invalides");
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        {/* 🔹 Logo */}
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
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Se connecter</button>
        </div>

        <p className="auth-footer">
          Pas encore de compte ?{" "}
          <Link to="/register">S'inscrire</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
