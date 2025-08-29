import React from "react";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";

const Dashboard = () => {
  const token = useSelector((state) => state.auth.token);

  let username = "";
  if (token) {
    const decoded = jwtDecode(token);
    username = decoded.sub; // 👈 username is stored in "sub"
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Dashboard 🚀</h1>
      <p>Bienvenue, <strong>{username}</strong> !</p>
    </div>
  );
};

export default Dashboard;
