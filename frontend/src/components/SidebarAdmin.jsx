import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Headphones,
  MessageSquare,
} from "react-feather";

import { logout as logoutRedux } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";
import "./Sidebar.css";

const SidebarAdmin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePath = (path, { exact = false } = {}) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

 const handleLogout = async (e) => {
    // Safety: avoid accidental <form> submit -> full page reload.
    e?.preventDefault?.();
    e?.stopPropagation?.();
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

      <div className="sidebar-bottom">
        <Link
          to="/admin/messagerie"
          className={`sidebar-bottom-link ${isActivePath("/admin/messagerie") ? "active" : ""}`.trim()}
        >
          <MessageSquare size={20} />
          <span className="link-text">Messagerie</span>
        </Link>

        <Link
          to="/admin/support"
          className={`sidebar-bottom-link ${isActivePath("/admin/support") ? "active" : ""}`.trim()}
        >
          <Headphones size={20} />
          <span className="link-text">Support & Feedback</span>
        </Link>

        <Link
          to="/settings-admin"
          className={`sidebar-bottom-link ${isActivePath("/settings-admin") ? "active" : ""}`.trim()}
        >
          <Settings size={20} />
          <span className="link-text">Paramètres</span>
        </Link>

        <button type="button" onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span className="link-text">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarAdmin;
