import React, { useState, useEffect } from "react";
import { register, login, getCurrentUser } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff } from "react-feather";
import { setCredentials } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/error";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";
import "./Register.css";

const DZ_PHONE_REGEX = /^(?:0[5-7]\d{8}|(?:\+?213)[5-7]\d{8})$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/;

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "DENTIST",
    firstname: "",
    lastname: "",
    phoneNumber: "",
    clinicName: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState({
    username: false,
    password: false,
    firstname: false,
    lastname: false,
    phoneNumber: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleRedirect = (userData) => {
    if (!userData) return navigate("/login", { replace: true });

    if (userData.role === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
      return;
    }

    const clinicRole = getClinicRole(userData);
    if (clinicRole !== CLINIC_ROLES.DENTIST) {
      if (clinicRole === CLINIC_ROLES.PARTNER_DENTIST) navigate("/dashboard", { replace: true });
      else navigate("/appointments", { replace: true });
      return;
    }

    if (!userData.phoneVerified) {
      navigate("/verify", { replace: true });
      return;
    }

    const isActivePlan = isPlanActiveForAccess(userData);

    if (!isActivePlan && userData.planStatus === "WAITING") {
      navigate("/waiting", { replace: true });
      return;
    }

    navigate(isActivePlan ? "/dashboard" : "/plan", { replace: true });
  };

  useEffect(() => {
    if (isAuthenticated && user) handleRedirect(user);
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (invalidFields[name]) {
      setInvalidFields((prev) => ({ ...prev, [name]: false }));
    }
    if (error) setError("");
  };

  const validateForm = () => {
    const nextInvalid = {
      username: false,
      password: false,
      firstname: false,
      lastname: false,
      phoneNumber: false,
    };

    if (!formData.username.trim()) {
      nextInvalid.username = true;
      return { message: "Le nom d'utilisateur est obligatoire.", invalid: nextInvalid };
    }
    if (!formData.firstname.trim()) {
      nextInvalid.firstname = true;
      return { message: "Le prenom est obligatoire.", invalid: nextInvalid };
    }
    if (!formData.lastname.trim()) {
      nextInvalid.lastname = true;
      return { message: "Le nom est obligatoire.", invalid: nextInvalid };
    }
    if (!formData.phoneNumber.trim()) {
      nextInvalid.phoneNumber = true;
      return { message: "Le numero de telephone est obligatoire.", invalid: nextInvalid };
    }
    if (!DZ_PHONE_REGEX.test(formData.phoneNumber.trim())) {
      nextInvalid.phoneNumber = true;
      return {
        message: "Numero de telephone algerien invalide (ex: 0550123456 ou +213550123456).",
        invalid: nextInvalid,
      };
    }

    if (!formData.password.trim()) {
      nextInvalid.password = true;
      return { message: "Le mot de passe est obligatoire.", invalid: nextInvalid };
    }
    if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
      nextInvalid.password = true;
      return {
        message: "Mot de passe invalide : minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole.",
        invalid: nextInvalid,
      };
    }

    return { message: "", invalid: nextInvalid };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInvalidFields({
      username: false,
      password: false,
      firstname: false,
      lastname: false,
      phoneNumber: false,
    });

    const { message, invalid } = validateForm();
    if (message) {
      setError(message);
      setInvalidFields(invalid);
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      const { accessToken } = await login(formData.username, formData.password);
      const currentUser = await getCurrentUser();
      dispatch(setCredentials({ token: accessToken, user: currentUser }));
      handleRedirect(currentUser);
    } catch (error) {
      const errorData = error?.response?.data;
      if (errorData && typeof errorData === "object") {
        if (errorData.fieldErrors && typeof errorData.fieldErrors === "object") {
          const mappedInvalid = {
            username: Boolean(errorData.fieldErrors.username),
            password: Boolean(errorData.fieldErrors.password),
            firstname: Boolean(errorData.fieldErrors.firstname),
            lastname: Boolean(errorData.fieldErrors.lastname),
            phoneNumber: Boolean(errorData.fieldErrors.phoneNumber),
          };
          setInvalidFields(mappedInvalid);
          setError(
            Object.values(errorData.fieldErrors).find(Boolean) || "Veuillez corriger les champs en rouge."
          );
        } else if (typeof errorData.error === "string") {
          const messageText = errorData.error;
          const lower = messageText.toLowerCase();
          setInvalidFields((prev) => ({
            ...prev,
            username:
              prev.username ||
              lower.includes("username") ||
              lower.includes("utilisateur") ||
              lower.includes("already") ||
              lower.includes("existe") ||
              lower.includes("exist"),
            password: prev.password || lower.includes("password") || lower.includes("mot de passe"),
            phoneNumber: prev.phoneNumber || lower.includes("telephone") || lower.includes("phone"),
          }));
          setError(messageText);
        } else {
          setError(getApiErrorMessage(error, "Erreur inconnue lors de l'inscription."));
        }
      } else {
        setError(getApiErrorMessage(error, "Erreur inconnue lors de l'inscription."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-shell">
      <main className="register-page-main">
        <form onSubmit={handleSubmit} className="register-form-card">
          <div className="register-brand-row">
            <Link to="/login" className="register-back-link" aria-label="Retour a la connexion">
              <span className="register-back-chevron" aria-hidden="true" />
            </Link>
            <img src="/logo.png" alt="CabinetPlus" className="register-brand-logo" />
          </div>

          <h1>Creer un compte</h1>
          <p className="register-intro">
            Creez votre espace CabinetPlus pour organiser vos patients, rendez-vous et activites.
          </p>

          <div className="register-field-group">
            <label htmlFor="firstname">Nom</label>
            <div className="register-two-cols">
              <input
                id="firstname"
                type="text"
                name="firstname"
                placeholder="Prenom"
                value={formData.firstname}
                onChange={handleChange}
                className={invalidFields.firstname ? "invalid" : ""}
                required
                disabled={loading}
              />
              <input
                id="lastname"
                type="text"
                name="lastname"
                placeholder="Nom"
                value={formData.lastname}
                onChange={handleChange}
                className={invalidFields.lastname ? "invalid" : ""}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="register-field-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder="Nom d'utilisateur"
              value={formData.username}
              onChange={handleChange}
              className={invalidFields.username ? "invalid" : ""}
              required
              disabled={loading}
            />
          </div>

          <div className="register-field-group">
            <label htmlFor="phoneNumber">Numero de telephone</label>
            <input
              id="phoneNumber"
              type="tel"
              name="phoneNumber"
              placeholder="Numero de telephone"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={invalidFields.phoneNumber ? "invalid" : ""}
              required
              disabled={loading}
            />
          </div>

          <div className="register-field-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="register-password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Mot de passe"
                value={formData.password}
                onChange={handleChange}
                className={invalidFields.password ? "invalid" : ""}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                disabled={loading}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <div className="register-field-group">
            <label htmlFor="clinicName">Clinique (facultatif)</label>
            <input
              id="clinicName"
              type="text"
              name="clinicName"
              placeholder="Clinique (facultatif)"
              value={formData.clinicName}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="register-field-group">
            <label htmlFor="address">Adresse (facultatif)</label>
            <input
              id="address"
              type="text"
              name="address"
              placeholder="Adresse (facultatif)"
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <p className={`register-error-message ${error ? "visible" : "placeholder"}`} aria-live="polite">
            <span className="register-error-icon" aria-hidden="true">!</span>
            <span>{error || "Veuillez corriger les champs en rouge."}</span>
          </p>

          <button type="submit" className="register-submit-btn" disabled={loading}>
            {loading ? "Inscription..." : "S'inscrire"}
          </button>

          <Link to="/login" className="register-login-btn">
            Deja un compte ? Se connecter
          </Link>
        </form>
      </main>

      <footer className="login-footer-global">
        <span className="login-footer-copy">&copy; {new Date().getFullYear()} CabinetPlus. Tous droits reserves.</span>

        <div className="login-footer-links">
          <a href="#">Confidentialite</a>
          <span>&bull;</span>
          <a href="#">Conditions</a>
          <span>&bull;</span>
          <a href="#">Assistance</a>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;

