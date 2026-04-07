import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import {
  login,
  verifyLoginTwoFactor,
  resendLoginTwoFactor,
  getCurrentUser,
  sendPasswordResetCode,
  confirmPasswordReset,
} from "../services/authService";
import { getUserPreferences } from "../services/userPreferenceService";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "react-feather";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import { getApiErrorMessage } from "../utils/error";
import { isValidDzMobilePhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";
import { formatDateByPreference } from "../utils/dateFormat";
import { applyUserPreferences } from "../utils/workingHours";
import { isStrongPassword } from "../utils/validation";
import femmed from "../assets/femmed.png";
import femmed2 from "../assets/femmed2.png";
import transpiamge from "../assets/transpiamge.png";
import "./Login.css";

const LoginPage = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState({ phoneNumber: false, password: false });
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
  const [resetFieldErrors, setResetFieldErrors] = useState({});
  const [resetSendCooldown, setResetSendCooldown] = useState(0);

  const [employeeSetupOpen, setEmployeeSetupOpen] = useState(false);
  const [employeeSetupId, setEmployeeSetupId] = useState("");
  const [employeeSetupError, setEmployeeSetupError] = useState("");

  const [loginTwoFactorRequired, setLoginTwoFactorRequired] = useState(false);
  const [loginChallengeToken, setLoginChallengeToken] = useState("");
  const [loginMaskedPhone, setLoginMaskedPhone] = useState("");
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [loginOtpInvalid, setLoginOtpInvalid] = useState(false);
  const [loginOtpCooldown, setLoginOtpCooldown] = useState(0);

  useEffect(() => {
    if (resetSendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResetSendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resetSendCooldown]);

  const openEmployeeSetupModal = () => {
    setEmployeeSetupId("");
    setEmployeeSetupError("");
    setEmployeeSetupOpen(true);
  };

  const closeEmployeeSetupModal = () => {
    setEmployeeSetupOpen(false);
  };

  useEffect(() => {
    if (loginOtpCooldown <= 0) return;
    const id = window.setInterval(() => {
      setLoginOtpCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [loginOtpCooldown]);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const resetLoginTwoFactorState = () => {
    setLoginTwoFactorRequired(false);
    setLoginChallengeToken("");
    setLoginMaskedPhone("");
    setLoginOtpCode("");
    setLoginOtpInvalid(false);
    setLoginOtpCooldown(0);
  };

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

    if (userData.role === "LAB") {
      navigate("/lab", { replace: true });
      return;
    }

    const clinicRole = getClinicRole(userData);
    if (clinicRole !== CLINIC_ROLES.DENTIST) {
      navigate("/appointments", { replace: true });
      return;
    }

    const isActivePlan = isPlanActiveForAccess(userData);

    if (isActivePlan) {
      if (userData?.gestionCabinetPinConfigured !== true) {
        navigate("/pin-setup", { replace: true });
        return;
      }
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
    setInvalidFields({ phoneNumber: false, password: false });
    setLoginOtpInvalid(false);
    resetLoginTwoFactorState();

    const trimmedPhone = String(phoneNumber || "").trim();
    const trimmedPassword = String(password || "").trim();

    if (!trimmedPhone) {
      setInvalidFields((prev) => ({ ...prev, phoneNumber: true }));
      setError("Entrez votre numero de telephone.");
      return;
    }
    if (!isValidDzMobilePhoneNumber(trimmedPhone)) {
      setInvalidFields((prev) => ({ ...prev, phoneNumber: true }));
      setError("Numero de telephone invalide (ex: 05 51 51 51 51).");
      return;
    }
    if (!trimmedPassword) {
      setInvalidFields((prev) => ({ ...prev, password: true }));
      setError("Entrez votre mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const data = await login(normalizePhoneInput(trimmedPhone), trimmedPassword);

      if (data?.twoFactorRequired) {
        setLoginTwoFactorRequired(true);
        setLoginChallengeToken(String(data.challengeToken || ""));
        setLoginMaskedPhone(String(data.maskedPhone || ""));
        setLoginOtpCode("");
        setLoginOtpInvalid(false);
        setLoginOtpCooldown(60);
        setPassword("");
        return;
      }

      const accessToken = data?.accessToken;
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

      if (field === "phoneNumber" || field === "password") {
        const mappedField = field === "password" ? "password" : "phoneNumber";
        setInvalidFields((prev) => ({ ...prev, [mappedField]: true }));
        setError(message || "Identifiants invalides");
      } else {
        setInvalidFields({ phoneNumber: true, password: true });
        setError(getApiErrorMessage(err, "Identifiants invalides"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e?.preventDefault?.();
    setError("");
    setLoginOtpInvalid(false);

    const code = String(loginOtpCode || "").trim();
    if (!code) {
      setLoginOtpInvalid(true);
      setError("Entrez le code SMS.");
      return;
    }
    if (!/^[0-9]{4,8}$/.test(code)) {
      setLoginOtpInvalid(true);
      setError("Code SMS invalide.");
      return;
    }

    setLoading(true);
    try {
      const data = await verifyLoginTwoFactor({ challengeToken: loginChallengeToken, code });
      const accessToken = data?.accessToken;
      const currentUser = await getCurrentUser();
      dispatch(setAuthLoading(true));
      try {
        const prefs = await getUserPreferences();
        applyUserPreferences(prefs);
      } catch {
        applyUserPreferences(null);
      }
      dispatch(setCredentials({ token: accessToken, user: currentUser }));
      resetLoginTwoFactorState();
      handleRedirect(currentUser);
    } catch (err) {
      const reason = err?.response?.data?.reason;
      if (reason === "challenge_expired" || reason === "challenge_invalid" || reason === "user_not_found") {
        resetLoginTwoFactorState();
      }
      setLoginOtpInvalid(true);
      setError(getApiErrorMessage(err, "Code SMS invalide."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (loginOtpCooldown > 0 || loading) return;

    setError("");
    setLoginOtpInvalid(false);
    setLoading(true);

    try {
      const data = await resendLoginTwoFactor(loginChallengeToken);
      if (data?.challengeToken) setLoginChallengeToken(String(data.challengeToken));
      if (data?.maskedPhone) setLoginMaskedPhone(String(data.maskedPhone));
      setLoginOtpCooldown(60);
    } catch (err) {
      const retryAfter = Number(err?.response?.data?.retryAfterSeconds);
      if (err?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        setLoginOtpCooldown(retryAfter);
      }
      setError(getApiErrorMessage(err, "Erreur lors de l'envoi du code."));
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
    setResetFieldErrors({});
    setResetSendCooldown(0);
  };

  const closeResetModal = () => {
    setResetOpen(false);
    setResetLoading(false);
    setResetError("");
    setResetFieldErrors({});
    setResetSendCooldown(0);
  };

  const handleSendResetCode = async () => {
    setResetFieldErrors({});
    if (!resetPhone.trim()) {
      setResetFieldErrors({ phone: "Entrez votre numero de telephone." });
      return;
    }
    if (!isValidDzMobilePhoneNumber(resetPhone)) {
      setResetFieldErrors({ phone: "Numero de telephone invalide (ex: 05 51 51 51 51)." });
      return;
    }
    if (resetSendCooldown > 0) return;
    setResetLoading(true);
    setResetError("");
    try {
      await sendPasswordResetCode(normalizePhoneInput(resetPhone));
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
    setResetFieldErrors({});
    if (!resetCode.trim()) {
      setResetFieldErrors({ code: "Entrez le code SMS." });
      return;
    }
    if (!resetNewPassword.trim()) {
      setResetFieldErrors({ newPassword: "Entrez un nouveau mot de passe." });
      return;
    }
    if (!isStrongPassword(resetNewPassword)) {
      setResetFieldErrors({
        newPassword: "Mot de passe invalide : minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole.",
      });
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetFieldErrors({ confirmPassword: "Les mots de passe ne correspondent pas." });
      return;
    }

    setResetLoading(true);
    setResetError("");
    try {
      await confirmPasswordReset({
        phoneNumber: normalizePhoneInput(resetPhone),
        code: resetCode.trim(),
        newPassword: resetNewPassword,
      });
      setResetStep("done");
      setIdentifier(normalizePhoneInput(resetPhone));
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
          <form
            noValidate
            onSubmit={loginTwoFactorRequired ? handleVerifyLoginOtp : handleSubmit}
            className="login-form-card"
          >
            <h2>{loginTwoFactorRequired ? "Verification SMS" : "Connexion"}</h2>

            <div className="auth-form">
              {loginTwoFactorRequired ? (
                <>
                  <p style={{ marginTop: "-6px", color: "#64748b", fontSize: "13px" }}>
                    Un code SMS a ete envoye au {loginMaskedPhone || "votre numero"}.
                  </p>

                  <input
                    type="text"
                    placeholder="Code SMS"
                    value={loginOtpCode}
                    onChange={(e) => {
                      setLoginOtpCode(e.target.value);
                      if (loginOtpInvalid) setLoginOtpInvalid(false);
                      if (error) setError("");
                    }}
                    inputMode="numeric"
                    maxLength={8}
                    className={loginOtpInvalid ? "invalid" : ""}
                    required
                    disabled={loading}
                  />
                </>
              ) : (
                <>
                  <PhoneInput
                    placeholder="Numero de telephone (ex: 05 51 51 51 51)"
                    value={phoneNumber}
                    onChangeValue={(v) => {
                      setPhoneNumber(v);
                      if (invalidFields.phoneNumber) {
                        setInvalidFields((prev) => ({ ...prev, phoneNumber: false }));
                      }
                      if (error) setError("");
                    }}
                    className={invalidFields.phoneNumber ? "invalid" : ""}
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
                </>
              )}

              <p className={`error-message ${error ? "visible" : "placeholder"}`} aria-live="polite">
                <span className="error-icon" aria-hidden="true">!</span>
                <span>{error || "Numero de telephone ou mot de passe invalide"}</span>
              </p>

              <button type="submit" disabled={loading}>
                {loginTwoFactorRequired
                  ? loading
                    ? "Verification..."
                    : "Verifier le code"
                  : loading
                  ? "Connexion..."
                  : "Se connecter"}
              </button>
            </div>

            {loginTwoFactorRequired ? (
              <>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={handleResendLoginOtp}
                  disabled={loading || loginOtpCooldown > 0}
                >
                  {loginOtpCooldown > 0 ? `Renvoyer dans ${loginOtpCooldown}s` : "Renvoyer le code"}
                </button>

                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    resetLoginTwoFactorState();
                    setError("");
                  }}
                  disabled={loading}
                >
                  Retour
                </button>
              </>
            ) : (
              <>
                <button type="button" className="forgot-password-link" onClick={openResetModal}>
                  Mot de passe oublie ?
                </button>

                <button type="button" className="create-account-btn" onClick={openEmployeeSetupModal}>
                  Nouvel employe
                </button>

                <Link to="/register" className="create-account-btn">
                  Creer un compte
                </Link>

                <Link to="/register-lab" className="create-account-btn">
                  Creer un compte laboratoire
                </Link>
              </>
            )}
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
                <PhoneInput
                  placeholder="Numero de telephone (ex: 05 51 51 51 51)"
                  value={resetPhone}
                  onChangeValue={(v) => {
                    setResetPhone(v);
                    if (resetFieldErrors.phone) setResetFieldErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  disabled={resetLoading}
                  className={resetFieldErrors.phone ? "invalid" : ""}
                />
                <FieldError message={resetFieldErrors.phone} />
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
                  onChange={(e) => {
                    setResetCode(e.target.value);
                    if (resetFieldErrors.code) setResetFieldErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  disabled={resetLoading}
                  className={resetFieldErrors.code ? "invalid" : ""}
                />
                <FieldError message={resetFieldErrors.code} />
                <PasswordInput
                  value={resetNewPassword}
                  onChange={(e) => {
                    setResetNewPassword(e.target.value);
                    if (resetFieldErrors.newPassword) setResetFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                  }}
                  placeholder="Nouveau mot de passe"
                  disabled={resetLoading}
                  autoComplete="new-password"
                  inputClassName={resetFieldErrors.newPassword ? "invalid" : ""}
                />
                <FieldError message={resetFieldErrors.newPassword} />
                <PasswordInput
                  placeholder="Confirmer le mot de passe"
                  value={resetConfirmPassword}
                  onChange={(e) => {
                    setResetConfirmPassword(e.target.value);
                    if (resetFieldErrors.confirmPassword) {
                      setResetFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  disabled={resetLoading}
                  autoComplete="new-password"
                  inputClassName={resetFieldErrors.confirmPassword ? "invalid" : ""}
                />
                <FieldError message={resetFieldErrors.confirmPassword} />
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

      {employeeSetupOpen && (
        <div className="login-reset-overlay" onClick={closeEmployeeSetupModal}>
          <div className="login-reset-card" onClick={(e) => e.stopPropagation()}>
            <h3>Nouvel employe</h3>
            <p className="login-reset-sub">Entrez l'ID d'invitation recu du dentiste pour configurer votre compte.</p>

            <div className="login-reset-form">
                <input
                  type="text"
                  placeholder="ID d'invitation"
                  value={employeeSetupId}
                  onChange={(e) => {
                    setEmployeeSetupId(e.target.value);
                    if (employeeSetupError) setEmployeeSetupError("");
                  }}
                />

              {employeeSetupError ? <p className="login-reset-error">{employeeSetupError}</p> : null}

              <button
                type="button"
                  onClick={() => {
                    const id = String(employeeSetupId || "").trim();
                    if (!id) {
                      setEmployeeSetupError("ID obligatoire");
                      return;
                    }
                    if (!/^\d{4,12}$/.test(id)) {
                      setEmployeeSetupError("ID invalide (chiffres uniquement)");
                      return;
                    }
                    closeEmployeeSetupModal();
                    navigate(`/employee-setup/${encodeURIComponent(id)}`);
                  }}
                >
                Configurer mon compte
              </button>

              <button type="button" className="login-reset-cancel" onClick={closeEmployeeSetupModal}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
