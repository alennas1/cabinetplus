// components/LoadingLogo.jsx
import React from "react";
import logo from "../assets/logo.svg";

const LoadingLogo = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f2f4f8",
        transition: "opacity 0.3s",
      }}
    >
      <img src={logo} alt="CabinetPlus Logo" style={{ width: "72px", height: "auto" }} />
    </div>
  );
};

export default LoadingLogo;
