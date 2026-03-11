import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Clipboard,
  Package,
  FileText,
  Layers,
  Tool,
} from "react-feather";
import "./Settings.css";
import PageHeader from "../components/PageHeader";

const Catalogue = () => {
  const navigate = useNavigate();

  const catalogueGroups = [
    {
      title: "",
      options: [
        {
          title: "Médicaments",
          desc: "Gérer la liste des médicaments disponibles",
          icon: <Box />,
          path: "/catalogue/medications",
        },
        {
          title: "Traitements",
          desc: "Ajouter, modifier ou supprimer les traitements proposés",
          icon: <Clipboard />,
          path: "/catalogue/treatments",
        },
        {
          title: "Articles",
          desc: "Ajouter, modifier ou supprimer les articles disponibles",
          icon: <Package />,
          path: "/catalogue/items",
        },
        {
          title: "Justifications",
          desc: "Gérer les modèles de documents et certificats",
          icon: <FileText />,
          path: "/catalogue/justifications",
        },
        {
          title: "Prothèses",
          desc: "Définir les types de prothèses (Couronnes, Bridges, etc.)",
          icon: <Layers />,
          path: "/catalogue/prosthetics",
        },
        {
          title: "Matériaux et composants",
          desc: "Gérer les matériaux utilisés (Zircone, Céramique, Résine)",
          icon: <Tool />,
          path: "/catalogue/materials",
        },
      ],
    },
  ];

  return (
    <div className="settings-container">
      <PageHeader
        title="Catalogues"
        subtitle="Choisissez le catalogue à gérer :"
        align="left"
      />

      {catalogueGroups.map((group, i) => (
        <div key={i} className="settings-group">
          {group.title ? <h3 className="group-title">{group.title}</h3> : null}
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

export default Catalogue;
