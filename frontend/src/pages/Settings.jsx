import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Package, Settings as Gear, FileText, Box, CreditCard } from "react-feather";
import "./Settings.css";
import PageHeader from "../components/PageHeader";

const Settings = () => {
  const navigate = useNavigate();

  const settingsGroups = [
    {
      title: "Compte",
      options: [
        { 
          title: "Profil", 
          desc: "Modifier votre nom et informations personnelles", // Removed 'email'
          icon: <User />, 
          path: "/settings/profile" 
        },
        { 
          title: "Sécurité", 
          desc: "Changer mot de passe et paramètres de sécurité", 
          icon: <Lock />, 
          path: "/settings/security" 
        },
        { 
          title: "Historique de paiements", 
          desc: "Consulter vos factures et l'état de vos abonnements", 
          icon: <CreditCard />, 
          path: "/settings/payments"
        },
      ],
    },
    {
      title: "Catalogues",
      options: [
        { title: "Catalogue des médicaments", desc: "Gérer la liste des médicaments disponibles", icon: <Box />, path: "/settings/medications" },
        { title: "Catalogue des traitements", desc: "Ajouter, modifier ou supprimer les traitements proposés", icon: <FileText />, path: "/settings/treatments" },
        { title: "Catalogue des articles", desc: "Ajouter, modifier ou supprimer les articles disponibles", icon: <Package />, path: "/settings/items" },
      ],
    },
    {
      title: "Préférences",
      options: [
        { title: "Préférences", desc: "Personnaliser l'application selon vos besoins", icon: <Gear />, path: "/settings/preferences" },
      ],
    },
  ];

  return (
    <div className="settings-container">
      <PageHeader 
        title="Paramètres" 
        subtitle="Choisissez ce que vous souhaitez gérer :" 
        align="left" 
      />

      {settingsGroups.map((group, i) => (
        <div key={i} className="settings-group">
          <h3 className="group-title">{group.title}</h3>
          <div className="settings-options">
            {group.options.map((option, index) => (
              <div 
                key={index} 
                className="settings-card"
                role="button"
                tabIndex={0}
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
      ))}
    </div>
  );
};

export default Settings;