import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Users,
  BarChart2,
  Package,
  CreditCard,
  Briefcase,
  BookOpen,
} from "react-feather";
import "./Settings.css";
import PageHeader from "../components/PageHeader";
import { PERMISSIONS, isClinicEmployeeAccount, userHasPermission } from "../utils/permissions";

const GestionCabinet = ({ section = null }) => {
  const navigate = useNavigate();
  const user = useSelector((state) => state?.auth?.user);
  const isEmployee = isClinicEmployeeAccount(user);
  const onlyGroupTitle =
    section === "finance_logistique"
      ? "Finance & Logistique"
      : section === "ressources_partenaires"
        ? "Ressources & Partenaires"
        : null;

  const adminGroups = useMemo(() => {
    const canManageCabinet = userHasPermission(user, PERMISSIONS.GESTION_CABINET);
    const canAccessLaboratories = userHasPermission(user, PERMISSIONS.LABORATORIES);
    const canAccessFournisseurs = userHasPermission(user, PERMISSIONS.FOURNISSEURS);
    const canAccessExpenses = userHasPermission(user, PERMISSIONS.EXPENSES);
    const canAccessInventory = userHasPermission(user, PERMISSIONS.INVENTORY);
    const canAccessCatalogues = userHasPermission(user, PERMISSIONS.CATALOGUE);

    const groups = [
      {
        title: "Ressources & Partenaires",
        options: [
          !isEmployee && canManageCabinet
            ? {
                title: "Employés",
                desc: "Gérer le personnel, les rôles et les accès",
                icon: <Users />,
                path: "/gestion-cabinet/employees",
              }
            : null,
          canAccessLaboratories
            ? {
                title: "Laboratoires",
                desc: "Gérer la liste des prothésistes et laboratoires partenaires",
                icon: <Briefcase />,
                path: "/gestion-cabinet/laboratories",
              }
            : null,
          canAccessFournisseurs
            ? {
                title: "Fournisseurs",
                desc: "Gérer la liste des fournisseurs pour les achats et l'inventaire",
                icon: <Briefcase />,
                path: "/gestion-cabinet/fournisseurs",
              }
            : null,
        ].filter(Boolean),
      },
      {
        title: "Catalogues & Tarifs",
        options: [
          canAccessCatalogues
            ? {
                title: "Catalogues & Tarifs",
                desc: "Gérer les catalogues et les prix (actes, matériaux, articles...)",
                icon: <BookOpen />,
                path: "/gestion-cabinet/catalogue",
              }
            : null,
        ].filter(Boolean),
      },
      {
        title: "Finance & Logistique",
        options: [
          !isEmployee && canManageCabinet
            ? {
                title: "Finances",
                desc: "Consulter les rapports de revenus et bilans",
                icon: <BarChart2 />,
                path: "/gestion-cabinet/finance",
              }
            : null,
          canAccessExpenses
            ? {
                title: "Dépenses",
                desc: "Suivi des charges fixes et achats du cabinet",
                icon: <CreditCard />,
                path: "/gestion-cabinet/expenses",
              }
            : null,
          canAccessInventory
            ? {
                title: "Inventaire",
                desc: "Gérer le stock de matériel et fournitures",
                icon: <Package />,
                path: "/gestion-cabinet/inventory",
              }
            : null,
        ].filter(Boolean),
      },
    ];

    return groups.filter((g) => (g?.options?.length ?? 0) > 0);
  }, [isEmployee, user]);

  const visibleGroups = useMemo(() => {
    if (!onlyGroupTitle) return adminGroups;
    return adminGroups.filter((g) => g.title === onlyGroupTitle);
  }, [adminGroups, onlyGroupTitle]);

  return (
    <div className="settings-container">
      <PageHeader
        title={onlyGroupTitle || "Gestion Cabinet"}
        subtitle={
          onlyGroupTitle
            ? "Choisissez une rubrique"
            : "Administrez les ressources et le suivi de votre établissement"
        }
        align="left"
      />

      {visibleGroups.map((group, i) => (
        <div key={i} className="settings-group">
          {!onlyGroupTitle && <h3 className="group-title">{group.title}</h3>}
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

export default GestionCabinet;
