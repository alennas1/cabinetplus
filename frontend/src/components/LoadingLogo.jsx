// components/LoadingLogo.jsx
import React, { useEffect, useState } from "react";
import logo from "../assets/logo.svg";

const LoadingLogo = ({ minDisplayMs = 500 }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), minDisplayMs);
    return () => clearTimeout(timer);
  }, [minDisplayMs]);

  if (!show) return null; // hide logo after minDisplayMs

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#fff",
        transition: "opacity 0.3s",
      }}
    >
      <img src={logo} alt="CabinetPlus Logo" style={{ width: "150px", height: "auto" }} />
    </div>
  );
};

export default LoadingLogo;