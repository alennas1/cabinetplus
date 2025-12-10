// src/pages/WaitingPage.jsx
import React from "react";
import { Clock } from "react-feather";

const WaitingPage = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Clock size={48} color="#007bff" />
        <h1>En attente de validation</h1>
        <p>Veuillez patienter pendant que l’administrateur confirme votre paiement.</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100%",
    backgroundColor: "#f0f0f0",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    textAlign: "center",
    padding: "2rem",
    borderRadius: "12px",
    backgroundColor: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
};

export default WaitingPage;
