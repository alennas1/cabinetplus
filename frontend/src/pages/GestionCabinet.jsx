import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  BarChart2, 
  Package, 
  CreditCard, 
  Layers,
  Briefcase // Nouvelle icône pour les laboratoires
} from "react-feather";
import "./Settings.css";
import PageHeader from "../components/PageHeader";

const GestionCabinet = () => {
  const navigate = useNavigate();

  const adminGroups = [
    {
      title: "Ressources & Partenaires",
      options: [
        { 
          title: "Employés", 
          desc: "Gérer le personnel, les rôles et les accès", 
          icon: <Users />, 
          path: "/gestion-cabinet/employees" 
        },
        { 
          title: "Laboratoires", 
          desc: "Gérer la liste des prothésistes et laboratoires partenaires", 
          icon: <Briefcase />, 
          path: "/gestion-cabinet/laboratories" 
        },
        { 
          title: "Prothèses", 
          desc: "Suivi des travaux de laboratoire et commandes", 
          icon: <Layers />, 
          path: "/gestion-cabinet/prosthetics-tracking" 
        },
      ],
    },
    {
      title: "Finance & Logistique",
      options: [
        { 
          title: "Finances", 
          desc: "Consulter les rapports de revenus et bilans", 
          icon: <BarChart2 />, 
          path: "/gestion-cabinet/finance" 
        },
        { 
          title: "Dépenses", 
          desc: "Suivi des charges fixes et achats du cabinet", 
          icon: <CreditCard />, 
          path: "/gestion-cabinet/expenses" 
        },
        { 
          title: "Inventaire", 
          desc: "Gérer le stock de matériel et fournitures", 
          icon: <Package />, 
          path: "/gestion-cabinet/inventory" 
        },
      ],
    },
  ];

  return (
    <div className="settings-container">
      <PageHeader 
        title="Gestion Cabinet" 
        subtitle="Administrez les ressources et le suivi de votre établissement :" 
        align="left" 
      />

      {adminGroups.map((group, i) => (
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
                onKeyDown={(e) => e.key === 'Enter' && navigate(option.path)}
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

export default GestionCabinet;