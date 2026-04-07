import React, { useEffect, useState } from "react";
import { Check, Edit2, Hash, Home, Phone, User, X } from "react-feather";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";

import BackButton from "../components/BackButton";
import FieldError from "../components/FieldError";
import PageHeader from "../components/PageHeader";
import PhoneInput from "../components/PhoneInput";
import PasswordInput from "../components/PasswordInput";

import { getLabMe, updateLabMe } from "../services/labPortalService";
import { getCurrentUser } from "../services/authService";
import { confirmPhoneChangeOtp, sendPhoneChangeOtp } from "../services/securityService";
import { setCredentials } from "../store/authSlice";
import { getApiErrorMessage, getApiFieldErrors } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";

import "./Profile.css";

const fieldLabels = {
  inviteCode: "ID d'invitation",
  name: "Laboratoire",
  contactPerson: "Contact",
  phoneNumber: "Téléphone",
  address: "Adresse",
};

const fieldIcons = {
  inviteCode: <Hash size={16} />,
  name: <Home size={16} />,
  contactPerson: <User size={16} />,
  phoneNumber: <Phone size={16} />,
  address: <Home size={16} />,
};

const editableFields = new Set(["name", "contactPerson", "address"]);

const LabSettings = () => {
  const dispatch = useDispatch();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
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

  useEffect(() => {
    if (phoneChangeCooldown <= 0) return;
    const t = setTimeout(() => {
      setPhoneChangeCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(t);
  }, [phoneChangeCooldown]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getLabMe();
      setLab(data || null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement du profil"));
      setLab(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    else if (!isValidPhoneNumber(phoneChangeNumber)) nextErrors.phoneChangeNumber = "Téléphone invalide.";
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

      try {
        const refreshed = await getCurrentUser();
        dispatch(setCredentials({ user: refreshed, token: true }));
      } catch {
        // ignore
      }

      toast.success("Numéro de téléphone mis à jour");
      await load();
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

  const handleEdit = (field) => {
    if (!editableFields.has(field)) return;
    setEditingField(field);
    setTempValue(lab?.[field] || "");
  };

  const handleCancel = () => {
    setEditingField(null);
    setTempValue("");
  };

  const closePasswordModal = () => {
    if (profileUpdateBusy) return;
    setShowPasswordModal(false);
    setProfileUpdatePassword("");
    setProfileUpdatePasswordError("");
    setPendingProfileUpdate(null);
  };

  const handleSave = async (field) => {
    if (!editableFields.has(field)) return;
    const valueToSave = String(tempValue ?? "");
    if (valueToSave === String(lab?.[field] ?? "")) {
      setEditingField(null);
      setTempValue("");
      return;
    }

    setPendingProfileUpdate({ field, value: valueToSave });
    setShowPasswordModal(true);
    setProfileUpdatePassword("");
    setProfileUpdatePasswordError("");
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
      const payload = { password };
      if (field === "name") payload.name = value;
      if (field === "contactPerson") payload.contactPerson = value;
      if (field === "address") payload.address = value;

      const updated = await updateLabMe(payload);
      setLab(updated || null);
      setEditingField(null);
      setTempValue("");
      closePasswordModal();
      toast.success(`${fieldLabels[field]} mis à jour avec succès`);
    } catch (err) {
      const fieldErrors = getApiFieldErrors(err);
      setProfileUpdatePasswordError(fieldErrors?.password || getApiErrorMessage(err, "Mot de passe incorrect"));
    } finally {
      setProfileUpdateBusy(false);
    }
  };

  const renderField = (field) => {
    const label = fieldLabels[field] || field;
    const icon = fieldIcons[field] || null;

    const isEditing = editingField === field;
    const isEditable = editableFields.has(field);

    const value = lab?.[field];

    return (
      <div className="profile-field" key={field}>
        <div className="field-label">
          {icon} {label}:
        </div>

        {field === "inviteCode" ? (
          <>
            <div className="field-value">{value || "—"}</div>
            {value ? (
              <button
                type="button"
                className="btn-primary2 profile-phone-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(String(value));
                    toast.success("ID copié");
                  } catch {
                    toast.info(String(value));
                  }
                }}
              >
                Copier
              </button>
            ) : null}
          </>
        ) : field === "phoneNumber" ? (
          <>
            <div className="field-value">{formatPhoneNumber(value) || "—"}</div>
            <button type="button" className="btn-primary2 profile-phone-btn" onClick={openPhoneModal}>
              Mettre à jour
            </button>
          </>
        ) : isEditing ? (
          <input value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus />
        ) : (
          <div className="field-value">{value || "—"}</div>
        )}

        <div className="profile-field-actions">
          {isEditable ? (
            isEditing ? (
              <>
                <button type="button" className="action-btn complete" onClick={() => handleSave(field)} disabled={profileUpdateBusy}>
                  <Check size={16} />
                </button>
                <button type="button" className="action-btn cancel" onClick={handleCancel} disabled={profileUpdateBusy}>
                  <X size={16} />
                </button>
              </>
            ) : (
              <button type="button" className="action-btn edit" onClick={() => handleEdit(field)} disabled={loading}>
                <Edit2 size={16} />
              </button>
            )
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="profile-container">
      <BackButton fallbackTo="/lab/settings" />
      <PageHeader title="Profil" subtitle="Modifier les informations de votre laboratoire." align="left" />

      <div className="profile-content">
        {loading ? <div style={{ padding: "16px", color: "#6b7280" }}>Chargement...</div> : null}

        {renderField("inviteCode")}
        {renderField("name")}
        {renderField("contactPerson")}
        {renderField("phoneNumber")}
        {renderField("address")}
      </div>

      {showPasswordModal ? (
        <div className="modal-overlay" onClick={closePasswordModal}>
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
              <button type="button" className="btn-cancel" onClick={closePasswordModal} disabled={profileUpdateBusy}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                  <button
                    type="button"
                    className="btn-primary2"
                    onClick={handleConfirmPhoneChangeOtp}
                    disabled={phoneChangeBusy}
                  >
                    {phoneChangeBusy ? "Vérification..." : "Vérifier et enregistrer"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LabSettings;
