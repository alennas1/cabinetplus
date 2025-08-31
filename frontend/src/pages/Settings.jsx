import React from "react";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import "./Dashboard.css"; // reuse same styling

const Settings = () => {
  const token = useSelector((state) => state.auth.token);

  let username = "";
  if (token) {
    const decoded = jwtDecode(token);
    username = decoded.sub;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Settings ⚙️</h1>
        <p className="dashboard-welcome">
          Hi, <strong>{username}</strong> ! Manage your preferences here.
        </p>
      </div>
    </div>
  );
};

export default Settings;
