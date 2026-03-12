import React from "react";
import logo from "../assets/logo.svg";

const OfflineScreen = () => {
  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <img src={logo} alt="CabinetPlus" style={styles.logo} />
        <h1 style={styles.title}>Vous êtes hors ligne</h1>
        <p style={styles.subtitle}>
          La connexion est indisponible. Cette page se rechargera automatiquement dès que
          l’internet sera de retour.
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f5f7fb",
    color: "#0f172a",
    padding: "24px",
  },
  content: {
    width: "min(520px, 92vw)",
    textAlign: "center",
  },
  logo: {
    width: "72px",
    height: "auto",
    display: "block",
    margin: "0 auto 18px",
  },
  title: {
    fontSize: "22px",
    margin: "0 0 8px",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.5,
  },
};

export default OfflineScreen;
