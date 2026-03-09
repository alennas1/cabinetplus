import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Home,
  Users,
  Calendar,
  LogOut,
  PlusSquare,
  FileText,
  Settings,
  Briefcase // Using Briefcase as a collective icon for 'Gestion'
} from "react-feather";

import { logout as logoutRedux } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";

import "./Sidebar.css";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      dispatch(logoutRedux());
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="sidebar">
      <ul className="sidebar-links">
        {/* --- Brand --- */}
        <li className="brand">
          <Link to="/dashboard">
            <PlusSquare size={20} />
            <span className="link-text brand-text">Cabinet+</span>
          </Link>
        </li>

        {/* --- General Group --- */}
        <li className="sidebar-group-title admin">Général</li>

        <li>
          <Link to="/dashboard">
            <Home size={20} />
            <span className="link-text">Tableau de bord</span>
          </Link>
        </li>

        <li>
          <Link to="/patients">
            <Users size={20} />
            <span className="link-text">Patients</span>
          </Link>
        </li>

        <li>
          <Link to="/appointments">
            <Calendar size={20} />
            <span className="link-text">Rendez-vous</span>
          </Link>
        </li>

        {/* --- Administration Group --- */}
        <li className="sidebar-group-title admin">Administration</li>

        <li className="admin-link">
          <Link to="/devis">
            <FileText size={20} />
            <span className="link-text">Devis</span>
          </Link>
        </li>

        {/* Combined Gestion Cabinet Link */}
        <li className="admin-link">
          <Link to="/gestion-cabinet">
            <Briefcase size={20} />
            <span className="link-text">Gestion Cabinet</span>
          </Link>
        </li>

        <li className="admin-link">
          <Link to="/settings">
            <Settings size={20} />
            <span className="link-text">Paramètres</span>
          </Link>
        </li>
      </ul>

      {/* --- Logout --- */}
      <div className="sidebar-logout">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span className="link-text">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;