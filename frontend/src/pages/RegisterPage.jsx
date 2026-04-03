import React, { useState, useEffect } from "react";
import { register, getCurrentUser } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff } from "react-feather";
import { setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/error";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";
import { getUserPreferences } from "../services/userPreferenceService";
import { applyUserPreferences } from "../utils/workingHours";
import { isValidDzMobilePhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import FieldError from "../components/FieldError";
import "./Register.css";
import { FIELD_LIMITS, STRONG_PASSWORD_REGEX, validateText } from "../utils/validation";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    password: "",
    role: "DENTIST",
    firstname: "",
    lastname: "",
    phoneNumber: "",
    clinicName: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
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

    if (!userData.phoneVerified) {
      navigate("/verify", { replace: true });
      return;
    }

    const clinicRole = getClinicRole(userData);
    if (clinicRole !== CLINIC_ROLES.DENTIST) {
      navigate("/appointments", { replace: true });
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
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (error) setError("");
  };

  const validateForm = () => {
    const nextErrors = {};




    const firstnameError = validateText(formData.firstname, {
      label: "Prénom",
      required: true,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    if (firstnameError) nextErrors.firstname = firstnameError;

    const lastnameError = validateText(formData.lastname, {
      label: "Nom",
      required: true,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    if (lastnameError) nextErrors.lastname = lastnameError;

    if (!String(formData.phoneNumber || "").trim()) nextErrors.phoneNumber = "Le numéro de téléphone est obligatoire.";
    else if (!isValidDzMobilePhoneNumber(formData.phoneNumber)) {
      nextErrors.phoneNumber = "Numéro de téléphone invalide (ex: 05 51 51 51 51).";
    }

    if (!String(formData.password || "").trim()) nextErrors.password = "Le mot de passe est obligatoire.";
    else if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
      nextErrors.password =
        "Mot de passe invalide : minimum 8 caractères avec majuscule, minuscule, chiffre et symbole.";
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("Veuillez corriger les champs en rouge.");
      return;
    }

    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneInput(formData.phoneNumber);
      const { accessToken } = await register({ ...formData, phoneNumber: normalizedPhone });
      const currentUser = await getCurrentUser();
      dispatch(setAuthLoading(true));
      try {
        const prefs = await getUserPreferences();
        applyUserPreferences(prefs);
      } catch {
        applyUserPreferences(null);
      }
      dispatch(setCredentials({ token: accessToken, user: currentUser }));
      handleRedirect(currentUser);
    } catch (error) {
      const errorData = error?.response?.data;
      if (errorData && typeof errorData === "object") {
        if (errorData.fieldErrors && typeof errorData.fieldErrors === "object") {
          const mappedErrors = {
            password: errorData.fieldErrors.password || "",
            firstname: errorData.fieldErrors.firstname || "",
            lastname: errorData.fieldErrors.lastname || "",
            phoneNumber: errorData.fieldErrors.phoneNumber || "",
          };
          setFieldErrors(mappedErrors);
          setError(
            Object.values(mappedErrors).find(Boolean) || "Veuillez corriger les champs en rouge."
          );
        } else if (typeof errorData.error === "string") {
          const messageText = errorData.error;
          const lower = messageText.toLowerCase();
          const inferredErrors = {};
          if (lower.includes("password") || lower.includes("mot de passe")) {
            inferredErrors.password = messageText;
          }
          if (lower.includes("telephone") || lower.includes("téléphone") || lower.includes("phone")) {
            inferredErrors.phoneNumber = messageText;
          }
          if (Object.keys(inferredErrors).length) setFieldErrors(inferredErrors);
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
        <form noValidate onSubmit={handleSubmit} className="register-form-card">
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
              <div className="register-input-stack">
                <input
                  id="firstname"
                  type="text"
                  name="firstname"
                  placeholder="Prenom"
                  value={formData.firstname}
                  onChange={handleChange}
                  className={fieldErrors.firstname ? "invalid" : ""}
                  required
                  disabled={loading}
                  maxLength={FIELD_LIMITS.PERSON_NAME_MAX}
                />
                <FieldError message={fieldErrors.firstname} />
              </div>
              <div className="register-input-stack">
                <input
                  id="lastname"
                  type="text"
                  name="lastname"
                  placeholder="Nom"
                  value={formData.lastname}
                  onChange={handleChange}
                  className={fieldErrors.lastname ? "invalid" : ""}
                  required
                  disabled={loading}
                  maxLength={FIELD_LIMITS.PERSON_NAME_MAX}
                />
                <FieldError message={fieldErrors.lastname} />
              </div>
            </div>
          </div>

          <div className="register-field-group">
            <label htmlFor="phoneNumber">Numero de telephone</label>
            <PhoneInput
              id="phoneNumber"
              name="phoneNumber"
              placeholder="Ex: 05 51 51 51 51"
              value={formData.phoneNumber}
              onChangeValue={(v) => {
                setFormData((prev) => ({ ...prev, phoneNumber: v }));
                if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: "" }));
                if (error) setError("");
              }}
              className={fieldErrors.phoneNumber ? "invalid" : ""}
              required
              disabled={loading}
            />
            <FieldError message={fieldErrors.phoneNumber} />
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
                className={fieldErrors.password ? "invalid" : ""}
                required
                disabled={loading}
                maxLength={100}
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
            <FieldError message={fieldErrors.password} />
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

