import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Home,
  Users,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  PlusSquare,
  Briefcase,
  BarChart2,
  Package,
  FileText,
  UserCheck,
} from "react-feather"; // final optimized icon set
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
          <Link to="/employees">
            <UserCheck size={20} />
            <span className="link-text">Employés</span>
          </Link>
        </li>
        <li className="admin-link">
          <Link to="/finance">
            <BarChart2 size={20} />
            <span className="link-text">Finances</span>
          </Link>
        </li>
        <li className="admin-link">
          <Link to="/inventory">
            <Package size={20} />
            <span className="link-text">Inventaire</span>
          </Link>
        </li>
        <li className="admin-link">
          <Link to="/expenses">
            <CreditCard size={20} />
            <span className="link-text">Dépenses</span>
          </Link>
        </li>
        <li className="admin-link">
          <Link to="/settings">
            <Settings size={20} />
            <span className="link-text">Paramètres</span>
          </Link>
        </li>
      </ul>

      {/* Déconnexion */}
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
