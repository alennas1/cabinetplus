import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Bell, Settings as Gear, Activity, FileText } from "react-feather";
import "./Settings.css";
import PageHeader from "../components/PageHeader";

const Settings = () => {
  const navigate = useNavigate();

  const settingsOptions = [
    { title: "Profil", desc: "Modifier votre nom, email et informations personnelles", icon: <User />, path: "/settings/profile" },
    { title: "Sécurité", desc: "Changer mot de passe et paramètres de sécurité", icon: <Lock />, path: "/settings/security" },
    { title: "Notifications", desc: "Gérer les alertes et notifications", icon: <Bell />, path: "/settings/notifications" },
    { title: "Préférences", desc: "Personnaliser l'application selon vos besoins", icon: <Gear />, path: "/settings/preferences" },
    { title: "Médicaments", desc: "Gérer la liste des médicaments disponibles", icon: <Activity />, path: "/settings/medications" },
    { title: "Catalogue de traitements", desc: "Ajouter, modifier ou supprimer les traitements proposés", icon: <FileText />, path: "/settings/treatments" },
  ];

  return (
    <div className="settings-container">
      <PageHeader 
        title="Paramètres" 
        subtitle="Choisissez ce que vous souhaitez gérer :" 
        align="left" 
      />

      <div className="settings-options">
        {settingsOptions.map((option, index) => (
          <div 
            key={index} 
            className="settings-card"
            onClick={() => navigate(option.path)}
          >
            <div className="settings-icon">{option.icon}</div>
            <div className="settings-text">
              <h2>{option.title}</h2>
              <p>{option.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;
