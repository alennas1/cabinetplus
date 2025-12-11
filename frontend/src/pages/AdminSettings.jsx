// AdminSettings.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Package } from "react-feather";
import PageHeader from "../components/PageHeader";
import "./Settings.css"; // same CSS as Settings.jsx

const AdminSettings = () => {
  const navigate = useNavigate();

  const settingsGroups = [
    {
      title: "Administration",
      options: [
        {
          title: "Gérer les administrateurs",
          desc: "Créer ou supprimer des modérateurs (ne peut pas supprimer les admins existants)",
          icon: <User />,
          path: "/admin/manage-admins",
        },
        {
          title: "Changer le mot de passe",
          desc: "Mettre à jour votre mot de passe actuel",
          icon: <Lock />,
          path: "/admin/change-password",
        },
        {
          title: "Gérer les plans",
          desc: "Créer, modifier ou supprimer les abonnements",
          icon: <Package />,
          path: "/admin/manage-plans",
        },
      ],
    },
  ];

  return (
    <div className="settings-container">
      <PageHeader
        title="Paramètres Admin"
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

export default AdminSettings;
