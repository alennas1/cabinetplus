import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Settings as Gear, User } from "react-feather";

import PageHeader from "../components/PageHeader";

import "./Settings.css";

const LabSettingsHome = () => {
  const navigate = useNavigate();

  const settingsGroups = [
    {
      title: "Compte",
      options: [
        {
          title: "Profil",
          desc: "Modifier les informations du laboratoire",
          icon: <User />,
          path: "/lab/settings/profile",
        },
        {
          title: "Securite",
          desc: "Changer mot de passe et sessions",
          icon: <Lock />,
          path: "/lab/settings/security",
        },
      ],
    },
    {
      title: "Preferences",
      options: [
        {
          title: "Preferences",
          desc: "Personnaliser l'application selon vos besoins",
          icon: <Gear />,
          path: "/lab/settings/preferences",
        },
      ],
    },
  ];

  return (
    <div className="settings-container">
      <PageHeader title="Parametres" subtitle="Choisissez ce que vous souhaitez gerer :" align="left" />

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
                onKeyDown={(e) => e.key === "Enter" && navigate(option.path)}
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

export default LabSettingsHome;
