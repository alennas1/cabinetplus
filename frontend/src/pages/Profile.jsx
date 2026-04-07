import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Check, Edit2, X, User, Phone, Home } from "react-feather"; // Removed Mail icon
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getMyEmployeeProfile, getUserProfile, updateUserProfile } from "../services/userService";
import { formatPhoneNumber as formatPhoneNumberDisplay, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import { getApiErrorMessage, getApiFieldErrors } from "../utils/error";
import { confirmPhoneChangeOtp, sendPhoneChangeOtp } from "../services/securityService";
import PhoneInput from "../components/PhoneInput";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import { getCurrentUser } from "../services/authService";
import { setCredentials } from "../store/authSlice";
import { formatDateByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import "./Profile.css";

const fieldLabels = {
  firstname: "Prénom",
  lastname: "Nom",
  phoneNumber: "Téléphone",
  profession: "Profession",
  clinicName: "Nom de la clinique",
  address: "Adresse",
};

const fieldIcons = {
  firstname: <User size={16} />,
  lastname: <User size={16} />,
  phoneNumber: <Phone size={16} />,
  profession: <User size={16} />,
  clinicName: <Home size={16} />,
  address: <Home size={16} />,
};

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isClinicEmployeeAccount =
    user?.role === "EMPLOYEE" || !!user?.ownerDentist || !!user?.ownerDentistId;

  const passwordProtectedFields = new Set(["firstname", "lastname", "clinicName", "address"]);

  const [profile, setProfile] = useState({ profession: "Dentiste" });
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeActiveTab, setEmployeeActiveTab] = useState("profile");
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const [showProfilePasswordModal, setShowProfilePasswordModal] = useState(false);
  const [profileUpdatePassword, setProfileUpdatePassword] = useState("");
  const [profileUpdatePasswordError, setProfileUpdatePasswordError] = useState("");
  const [profileUpdateBusy, setProfileUpdateBusy] = useState(false);
  const [pendingProfileUpdate, setPendingProfileUpdate] = useState(null); // { field, value }

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneChangeNumber, setPhoneChangeNumber] = useState("");
  const [phoneChangeCode, setPhoneChangeCode] = useState("");
  const [phoneChangePassword, setPhoneChangePassword] = useState("");
  const [phoneChangeErrors, setPhoneChangeErrors] = useState({});
  const [phoneChangeOtpSent, setPhoneChangeOtpSent] = useState(false);
  const [phoneChangeBusy, setPhoneChangeBusy] = useState(false);
  const [phoneChangeCooldown, setPhoneChangeCooldown] = useState(0);

  const formatPhoneNumber = (phone) => formatPhoneNumberDisplay(phone) || "";

  useEffect(() => {
    if (phoneChangeCooldown <= 0) return;
    const t = setTimeout(() => {
      setPhoneChangeCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(t);
  }, [phoneChangeCooldown]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isClinicEmployeeAccount) {
          setEmployeeLoading(true);
          const data = await getMyEmployeeProfile();
          setEmployeeProfile(data);
        } else {
          const data = await getUserProfile();
          setProfile({ ...data, profession: "Dentiste" });
        }
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Erreur lors du chargement du profil"));
      } finally {
        setEmployeeLoading(false);
      }
    };
    fetchProfile();
  }, [isClinicEmployeeAccount]);

  const formatEmployeeDate = (dateStr) => {
    if (!dateStr) return "—";
    const label = formatDateByPreference(dateStr);
    return label === "-" ? "—" : label;
  };

  const translateEmployeeStatus = (status) => {
    if (!status) return "—";
    switch (String(status).toUpperCase()) {
      case "ACTIVE":
        return "Actif";
      case "INACTIVE":
        return "Inactif";
      case "ON_LEAVE":
        return "En congé";
      default:
        return status;
    }
  };

  const renderEmployeeReadOnlyField = (label, value, key, actions = null) => (
    <div className="profile-field" key={key || label}>
      <div className="field-label">{label}:</div>
      <div className="field-value">{value || "—"}</div>
      {actions ? <div className="profile-field-actions">{actions}</div> : null}
    </div>
  );

  const handleEdit = (field) => {
    setEditingField(field);
    const value = profile[field] || "";
    setTempValue(field === "phoneNumber" ? formatPhoneNumber(value) : value);
  };

  const handleInputChange = (field, value) => {
    if (field === "phoneNumber") {
      const digits = value.replace(/\D/g, "");
      const formatted = digits.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
      setTempValue(formatted);
    } else {
      setTempValue(value);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setTempValue("");
  };

  const closeProfilePasswordModal = () => {
    if (profileUpdateBusy) return;
    setShowProfilePasswordModal(false);
    setProfileUpdatePassword("");
    setProfileUpdatePasswordError("");
    setPendingProfileUpdate(null);
  };

  const confirmProfileUpdate = async () => {
    if (!pendingProfileUpdate) return;
    if (profileUpdateBusy) return;

    const password = String(profileUpdatePassword || "").trim();
    if (!password) {
      setProfileUpdatePasswordError("Champ obligatoire.");
      return;
    }

    try {
      setProfileUpdateBusy(true);
      setProfileUpdatePasswordError("");

      const { field, value } = pendingProfileUpdate;
      await updateUserProfile({ [field]: value, password });

      setProfile((prev) => ({ ...prev, [field]: value }));
      setEditingField(null);
      setTempValue("");
      closeProfilePasswordModal();
      toast.success(`${fieldLabels[field]} mis à jour avec succès`);
    } catch (err) {
      const fieldErrors = getApiFieldErrors(err);
      setProfileUpdatePasswordError(fieldErrors?.password || getApiErrorMessage(err, "Mot de passe incorrect"));
    } finally {
      setProfileUpdateBusy(false);
    }
  };

  const handleSave = async (field) => {
    try {
      let valueToSave = tempValue;
      if (field === "phoneNumber") valueToSave = tempValue.replace(/\s/g, "");

      if (valueToSave === profile[field]) {
        setEditingField(null);
        return;
      }

      if (passwordProtectedFields.has(field)) {
        setPendingProfileUpdate({ field, value: valueToSave });
        setShowProfilePasswordModal(true);
        setProfileUpdatePassword("");
        setProfileUpdatePasswordError("");
        return;
      }

      await updateUserProfile({ [field]: valueToSave });
      setProfile((prev) => ({ ...prev, [field]: valueToSave }));
      setEditingField(null);
      toast.success(`${fieldLabels[field]} mis à jour avec succès`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour"));
    }
  };

  const resetPhoneModal = () => {
    setPhoneChangeNumber("");
    setPhoneChangeCode("");
    setPhoneChangePassword("");
    setPhoneChangeErrors({});
    setPhoneChangeOtpSent(false);
    setPhoneChangeBusy(false);
    setPhoneChangeCooldown(0);
  };

  const closePhoneModal = () => {
    setShowPhoneModal(false);
    resetPhoneModal();
  };

  const openPhoneModal = () => {
    setShowPhoneModal(true);
    resetPhoneModal();
  };

  const handleSendPhoneChangeOtp = async () => {
    const nextErrors = {};
    if (!String(phoneChangeNumber || "").trim()) nextErrors.phoneChangeNumber = "Champ obligatoire.";
    else if (!isValidPhoneNumber(phoneChangeNumber))
      nextErrors.phoneChangeNumber = "Téléphone invalide (ex: 05 51 51 51 51).";
    setPhoneChangeErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (phoneChangeBusy || phoneChangeCooldown > 0) return;

    try {
      setPhoneChangeBusy(true);
      await sendPhoneChangeOtp(normalizePhoneInput(phoneChangeNumber));
      setPhoneChangeOtpSent(true);
      setPhoneChangeCooldown(60);
      toast.success("Code SMS envoyé");
    } catch (err) {
      const retryAfter = Number(err?.response?.data?.retryAfterSeconds);
      if (err?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        setPhoneChangeCooldown(retryAfter);
        toast.info(getApiErrorMessage(err, "Veuillez patienter avant de renvoyer un code."));
      } else {
        toast.error(getApiErrorMessage(err, "Impossible d'envoyer le code SMS"));
      }
    } finally {
      setPhoneChangeBusy(false);
    }
  };

  const handleConfirmPhoneChangeOtp = async () => {
    if (!phoneChangeOtpSent) return;

    const nextErrors = {};
    if (!String(phoneChangeCode || "").trim()) nextErrors.phoneChangeCode = "Champ obligatoire.";
    if (!String(phoneChangePassword || "").trim()) nextErrors.phoneChangePassword = "Champ obligatoire.";
    setPhoneChangeErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (phoneChangeBusy) return;

    try {
      setPhoneChangeBusy(true);
      await confirmPhoneChangeOtp({
        phoneNumber: normalizePhoneInput(phoneChangeNumber),
        code: phoneChangeCode.trim(),
        password: phoneChangePassword.trim(),
      });
      const refreshed = await getCurrentUser();
      dispatch(setCredentials({ user: refreshed, token: true }));
      setProfile((prev) => ({ ...prev, phoneNumber: refreshed?.phoneNumber ?? prev.phoneNumber }));
      setEmployeeProfile((prev) => (prev ? { ...prev, phone: refreshed?.phoneNumber ?? prev.phone } : prev));
      toast.success("Numéro de téléphone mis à jour");
      closePhoneModal();
    } catch (err) {
      setPhoneChangeErrors((prev) => ({
        ...prev,
        phoneChangeCode: getApiErrorMessage(err, "Code SMS invalide"),
      }));
    } finally {
      setPhoneChangeBusy(false);
    }
  };

  const renderField = (field) => (
    <div className="profile-field" key={field}>
      <div className="field-label">
        {fieldIcons[field]}
        <span>{fieldLabels[field]}:</span>
      </div>

      {field === "profession" ? (
        <span className="field-value">{profile.profession}</span>
      ) : field === "phoneNumber" ? (
        <>
          <span className="field-value">{formatPhoneNumber(profile.phoneNumber) || "—"}</span>
          <button type="button" className="btn-primary2 profile-phone-btn" onClick={openPhoneModal}>
            Mettre à jour
          </button>
        </>
      ) : editingField === field ? (
        <>
          <input
            type="text"
            value={tempValue}
            onChange={(e) => handleInputChange(field, e.target.value)}
          />
          <div className="profile-field-actions">
            <button
              type="button"
              className="action-btn complete"
              onClick={() => handleSave(field)}
              title="Enregistrer"
              aria-label="Enregistrer"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              className="action-btn cancel"
              onClick={handleCancel}
              title="Annuler"
              aria-label="Annuler"
            >
              <X size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="field-value">
            {field === "phoneNumber" ? formatPhoneNumber(profile[field]) : profile[field] || "—"}
          </span>
          <button
            type="button"
            className="action-btn edit"
            onClick={() => handleEdit(field)}
            title="Mettre à jour"
            aria-label="Mettre à jour"
          >
            <Edit2 size={16} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="profile-container">
      <BackButton fallbackTo="/settings" />
      <PageHeader
        title="Profil"
        subtitle={isClinicEmployeeAccount ? "Consulter vos informations" : "Gérer vos informations personnelles"}
      />

      {isClinicEmployeeAccount ? (
        <>
          <div className="tab-buttons">
            <button
              className={employeeActiveTab === "profile" ? "tab-btn active" : "tab-btn"}
              onClick={() => setEmployeeActiveTab("profile")}
              type="button"
            >
              <User size={16} /> Profil
            </button>
            <button
              className={employeeActiveTab === "personal" ? "tab-btn active" : "tab-btn"}
              onClick={() => setEmployeeActiveTab("personal")}
              type="button"
            >
              <User size={16} /> Informations personnelles
            </button>
          </div>

          {employeeLoading ? (
            <div className="profile-content">
              <div className="profile-field">
                <div className="field-value">Chargement...</div>
              </div>
            </div>
          ) : (
            <>
              {employeeActiveTab === "profile" ? (
                <div className="profile-content">
                  {renderEmployeeReadOnlyField("Prénom", employeeProfile?.firstName)}
                  {renderEmployeeReadOnlyField("Nom", employeeProfile?.lastName)}
                  {renderEmployeeReadOnlyField(
                    "Téléphone",
                    employeeProfile?.phone ? formatPhoneNumber(employeeProfile.phone) : "—",
                    "employee-phone",
                    <button type="button" className="btn-primary2 profile-phone-btn" onClick={openPhoneModal}>
                      Mettre à jour
                    </button>
                  )}
                  {renderEmployeeReadOnlyField("Email", employeeProfile?.email)}
                  {renderEmployeeReadOnlyField("Type de contrat", employeeProfile?.contractType)}
                  {renderEmployeeReadOnlyField(
                    "Salaire",
                    employeeProfile?.salary != null ? formatMoneyWithLabel(employeeProfile.salary) : "—"
                  )}
                  {renderEmployeeReadOnlyField("Statut", translateEmployeeStatus(employeeProfile?.status))}
                </div>
              ) : null}

              {employeeActiveTab === "personal" ? (
                <div className="profile-content">
                  {renderEmployeeReadOnlyField("Genre", employeeProfile?.gender)}
                  {renderEmployeeReadOnlyField("Date de naissance", formatEmployeeDate(employeeProfile?.dateOfBirth))}
                  {renderEmployeeReadOnlyField("Numéro identité nationale", employeeProfile?.nationalId)}
                  {renderEmployeeReadOnlyField("Adresse", employeeProfile?.address)}
                  {renderEmployeeReadOnlyField("Date d'embauche", formatEmployeeDate(employeeProfile?.hireDate))}
                  {renderEmployeeReadOnlyField("Date de fin", formatEmployeeDate(employeeProfile?.endDate))}
                </div>
              ) : null}
            </>
          )}
        </>
      ) : (
        <div className="profile-content">{Object.keys(fieldLabels).map(renderField)}</div>
      )}

      {showPhoneModal ? (
        <div className="modal-overlay" onClick={closePhoneModal}>
          <div className="modal-content profile-phone-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mettre à jour le numéro</h3>
            <p className="profile-modal-subtitle">Entrez votre nouveau numéro puis recevez un code SMS.</p>

            <div className="profile-modal-field">
              <label>Nouveau numéro</label>
              <PhoneInput
                placeholder="Ex: 05 51 51 51 51"
                value={phoneChangeNumber}
                onChangeValue={(v) => {
                  setPhoneChangeNumber(v);
                  if (phoneChangeErrors.phoneChangeNumber) {
                    setPhoneChangeErrors((prev) => ({ ...prev, phoneChangeNumber: "" }));
                  }
                }}
                className={phoneChangeErrors.phoneChangeNumber ? "invalid" : ""}
                disabled={phoneChangeBusy}
              />
              <FieldError message={phoneChangeErrors.phoneChangeNumber} />
            </div>

            <div className="modal-actions profile-modal-actions-split">
              <button
                type="button"
                className="btn-primary2"
                onClick={handleSendPhoneChangeOtp}
                disabled={phoneChangeBusy || phoneChangeCooldown > 0}
              >
                {phoneChangeBusy
                  ? "Envoi..."
                  : phoneChangeCooldown > 0
                  ? `Renvoyer dans ${phoneChangeCooldown}s`
                  : phoneChangeOtpSent
                  ? "Renvoyer le code"
                  : "Envoyer le code"}
              </button>

              <button type="button" className="btn-cancel" onClick={closePhoneModal} disabled={phoneChangeBusy}>
                Annuler
              </button>
            </div>

            {phoneChangeOtpSent ? (
              <>
                <div className="profile-modal-field">
                  <label>Code SMS</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Entrez le code"
                    value={phoneChangeCode}
                    onChange={(e) => {
                      setPhoneChangeCode(e.target.value);
                      if (phoneChangeErrors.phoneChangeCode) {
                        setPhoneChangeErrors((prev) => ({ ...prev, phoneChangeCode: "" }));
                      }
                    }}
                    className={phoneChangeErrors.phoneChangeCode ? "invalid" : ""}
                    disabled={phoneChangeBusy}
                  />
                  <FieldError message={phoneChangeErrors.phoneChangeCode} />
                </div>

                <div className="profile-modal-field">
                  <label>Mot de passe</label>
                  <PasswordInput
                    placeholder="Entrez votre mot de passe"
                    value={phoneChangePassword}
                    onChange={(e) => {
                      setPhoneChangePassword(e.target.value);
                      if (phoneChangeErrors.phoneChangePassword) {
                        setPhoneChangeErrors((prev) => ({ ...prev, phoneChangePassword: "" }));
                      }
                    }}
                    autoComplete="current-password"
                    disabled={phoneChangeBusy}
                    inputClassName={phoneChangeErrors.phoneChangePassword ? "invalid" : ""}
                  />
                  <FieldError message={phoneChangeErrors.phoneChangePassword} />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-primary2" onClick={handleConfirmPhoneChangeOtp} disabled={phoneChangeBusy}>
                    {phoneChangeBusy ? "Vérification..." : "Vérifier et enregistrer"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isClinicEmployeeAccount && showProfilePasswordModal ? (
        <div className="modal-overlay" onClick={closeProfilePasswordModal}>
          <div className="modal-content profile-phone-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer avec votre mot de passe</h3>
            <p className="profile-modal-subtitle">Pour modifier ces informations, veuillez saisir votre mot de passe.</p>

            <div className="profile-modal-field">
              <label>Mot de passe</label>
              <PasswordInput
                placeholder="Entrez votre mot de passe"
                value={profileUpdatePassword}
                onChange={(e) => {
                  setProfileUpdatePassword(e.target.value);
                  if (profileUpdatePasswordError) setProfileUpdatePasswordError("");
                }}
                autoComplete="current-password"
                disabled={profileUpdateBusy}
                inputClassName={profileUpdatePasswordError ? "invalid" : ""}
              />
              <FieldError message={profileUpdatePasswordError} />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-primary2" onClick={confirmProfileUpdate} disabled={profileUpdateBusy}>
                {profileUpdateBusy ? "Vérification..." : "Confirmer"}
              </button>
              <button type="button" className="btn-cancel" onClick={closeProfilePasswordModal} disabled={profileUpdateBusy}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Profile;
