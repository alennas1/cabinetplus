import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Clipboard, Clock, CreditCard, Headphones, Layers, LogOut, MessageSquare, PlusSquare, Settings, Users } from "react-feather";
import { logout as logoutRedux } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";
import { listMySupportThreads } from "../services/supportService";
import { listMessagingThreads } from "../services/messagingService";
import "./Sidebar.css";

const SidebarLab = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isInSupport = useMemo(() => location.pathname.startsWith("/lab/support"), [location.pathname]);
  const isInMessaging = useMemo(() => location.pathname.startsWith("/lab/messagerie"), [location.pathname]);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [messagingUnreadCount, setMessagingUnreadCount] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      if (isInSupport) return;
      try {
        const data = await listMySupportThreads();
        if (cancelled) return;
        const total = (Array.isArray(data) ? data : []).reduce((sum, t) => sum + Number(t?.unreadCount || 0), 0);
        setSupportUnreadCount(total);
      } catch {
        if (!cancelled) setSupportUnreadCount(0);
      }
    };

    if (isInSupport) {
      setSupportUnreadCount(0);
      return () => {
        cancelled = true;
      };
    }

    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isInSupport, location.pathname]);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      if (isInMessaging) return;
      try {
        const data = await listMessagingThreads();
        if (cancelled) return;
        const total = (Array.isArray(data) ? data : []).reduce((sum, t) => sum + Number(t?.unreadCount || 0), 0);
        setMessagingUnreadCount(total);
      } catch {
        if (!cancelled) setMessagingUnreadCount(0);
      }
    };

    if (isInMessaging) {
      setMessagingUnreadCount(0);
      return () => {
        cancelled = true;
      };
    }

    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isInMessaging, location.pathname]);

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
          <Link to="/lab/pending" className={isActivePath("/lab/pending") ? "active" : ""}>
            <Clock size={20} />
            <span className="link-text">En attente</span>
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
          <Link to="/lab/messagerie" className={isActivePath("/lab/messagerie") ? "active" : ""}>
            <span className="cp-sidebar-icon">
              <MessageSquare size={20} />
              {messagingUnreadCount > 0 ? (
                <span className="cp-sidebar-badge" aria-label={`${messagingUnreadCount} message(s) non lu(s)`}>
                  {messagingUnreadCount > 99 ? "99+" : messagingUnreadCount}
                </span>
              ) : null}
            </span>
            <span className="link-text">Messagerie</span>
          </Link>
        </li>

        <li>
          <Link to="/lab/invitations" className={isActivePath("/lab/invitations") ? "active" : ""}>
            <Clipboard size={20} />
            <span className="link-text">Invitations</span>
          </Link>
        </li>
      </ul>

      <div className="sidebar-bottom">
        <Link
          to="/lab/support"
          className={`sidebar-bottom-link ${isActivePath("/lab/support") ? "active" : ""}`.trim()}
        >
          <span className="cp-sidebar-icon">
            <Headphones size={20} />
            {supportUnreadCount > 0 ? (
              <span className="cp-sidebar-badge" aria-label={`${supportUnreadCount} message(s) non lu(s)`}>
                {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
              </span>
            ) : null}
          </span>
          <span className="link-text">Support</span>
        </Link>

        <Link
          to="/lab/settings"
          className={`sidebar-bottom-link ${isActivePath("/lab/settings") ? "active" : ""}`.trim()}
        >
          <Settings size={20} />
          <span className="link-text">Paramètres</span>
        </Link>

        <button type="button" className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span className="link-text">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarLab;
