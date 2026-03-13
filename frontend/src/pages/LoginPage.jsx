import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { login, getCurrentUser, sendPasswordResetCode, confirmPasswordReset } from "../services/authService";
import { getUserPreferences } from "../services/userPreferenceService";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "react-feather";
import PasswordInput from "../components/PasswordInput";
import { getApiErrorMessage } from "../utils/error";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";
import { formatDateByPreference } from "../utils/dateFormat";
import { applyUserPreferences } from "../utils/workingHours";
import femmed from "../assets/femmed.png";
import femmed2 from "../assets/femmed2.png";
import transpiamge from "../assets/transpiamge.png";
import "./Login.css";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState({ identifier: false, password: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeIllustration, setActiveIllustration] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState("phone");
  const [resetPhone, setResetPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSendCooldown, setResetSendCooldown] = useState(0);

  useEffect(() => {
    if (resetSendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResetSendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resetSendCooldown]);

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

    if (isActivePlan) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (userData.planStatus === "WAITING") {
      navigate("/waiting", { replace: true });
      return;
    }

    navigate("/plan", { replace: true });
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      handleRedirect(user);
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIllustration((prev) => (prev + 1) % 3);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInvalidFields({ identifier: false, password: false });
    setLoading(true);

    try {
      const { accessToken } = await login(identifier.trim(), password.trim());
      const currentUser = await getCurrentUser();
      dispatch(setAuthLoading(true));
      try {
        const prefs = await getUserPreferences();
        applyUserPreferences(prefs);
      } catch {
        applyUserPreferences(null);
      }
      dispatch(setCredentials({ token: accessToken, user: currentUser }));

      if (currentUser.planStatus === "INACTIVE" && currentUser.expirationDate) {
        alert(`Votre offre a expire le ${formatDateByPreference(currentUser.expirationDate)}`);
      }

      handleRedirect(currentUser);
    } catch (err) {
      const data = err?.response?.data;
      const field = data?.field;
      const message = data?.error;

      if (field === "username" || field === "phoneNumber" || field === "password") {
        const mappedField = field === "password" ? "password" : "identifier";
        setInvalidFields((prev) => ({ ...prev, [mappedField]: true }));
        setError(message || "Identifiants invalides");
      } else {
        setInvalidFields({ identifier: true, password: true });
        setError(getApiErrorMessage(err, "Identifiants invalides"));
      }
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = () => {
    setResetOpen(true);
    setResetStep("phone");
    setResetPhone("");
    setResetCode("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
    setResetSendCooldown(0);
  };

  const closeResetModal = () => {
    setResetOpen(false);
    setResetLoading(false);
    setResetError("");
    setResetSendCooldown(0);
  };

  const handleSendResetCode = async () => {
    if (!resetPhone.trim()) {
      setResetError("Entrez votre numero de telephone.");
      return;
    }
    if (resetSendCooldown > 0) return;
    setResetLoading(true);
    setResetError("");
    try {
      await sendPasswordResetCode(resetPhone.trim());
      setResetStep("code");
      setResetSendCooldown(60);
    } catch (err) {
      const retryAfter = Number(err?.response?.data?.retryAfterSeconds);
      if (err?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        setResetSendCooldown(retryAfter);
      }
      setResetError(getApiErrorMessage(err, "Impossible d'envoyer le code."));
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetCode.trim()) {
      setResetError("Entrez le code SMS.");
      return;
    }
    if (!resetNewPassword.trim()) {
      setResetError("Entrez un nouveau mot de passe.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Les mots de passe ne correspondent pas.");
      return;
    }

    setResetLoading(true);
    setResetError("");
    try {
      await confirmPasswordReset({
        phoneNumber: resetPhone.trim(),
        code: resetCode.trim(),
        newPassword: resetNewPassword,
      });
      setResetStep("done");
      setIdentifier(resetPhone.trim());
    } catch (err) {
      setResetError(getApiErrorMessage(err, "Code SMS invalide."));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-main">
        <section className="login-promo">
          <div className="promo-badge">
            <img src="/logo.png" alt="CabinetPlus" />
          </div>
          <div className="promo-content">
          <h1 className="promo-title">
            <span>Organisez</span>
            <span>votre cabinet</span>
            <span className="promo-title-accent">et plus.</span>
          </h1>
            <div className="promo-illustration">
              <img
                src={transpiamge}
                alt="Illustration dentiste homme"
                className={`promo-illustration-image ${activeIllustration === 0 ? "active" : ""}`}
              />
              <img
                src={femmed}
                alt="Illustration dentiste femme"
                className={`promo-illustration-image ${activeIllustration === 1 ? "active" : ""}`}
              />
              <img
                src={femmed2}
                alt="Illustration dentiste femme"
                className={`promo-illustration-image ${activeIllustration === 2 ? "active" : ""}`}
              />
            </div>
          </div>
        </section>

        <section className="login-panel">
          <form onSubmit={handleSubmit} className="login-form-card">
            <h2>Connexion</h2>

            <div className="auth-form">
              <input
                type="text"
                placeholder="Nom d'utilisateur ou numero de telephone"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (invalidFields.identifier) {
                    setInvalidFields((prev) => ({ ...prev, identifier: false }));
                  }
                  if (error) setError("");
                }}
                className={invalidFields.identifier ? "invalid" : ""}
                required
                disabled={loading}
              />

              <div className="password-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (invalidFields.password) {
                      setInvalidFields((prev) => ({ ...prev, password: false }));
                    }
                    if (error) setError("");
                  }}
                  className={invalidFields.password ? "invalid" : ""}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  disabled={loading}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              <p className={`error-message ${error ? "visible" : "placeholder"}`} aria-live="polite">
                <span className="error-icon" aria-hidden="true">!</span>
                <span>{error || "Nom d'utilisateur ou numero de telephone, ou mot de passe invalide"}</span>
              </p>

              <button type="submit" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </div>

            <button type="button" className="forgot-password-link" onClick={openResetModal}>
              Mot de passe oublie ?
            </button>

            <Link to="/register" className="create-account-btn">
              Creer un compte
            </Link>
          </form>
        </section>
      </div>

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

      {resetOpen && (
        <div className="login-reset-overlay" onClick={closeResetModal}>
          <div className="login-reset-card" onClick={(e) => e.stopPropagation()}>
            <h3>Reinitialiser le mot de passe</h3>
            <p className="login-reset-sub">
              Nous envoyons un code SMS pour verifier votre numero.
            </p>

            {resetStep === "phone" && (
              <div className="login-reset-form">
                <input
                  type="text"
                  placeholder="Numero de telephone"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  disabled={resetLoading}
                />
                <button type="button" onClick={handleSendResetCode} disabled={resetLoading || resetSendCooldown > 0}>
                  {resetLoading
                    ? "Envoi..."
                    : resetSendCooldown > 0
                    ? `Renvoyer dans ${resetSendCooldown}s`
                    : "Envoyer le code"}
                </button>
              </div>
            )}

            {resetStep === "code" && (
              <div className="login-reset-form">
                <input
                  type="text"
                  placeholder="Code SMS"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  disabled={resetLoading}
                />
                <PasswordInput
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  disabled={resetLoading}
                  autoComplete="new-password"
                />
                <PasswordInput
                  placeholder="Confirmer le mot de passe"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  disabled={resetLoading}
                  autoComplete="new-password"
                />
                <button type="button" onClick={handleConfirmReset} disabled={resetLoading}>
                  {resetLoading ? "Verification..." : "Reinitialiser"}
                </button>
                <button type="button" onClick={handleSendResetCode} disabled={resetLoading || resetSendCooldown > 0}>
                  {resetSendCooldown > 0 ? `Renvoyer dans ${resetSendCooldown}s` : "Renvoyer le code"}
                </button>
              </div>
            )}

            {resetStep === "done" && (
              <div className="login-reset-success">
                <p>Mot de passe reinitialise. Vous pouvez vous connecter.</p>
                <button type="button" onClick={closeResetModal}>
                  Retour a la connexion
                </button>
              </div>
            )}

            {resetError && <p className="login-reset-error">{resetError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
