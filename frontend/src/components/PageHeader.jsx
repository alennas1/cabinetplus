// src/components/PageHeader.jsx
import React from "react";
import "./PageHeader.css";

const PageHeader = ({ title, subtitle, align = "left" }) => {
  return (
    <div className="page-header">
      <h1 className={`page-title ${align}`}>{title}</h1>
      {subtitle && <p className={`page-subtitle ${align}`}>{subtitle}</p>}
    </div>
  );
};

export default PageHeader;
