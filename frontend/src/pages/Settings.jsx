import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { User, Lock, Activity, Settings as Gear, CreditCard, AlertTriangle } from "react-feather";
import "./Settings.css";
import PageHeader from "../components/PageHeader";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const clinicRole = getClinicRole(user);
  const isEmployee = clinicRole === CLINIC_ROLES.EMPLOYEE;

  const dentistSettingsGroups = [
    {
      title: "Compte",
      options: [
        {
          title: "Profil",
          desc: "Modifier votre nom et informations personnelles",
          icon: <User />,
          path: "/settings/profile",
        },
        {
          title: "Securite",
          desc: "Changer mot de passe et parametres de securite",
          icon: <Lock />,
          path: "/settings/security",
        },
        {
          title: "Plans et paiements",
          desc: "Consulter vos factures et l'etat de vos abonnements",
          icon: <CreditCard />,
          path: "/settings/payments",
        },
        {
          title: "Journal d'activite",
          desc: "Voir vos actions de securite et authentification",
          icon: <Activity />,
          path: "/settings/audit-logs",
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
          path: "/settings/preferences",
        },
        {
          title: "Gestion patients",
          desc: "Définir des seuils d'alerte (annulations, montant dû)",
          icon: <AlertTriangle />,
          path: "/settings/patient-management",
        },
      ],
    },
  ];

  const employeeSettingsGroups = [
    {
      title: "Compte",
      options: [
        {
          title: "Profil",
          desc: "Modifier votre nom et informations personnelles",
          icon: <User />,
          path: "/settings/profile",
        },
        {
          title: "Securite",
          desc: "Changer mot de passe et code PIN",
          icon: <Lock />,
          path: "/settings/security",
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
          path: "/settings/preferences",
        },
      ],
    },
  ];

  const settingsGroups = isEmployee ? employeeSettingsGroups : dentistSettingsGroups;

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

export default Settings;
