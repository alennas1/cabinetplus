import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Edit2, Check, X, User, Phone, Home } from "react-feather"; // Removed Mail icon
import PageHeader from "../components/PageHeader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUserProfile, updateUserProfile } from "../services/userService";
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
  const token = useSelector((state) => state.auth.token);
  const [profile, setProfile] = useState({ profession: "Dentiste" });
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    return phone.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile(token);
        setProfile({ ...data, profession: "Dentiste" });
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors du chargement du profil");
      }
    };
    fetchProfile();
  }, [token]);

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

  const handleSave = async (field) => {
    try {
      let valueToSave = tempValue;
      if (field === "phoneNumber") valueToSave = tempValue.replace(/\s/g, "");

      if (valueToSave === profile[field]) {
        setEditingField(null);
        return;
      }

      const updatedProfile = { ...profile, [field]: valueToSave };
      await updateUserProfile(updatedProfile, token);
      setProfile(updatedProfile);
      setEditingField(null);
      toast.success(`${fieldLabels[field]} mis à jour avec succès`);
    } catch (err) {
      toast.error(`Erreur lors de la mise à jour`);
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
      <PageHeader title="Profil" subtitle="Gérer vos informations personnelles" />
      <div className="profile-content">
        {Object.keys(fieldLabels).map(renderField)}
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Profile;