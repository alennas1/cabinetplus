import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Home,
  User,
  Users,
  DollarSign,
  Clock,
  List,
  Settings,
  LogOut,
  PlusSquare,
  BarChart2,
  PieChart,
} from "react-feather";
// 1. Updated Import to match authSlice
import { logoutSuccess } from "../store/authSlice";
// 2. Import the actual logout service to clear cookies
import { logout as logoutService } from "../services/authService";
import "./Sidebar.css";

const SidebarAdmin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // 1. Clear backend cookies via the API
      await logoutService();
    } catch (err) {
      console.error("Erreur déconnexion admin:", err);
    } finally {
      // 2. Clear Redux state
      dispatch(logoutSuccess());
      // 3. Redirect
      navigate("/login", { replace: true });
    }
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
            <BarChart2 size={20} /> 
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