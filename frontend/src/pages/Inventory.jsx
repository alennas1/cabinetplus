import React from "react";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import "./Dashboard.css"; // import the CSS

const Dashboard = () => {
  const token = useSelector((state) => state.auth.token);

  let username = "";
  if (token) {
    const decoded = jwtDecode(token);
    username = decoded.sub; // 👈 username is stored in "sub"
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Inventory</h1>
        <p className="dashboard-welcome">
          Bienvenue, <strong>{username}</strong> !
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
