import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { updatePassword, verifyPassword } from "../services/securityService";
import {
  changeGestionCabinetPin,
  disableGestionCabinetPin,
  enableGestionCabinetPin,
  getGestionCabinetPinStatus,
} from "../services/pinGuardService";
import PinCodeInput from "../components/PinCodeInput";
import "./Security.css";

const Security = () => {
  const { user } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.username;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [gcPinEnabled, setGcPinEnabled] = useState(false);
  const [gcPassword, setGcPassword] = useState("");
  const [gcNewPin, setGcNewPin] = useState("");
  const [gcConfirmPin, setGcConfirmPin] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const status = await getGestionCabinetPinStatus();
        if (!cancelled) setGcPinEnabled(!!status?.enabled);
      } catch {
        if (!cancelled) setGcPinEnabled(false);
      }
    };
    if (userKey) run();
    else setGcPinEnabled(false);
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    try {
      await updatePassword({ oldPassword, newPassword });
      toast.success("Mot de passe mis à jour avec succès");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Erreur lors de la mise à jour du mot de passe"
      );
    }
  };

  const validateNewPin = () => {
    const trimmed = gcNewPin.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      toast.error("Le PIN doit contenir exactement 4 chiffres");
      return null;
    }
    if (trimmed !== gcConfirmPin.trim()) {
      toast.error("Les codes PIN ne correspondent pas");
      return null;
    }
    return trimmed;
  };

  const resetPinFields = () => {
    setGcPassword("");
    setGcNewPin("");
    setGcConfirmPin("");
  };

  const handleEnableGestionCabinetPin = async () => {
    if (!userKey) return;
    const trimmed = validateNewPin();
    if (!trimmed) return;

    try {
      await enableGestionCabinetPin(trimmed);
      setGcPinEnabled(true);
      resetPinFields();
      toast.success("Sécurisation activée");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Impossible d'activer la sécurisation");
    }
  };

  const handleChangeGestionCabinetPin = async () => {
    if (!userKey) return;
    const trimmed = validateNewPin();
    if (!trimmed) return;
    if (!gcPassword.trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }

    try {
      await verifyPassword({ password: gcPassword });
      await changeGestionCabinetPin(trimmed, gcPassword);
      resetPinFields();
      toast.success("PIN mis à jour");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Impossible de modifier le PIN");
    }
  };

  const handleDisableGestionCabinetPin = async () => {
    if (!userKey) return;
    if (!gcPassword.trim()) {
      toast.error("Entrez votre mot de passe pour désactiver");
      return;
    }

    try {
      await verifyPassword({ password: gcPassword });
      await disableGestionCabinetPin(gcPassword);
      setGcPinEnabled(false);
      resetPinFields();
      toast.success("Sécurisation désactivée");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Impossible de désactiver la sécurisation");
    }
  };

  return (
    <div className="settings-container">
      <PageHeader title="Sécurité" subtitle="Changer le mot de passe" />
      <div className="security-content">
        <div className="security-field">
          <label>Ancien mot de passe</label>
          <input
            type="password"
            placeholder="Entrez votre ancien mot de passe"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="security-field">
          <label>Nouveau mot de passe</label>
          <input
            type="password"
            placeholder="Entrez le nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="security-field">
          <label>Confirmer le mot de passe</label>
          <input
            type="password"
            placeholder="Confirmez le nouveau mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button className="security-btn" onClick={handlePasswordChange}>
          Mettre à jour le mot de passe
        </button>

        <div style={{ marginTop: "10px" }}>
          <PageHeader title="Code PIN" subtitle="Sécuriser l'accès à Gestion cabinet" />
        </div>

        {gcPinEnabled ? (
          <>
            <div className="security-field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="Entrez votre mot de passe"
                value={gcPassword}
                onChange={(e) => setGcPassword(e.target.value)}
              />
            </div>

            <div className="security-field">
              <label>Nouveau PIN</label>
              <PinCodeInput value={gcNewPin} onChange={setGcNewPin} />
            </div>

            <div className="security-field">
              <label>Confirmer le nouveau PIN</label>
              <PinCodeInput value={gcConfirmPin} onChange={setGcConfirmPin} />
            </div>

            <button className="security-btn" onClick={handleChangeGestionCabinetPin}>
              Mettre à jour le PIN
            </button>

            <button className="security-btn" style={{ background: "#ef4444" }} onClick={handleDisableGestionCabinetPin}>
              Désactiver la sécurisation
            </button>
          </>
        ) : (
          <>
            <div className="security-field">
              <label>Nouveau PIN</label>
              <PinCodeInput value={gcNewPin} onChange={setGcNewPin} autoFocus />
            </div>

            <div className="security-field">
              <label>Confirmer le PIN</label>
              <PinCodeInput value={gcConfirmPin} onChange={setGcConfirmPin} />
            </div>

            <button className="security-btn" onClick={handleEnableGestionCabinetPin}>
              Activer la sécurisation
            </button>
          </>
        )}
      </div>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
};

export default Security;
