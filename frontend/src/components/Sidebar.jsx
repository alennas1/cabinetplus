import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Home, User, Calendar, Settings, LogOut, PlusSquare } from "react-feather"; 
import { logout } from "../store/authSlice";
import "./Sidebar.css";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="sidebar">
      {/* Tous les éléments y compris Cabinet+ */}
      <ul className="sidebar-links">
        <li className="brand">
          <Link to="/dashboard">
            <PlusSquare size={20} />
            <span className="link-text brand-text">Cabinet+</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard">
            <Home size={20} /> <span className="link-text">Tableau de bord</span>
          </Link>
        </li>
        <li>
          <Link to="/patients">
            <User size={20} /> <span className="link-text">Patients</span>
          </Link>
        </li>
        <li>
          <Link to="/appointments">
            <Calendar size={20} /> <span className="link-text">Rendez-vous</span>
          </Link>
        </li>
        <li>
          <Link to="/settings">
            <Settings size={20} /> <span className="link-text">Paramètres</span>
          </Link>
        </li>
      </ul>

      {/* Déconnexion */}
      <div className="sidebar-logout">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} /> <span className="link-text">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
