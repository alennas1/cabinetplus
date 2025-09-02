import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Edit2, Check, X } from "react-feather";
import PageHeader from "../components/PageHeader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUserProfile, updateUserProfile } from "../services/userService";
import "./Profile.css";

const fieldLabels = {
  firstname: "Prénom",
  lastname: "Nom",
  email: "Email",
  phoneNumber: "Téléphone"
};

const Profile = () => {
  const token = useSelector((state) => state.auth.token);
  const [profile, setProfile] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const formatPhoneNumber = (number) => {
    if (!number) return "—";
    const digits = number.replace(/\D/g, "");
    return digits.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile(token);
        setProfile(data);
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
  // format only phoneNumber for input display
  setTempValue(field === "phoneNumber" ? formatPhoneNumber(value) : value);
};

// while typing, remove non-digits and format
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
    if (field === "phoneNumber") {
      valueToSave = tempValue.replace(/\s/g, ""); // save raw digits
    }
    const updatedProfile = { ...profile, [field]: valueToSave };
    await updateUserProfile(updatedProfile, token);
    setProfile(updatedProfile);
    setEditingField(null);
    toast.success(`${fieldLabels[field]} mis à jour avec succès`);
  } catch (err) {
    console.error(err);
    toast.error(`Erreur lors de la mise à jour de ${fieldLabels[field]}`);
  }
};


  const renderField = (field) => (
    <div className="profile-field" key={field}>
      <span className="field-label">{fieldLabels[field]}:</span>
      {editingField === field ? (
        <>
         <input
  type="text"
  value={tempValue}
  onChange={(e) => handleInputChange(field, e.target.value)}
/>

          <Check size={18} className="icon action" onClick={() => handleSave(field)} />
          <X size={18} className="icon action" onClick={handleCancel} />
        </>
      ) : (
        <>
          <span className="field-value">
            {field === "phoneNumber" ? formatPhoneNumber(profile[field]) : profile[field] || "—"}
          </span>
          <Edit2 size={18} className="icon action" onClick={() => handleEdit(field)} />
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

export default Profile;
