import React from "react";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import "./Dashboard.css"; // reuse same styling

const Appointments = () => {
  const token = useSelector((state) => state.auth.token);

  let username = "";
  if (token) {
    const decoded = jwtDecode(token);
    username = decoded.sub;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Appointments 📅</h1>
        <p className="dashboard-welcome">
          Hello, <strong>{username}</strong> ! Here are your upcoming appointments.
        </p>
      </div>
    </div>
  );
};

export default Appointments;
