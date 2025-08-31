import React from "react";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import "./Dashboard.css"; // reuse same styling

const Patients = () => {
  const token = useSelector((state) => state.auth.token);

  let username = "";
  if (token) {
    const decoded = jwtDecode(token);
    username = decoded.sub; // username is stored in "sub"
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Patients 👩‍⚕️</h1>
        <p className="dashboard-welcome">
          Bonjour, <strong>{username}</strong> ! Voici la liste de vos patients.
        </p>
      </div>
    </div>
  );
};

export default Patients;
