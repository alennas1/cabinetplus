import React, { useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { updatePassword } from "../services/securityService";
import "./Security.css";

const Security = () => {
  const token = useSelector((state) => state.auth.token);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      await updatePassword({ oldPassword, newPassword }, token);
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
