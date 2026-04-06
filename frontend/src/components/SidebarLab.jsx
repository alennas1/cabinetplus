import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Clipboard, CreditCard, Layers, LogOut, PlusSquare, Settings, Users } from "react-feather";
import { logout as logoutRedux } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";
import "./Sidebar.css";

const SidebarLab = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePath = (path, { exact = false } = {}) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      await logoutApi();
    } catch {
      // ignore
    } finally {
      dispatch(logoutRedux());
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="sidebar">
      <ul className="sidebar-links">
        <li className="brand">
          <Link to="/lab/prosthetics">
            <PlusSquare size={20} />
            <span className="link-text brand-text">Cabinet+</span>
          </Link>
        </li>

        <li className="sidebar-group-title admin">Laboratoire</li>

        <li>
          <Link to="/lab/prosthetics" className={isActivePath("/lab/prosthetics") ? "active" : ""}>
            <Layers size={20} />
            <span className="link-text">Prothèses</span>
          </Link>
        </li>

        <li>
          <Link to="/lab/payments" className={isActivePath("/lab/payments") ? "active" : ""}>
            <CreditCard size={20} />
            <span className="link-text">Paiements</span>
          </Link>
        </li>

        <li>
          <Link to="/lab/dentists" className={isActivePath("/lab/dentists") ? "active" : ""}>
            <Users size={20} />
            <span className="link-text">Dentistes</span>
          </Link>
        </li>

        <li>
          <Link to="/lab/invitations" className={isActivePath("/lab/invitations") ? "active" : ""}>
            <Clipboard size={20} />
            <span className="link-text">Invitations</span>
          </Link>
        </li>

        <li className="sidebar-group-title admin">Compte</li>

        <li>
          <Link to="/lab/settings" className={isActivePath("/lab/settings") ? "active" : ""}>
            <Settings size={20} />
            <span className="link-text">Paramètres</span>
          </Link>
        </li>
      </ul>

      <div className="sidebar-logout">
        <button type="button" className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span className="link-text">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarLab;
