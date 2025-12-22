import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Home,
  User, // Nouveau: Utilisé pour 'Dentistes'
  Users, // Utilisé pour 'Employés' ou 'Utilisateurs'
  DollarSign, // Nouveau: Pour les paiements
  Clock, // Nouveau: Pour les paiements en attente / plans expirants
  List, // Nouveau: Pour l'historique des paiements
  Settings,
  LogOut,
  PlusSquare,
  BarChart2,
  PieChart ,
} from "react-feather";
import { logout } from "../store/authSlice";
import "./Sidebar.css";

const SidebarAdmin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <ul className="sidebar-links">
        {/* --- Brand --- */}
        <li className="brand">
          <Link to="/admin-dashboard">
            <PlusSquare size={20} />
            <span className="link-text brand-text">Cabinet+</span>
          </Link>
        </li>

        {/* --- Général Group --- */}
        <li className="sidebar-group-title">Général</li>
        <li>
          {/* Remplacé /patients par /dentists pour l'Admin */}
          <Link to="/dentists">
            <User size={20} /> 
            <span className="link-text">Dentistes</span>
          </Link>
        </li>
      

        {/* --- Facturation & Abonnements Group --- */}
        <li className="sidebar-group-title">Facturation</li>
        
        <li>
          <Link to="/pending-payments">
            <Clock size={20} /> 
            <span className="link-text">Paiements en attente</span>
          </Link>
        </li>
        <li>
          <Link to="/payment-history">
            <List size={20} /> 
            <span className="link-text">Paiements</span>
          </Link>
        </li>
        <li>
          <Link to="/expiring-plans">
            <PieChart size={20} /> 
            <span className="link-text">Plans expirants</span>
          </Link>
        </li>
        <li>
  <Link to="/finance-admin">
    <BarChart2  size={20} /> 
    <span className="link-text">Finance</span>
  </Link>
</li>
        {/* --- Système Group --- */}
        <li className="sidebar-group-title">Système</li>
        
        <li>
          <Link to="/settings-admin">
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

export default SidebarAdmin;