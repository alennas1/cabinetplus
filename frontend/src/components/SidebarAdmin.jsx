import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  User,
  Clock,
  List,
  Settings,
  LogOut,
  PlusSquare,
  BarChart2,
  PieChart,
  Shield,
  Sliders,
} from "react-feather";

import { logout as logoutRedux } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";
import "./Sidebar.css";

const SidebarAdmin = () => {
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
        <li className="brand">
          <Link to="/admin-dashboard">
            <PlusSquare size={20} />
            <span className="link-text brand-text">Cabinet+</span>
          </Link>
        </li>

        <li className="sidebar-group-title">General</li>
        <li>
          <Link to="/dentists">
            <User size={20} />
            <span className="link-text">Dentistes</span>
          </Link>
        </li>

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

        <li className="sidebar-group-title">Systeme</li>
        <li>
          <Link to="/settings-admin">
            <Settings size={20} />
            <span className="link-text">Parametres</span>
          </Link>
        </li>
        <li>
          <Link to="/admin/preferences">
            <Sliders size={20} />
            <span className="link-text">Preferences</span>
          </Link>
        </li>
        <li>
          <Link to="/admin/audit-logs">
            <Shield size={20} />
            <span className="link-text">Journal admin</span>
          </Link>
        </li>
      </ul>

      <div className="sidebar-logout">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span className="link-text">Se deconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarAdmin;
