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
      title: "Catalogues",
      options: [
        {
          title: "Catalogue des medicaments",
          desc: "Gerer la liste des medicaments disponibles",
          icon: <Box />,
          path: "/catalogue/medications",
        },
        {
          title: "Catalogue des traitements",
          desc: "Ajouter, modifier ou supprimer les traitements proposes",
          icon: <Clipboard />,
          path: "/catalogue/treatments",
        },
        {
          title: "Catalogue des articles",
          desc: "Ajouter, modifier ou supprimer les articles disponibles",
          icon: <Package />,
          path: "/catalogue/items",
        },
        {
          title: "Catalogue des justifications",
          desc: "Gerer les modeles de documents et certificats",
          icon: <FileText />,
          path: "/catalogue/justifications",
        },
        {
          title: "Catalogue des protheses",
          desc: "Definir les types de protheses (Couronnes, Bridges, etc.)",
          icon: <Layers />,
          path: "/catalogue/prosthetics",
        },
        {
          title: "Materiaux et composants",
          desc: "Gerer les materiaux utilises (Zircone, Ceramique, Resine)",
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
        subtitle="Choisissez le catalogue a gerer :"
        align="left"
      />

      {catalogueGroups.map((group, i) => (
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

export default Catalogue;
