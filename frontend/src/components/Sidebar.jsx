import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux"; // To dispatch the logout action
import { Home, User, Calendar, Settings, LogOut } from "react-feather"; // Feather icons
import { logout } from "../store/authSlice"; // Import logout action
import "./Sidebar.css";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Logout handler
  const handleLogout = () => {
    dispatch(logout()); // Dispatch the logout action
    navigate("/login"); // Redirect to login page after logout
  };

  return (
    <div className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <img src="/logo4.png" alt="Cabinet+" />
        <span className="logo-text">Cabinet+</span>
      </div>

      {/* Links Section */}
      <ul className="sidebar-links">
        <li>
          <Link to="/dashboard">
            <Home size={20} /> Dashboard
          </Link>
        </li>
        <li>
          <Link to="/patients">
            <User size={20} /> Patients
          </Link>
        </li>
        <li>
          <Link to="/appointments">
            <Calendar size={20} /> Appointments
          </Link>
        </li>
        <li>
          <Link to="/settings">
            <Settings size={20} /> Settings
          </Link>
        </li>
      </ul>

      {/* Logout Button */}
      <ul className="sidebar-links">
        <li>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} /> Logout
          </button>
        </li>
      </ul>

      {/* Footer Section */}
      <div className="sidebar-footer">
        <p>
          <a href="https://example.com">Help</a>
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
