import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Edit2, Check, X, User, Phone, Home } from "react-feather"; // Removed Mail icon
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { formatPhoneNumber as formatPhoneNumberDisplay } from "../utils/phone";
import { getApiErrorMessage } from "../utils/error";
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
  const [profile, setProfile] = useState({ profession: "Dentiste" });
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const formatPhoneNumber = (phone) => formatPhoneNumberDisplay(phone) || "";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile({ ...data, profession: "Dentiste" });
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Erreur lors du chargement du profil"));
      }
    };
    fetchProfile();
  }, []);

  const handleEdit = (field) => {
    if (field === "phoneNumber") {
      toast.info("Le numero de telephone se modifie depuis la page Securite.");
      return;
    }
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

  const handleSave = async (field) => {
    try {
      let valueToSave = tempValue;
      if (field === "phoneNumber") valueToSave = tempValue.replace(/\s/g, "");

      if (valueToSave === profile[field]) {
        setEditingField(null);
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

  const renderField = (field) => (
    <div className="profile-field" key={field}>
      <div className="field-label">
        {fieldIcons[field]}
        <span>{fieldLabels[field]}:</span>
      </div>

      {field === "profession" ? (
        <span className="field-value">{profile.profession}</span>
      ) : field === "phoneNumber" ? (
        <span className="field-value">{formatPhoneNumber(profile.phoneNumber) || "—"}</span>
      ) : editingField === field ? (
        <>
          <input
            type="text"
            value={tempValue}
            onChange={(e) => handleInputChange(field, e.target.value)}
          />
          <Check size={18} className="icon action confirm" onClick={() => handleSave(field)} />
          <X size={18} className="icon action cancel" onClick={handleCancel} />
        </>
      ) : (
        <>
          <span className="field-value">
            {field === "phoneNumber" ? formatPhoneNumber(profile[field]) : profile[field] || "—"}
          </span>
          <Edit2 size={18} className="icon action edit" onClick={() => handleEdit(field)} />
        </>
      )}
    </div>
  );

  return (
    <div className="profile-container">
      <BackButton fallbackTo="/settings" />
      <PageHeader title="Profil" subtitle="Gérer vos informations personnelles" />
      <div className="profile-content">
        {Object.keys(fieldLabels).map(renderField)}
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Profile;
