import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, PieChart, Users } from "react-feather";
import PageHeader from "../components/PageHeader";
import "./Settings.css";

const AdminDentistsHub = () => {
  const navigate = useNavigate();

  const options = [
    {
      title: "Liste des dentistes",
      desc: "Accéder à la liste complète des dentistes",
      icon: <Users />,
      path: "/dentists",
    },
    {
      title: "Paiements en attente",
      desc: "Voir les paiements en attente de validation",
      icon: <Clock />,
      path: "/pending-payments",
    },
    {
      title: "Plans expirants",
      desc: "Consulter les abonnements qui arrivent à échéance",
      icon: <PieChart />,
      path: "/expiring-plans",
    },
  ];

  return (
    <div className="settings-container">
      <PageHeader title="Dentistes" subtitle="Choisissez une rubrique" align="left" />

      <div className="settings-group">
        <div className="settings-options">
          {options.map((option, index) => (
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
    </div>
  );
};

export default AdminDentistsHub;
