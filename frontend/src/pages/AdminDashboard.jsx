import React from "react";
import { useDispatch } from "react-redux";
import { LogOut } from "react-feather"; 
import { useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice"; // Ensure this path is correct

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Logout Logic ---
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div style={{ textAlign: "center", padding: "50px", fontFamily: "Arial" }}>
      <h1>Welcome, Admin!</h1>
      <p>This is your dashboard test page.</p>

      {/* --- LOGOUT BUTTON (Styled like verification page logout) --- */}
      <button
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          marginTop: "20px",
          cursor: "pointer",
          borderRadius: "5px",
          border: "1px solid #c0392b", // Red border for danger/logout
          backgroundColor: "#e74c3c", // Red background
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "20px auto 0 auto" // Center the button
        }}
      >
        <LogOut size={16} style={{ marginRight: '8px' }} />
        Se déconnecter
      </button>
    </div>
  );
};

export default AdminDashboard;