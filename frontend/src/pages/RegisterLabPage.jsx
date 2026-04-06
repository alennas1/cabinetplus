import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { getCurrentUser, registerLab } from "../services/authService";
import { getUserPreferences } from "../services/userPreferenceService";
import { applyUserPreferences } from "../utils/workingHours";
import { getApiErrorMessage } from "../utils/error";
import { isValidDzMobilePhoneNumber, normalizePhoneInput } from "../utils/phone";
import { FIELD_LIMITS, isStrongPassword, validateText } from "../utils/validation";
import PhoneInput from "../components/PhoneInput";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import "./Register.css";

const RegisterLabPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phoneNumber: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (!user.phoneVerified) {
      navigate("/verify", { replace: true });
      return;
    }

    if (user.role === "LAB") {
      navigate("/lab", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (error) setError("");
  };

  const validateForm = () => {
    const nextErrors = {};

    const nameError = validateText(formData.name, {
      label: "Nom du laboratoire",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    if (nameError) nextErrors.name = nameError;

    const contactError = validateText(formData.contactPerson, {
      label: "Personne de contact",
      required: false,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    if (contactError) nextErrors.contactPerson = contactError;

    const phone = String(formData.phoneNumber || "").trim();
    if (!phone) nextErrors.phoneNumber = "Le numero de telephone est obligatoire.";
    else if (!isValidDzMobilePhoneNumber(phone)) {
      nextErrors.phoneNumber = "Numero de telephone invalide (ex: 05 51 51 51 51).";
    }

    const addressError = validateText(formData.address, {
      label: "Adresse",
      required: false,
      maxLength: 120,
    });
    if (addressError) nextErrors.address = addressError;

    const password = String(formData.password || "");
    if (!password) nextErrors.password = "Le mot de passe est obligatoire.";
    else if (!isStrongPassword(password)) {
      nextErrors.password = "Mot de passe invalide : minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole.";
    }

    const confirm = String(formData.confirmPassword || "");
    if (confirm !== password) nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";

    return nextErrors;
  };

  const payload = useMemo(() => {
    return {
      name: String(formData.name || "").trim(),
      contactPerson: String(formData.contactPerson || "").trim() || null,
      phoneNumber: normalizePhoneInput(formData.phoneNumber),
      address: String(formData.address || "").trim() || null,
      password: String(formData.password || ""),
    };
  }, [formData]);

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
      const { accessToken } = await registerLab(payload);
      const currentUser = await getCurrentUser();

      dispatch(setAuthLoading(true));
      try {
        const prefs = await getUserPreferences();
        applyUserPreferences(prefs);
      } catch {
        applyUserPreferences(null);
      }

      dispatch(setCredentials({ token: accessToken, user: currentUser }));

      if (!currentUser.phoneVerified) {
        navigate("/verify", { replace: true });
        return;
      }

      navigate("/lab", { replace: true });
    } catch (err) {
      const errorData = err?.response?.data;
      const next = {};
      if (errorData?.fieldErrors && typeof errorData.fieldErrors === "object") {
        if (errorData.fieldErrors.name) next.name = errorData.fieldErrors.name;
        if (errorData.fieldErrors.contactPerson) next.contactPerson = errorData.fieldErrors.contactPerson;
        if (errorData.fieldErrors.phoneNumber) next.phoneNumber = errorData.fieldErrors.phoneNumber;
        if (errorData.fieldErrors.address) next.address = errorData.fieldErrors.address;
        if (errorData.fieldErrors.password) next.password = errorData.fieldErrors.password;
        setFieldErrors(next);
        setError(Object.values(next).find(Boolean) || "Veuillez corriger les champs en rouge.");
      } else {
        setError(getApiErrorMessage(err, "Erreur lors de l'inscription."));
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

          <h1>Creer un compte laboratoire</h1>
          <p className="register-intro">
            Inscription laboratoire (nom, contact, telephone, adresse). Un code SMS sera envoye pour verifier votre numero.
          </p>

          <div className="register-field-group">
            <label htmlFor="name">Nom du laboratoire</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Ex: Lab Smile"
              value={formData.name}
              onChange={handleChange}
              className={fieldErrors.name ? "invalid" : ""}
              disabled={loading}
              maxLength={FIELD_LIMITS.TITLE_MAX}
              required
            />
            <FieldError message={fieldErrors.name} />
          </div>

          <div className="register-field-group">
            <label htmlFor="contactPerson">Personne de contact (optionnel)</label>
            <input
              id="contactPerson"
              type="text"
              name="contactPerson"
              placeholder="Ex: Ahmed"
              value={formData.contactPerson}
              onChange={handleChange}
              className={fieldErrors.contactPerson ? "invalid" : ""}
              disabled={loading}
              maxLength={FIELD_LIMITS.PERSON_NAME_MAX}
            />
            <FieldError message={fieldErrors.contactPerson} />
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
            <label htmlFor="address">Adresse (optionnel)</label>
            <input
              id="address"
              type="text"
              name="address"
              placeholder="Adresse (optionnel)"
              value={formData.address}
              onChange={handleChange}
              className={fieldErrors.address ? "invalid" : ""}
              disabled={loading}
              maxLength={120}
            />
            <FieldError message={fieldErrors.address} />
          </div>

          <div className="register-field-group">
            <label htmlFor="password">Mot de passe</label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={(e) => {
                const value = e?.target?.value ?? "";
                setFormData((prev) => ({ ...prev, password: value }));
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                if (error) setError("");
              }}
              disabled={loading}
              required
              wrapperClassName="register-password-wrap"
              inputClassName={fieldErrors.password ? "invalid" : ""}
              toggleClassName="register-password-toggle"
            />
            <FieldError message={fieldErrors.password} />
          </div>

          <div className="register-field-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirmer le mot de passe"
              value={formData.confirmPassword}
              onChange={(e) => {
                const value = e?.target?.value ?? "";
                setFormData((prev) => ({ ...prev, confirmPassword: value }));
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                if (error) setError("");
              }}
              disabled={loading}
              required
              wrapperClassName="register-password-wrap"
              inputClassName={fieldErrors.confirmPassword ? "invalid" : ""}
              toggleClassName="register-password-toggle"
            />
            <FieldError message={fieldErrors.confirmPassword} />
          </div>

          <p className={`register-error-message ${error ? "visible" : "placeholder"}`} aria-live="polite">
            <span className="register-error-icon" aria-hidden="true">
              !
            </span>
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

export default RegisterLabPage;

