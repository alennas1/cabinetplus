import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Home,
  Users,
  Calendar,
  LogOut,
  PlusSquare,
  FileText,
  Settings,
  Briefcase,
  BookOpen,
  Layers,
  Headphones,
  CreditCard,
} from "react-feather";
import { PERMISSIONS, isClinicEmployeeAccount, userHasPermission } from "../utils/permissions";

import { logout as logoutRedux } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";
import { listMySupportThreads } from "../services/supportService";

import "./Sidebar.css";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.phoneNumber;
  const isStaffAccount = isClinicEmployeeAccount(user);
  const canAccessDashboard = userHasPermission(user, PERMISSIONS.DASHBOARD);
  const canAccessAppointments = userHasPermission(user, PERMISSIONS.APPOINTMENTS);
  const canAccessPatients = userHasPermission(user, PERMISSIONS.PATIENTS);
  const canAccessDevis = userHasPermission(user, PERMISSIONS.DEVIS);
  const canAccessSupport = userHasPermission(user, PERMISSIONS.SUPPORT);
  const canAccessCatalogues = userHasPermission(user, PERMISSIONS.CATALOGUE);
  const canAccessProstheses = userHasPermission(user, PERMISSIONS.PROSTHESES);
  const canAccessGestionCabinet = userHasPermission(user, PERMISSIONS.GESTION_CABINET);
  const canAccessLaboratories = userHasPermission(user, PERMISSIONS.LABORATORIES);
  const canAccessFournisseurs = userHasPermission(user, PERMISSIONS.FOURNISSEURS);
  const canAccessExpenses = userHasPermission(user, PERMISSIONS.EXPENSES);
  const canAccessInventory = userHasPermission(user, PERMISSIONS.INVENTORY);
  const canAccessSettings = userHasPermission(user, PERMISSIONS.SETTINGS);

  const canAccessGestionCabinetHub = canAccessGestionCabinet && !isStaffAccount;
  const showStaffCabinetLinks = isStaffAccount && (canAccessLaboratories || canAccessFournisseurs || canAccessExpenses || canAccessInventory);
  const canAccessFinanceLogistiqueHub = isStaffAccount && (canAccessExpenses || canAccessInventory);
  const canAccessRessourcesPartenairesHub = isStaffAccount && (canAccessLaboratories || canAccessFournisseurs);

  const showAdminGroup =
    canAccessGestionCabinetHub ||
    showStaffCabinetLinks ||
    canAccessCatalogues ||
    canAccessProstheses ||
    canAccessSettings;
  const isInSupport = useMemo(() => location.pathname.startsWith("/support"), [location.pathname]);

  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  useEffect(() => {
    if (!userKey) return;
    let cancelled = false;

    const fetchUnread = async () => {
      // When the user is on the Support screen, keep the badge hidden.
      // (SupportCenter will mark threads as read, but we don't want to briefly re-show stale counts.)
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
  }, [userKey, location.pathname, isInSupport]);

  const handleLogout = async (e) => {
    // Safety: if this button ever ends up inside a <form>, don't submit and trigger a full page refresh.
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

  const isActivePath = (path, { exact = false } = {}) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isFinanceLogistiqueActive = useMemo(() => {
    const p = location.pathname;
    return (
      p.startsWith("/gestion-cabinet/finance-logistique") ||
      p.startsWith("/gestion-cabinet/expenses") ||
      p.startsWith("/gestion-cabinet/inventory")
    );
  }, [location.pathname]);

  const isRessourcesPartenairesActive = useMemo(() => {
    const p = location.pathname;
    return (
      p.startsWith("/gestion-cabinet/ressources-partenaires") ||
      p.startsWith("/gestion-cabinet/laboratories") ||
      p.startsWith("/gestion-cabinet/fournisseurs")
    );
  }, [location.pathname]);

  return (
    <div className="sidebar">
      <ul className="sidebar-links">
        {/* --- Brand --- */}
        <li className="brand">
          <Link to={canAccessDashboard ? "/dashboard" : "/appointments"}>
            <PlusSquare size={20} />
            <span className="link-text brand-text">Cabinet+</span>
          </Link>
        </li>

        {/* --- General Group --- */}
        <li className="sidebar-group-title admin">Général</li>

        {canAccessDashboard && <li>
          <Link
            to="/dashboard"
            className={isActivePath("/dashboard", { exact: true }) ? "active" : ""}
          >
            <Home size={20} />
            <span className="link-text">Tableau de bord</span>
          </Link>
        </li>}

        {canAccessAppointments && <li>
          <Link
            to="/appointments"
            className={isActivePath("/appointments") ? "active" : ""}
          >
            <Calendar size={20} />
            <span className="link-text">Rendez-vous</span>
          </Link>
        </li>}

        {canAccessPatients && <li>
          <Link
            to="/patients"
            className={isActivePath("/patients") ? "active" : ""}
          >
            <Users size={20} />
            <span className="link-text">Patients</span>
          </Link>
        </li>}

        {canAccessDevis && <li>
          <Link
            to="/devis"
            className={isActivePath("/devis") ? "active" : ""}
          >
            <FileText size={20} />
            <span className="link-text">Devis</span>
          </Link>
        </li>}

        {canAccessSupport && <li>
          <Link
            to="/support"
            className={isActivePath("/support") ? "active" : ""}
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
        </li>}

        {/* --- Administration Group --- */}
        {showAdminGroup && <li className="sidebar-group-title admin">Administration</li>}

        {canAccessGestionCabinetHub && <li className="admin-link">
            <Link
              to="/gestion-cabinet"
              className={
                location.pathname.startsWith("/gestion-cabinet") &&
                !location.pathname.startsWith("/gestion-cabinet/prosthetics-tracking")
                  ? "active"
                  : ""
              }
            >
              <Briefcase size={20} />
              <span className="link-text">Gestion Cabinet</span>
            </Link>
          </li>}


        {isStaffAccount && showStaffCabinetLinks && (
          <>
            {canAccessFinanceLogistiqueHub && (
              <li className="admin-link">
                <Link
                  to="/gestion-cabinet/finance-logistique"
                  className={isFinanceLogistiqueActive ? "active" : ""}
                >
                  <CreditCard size={20} />
                  <span className="link-text">Finance</span>
                </Link>
              </li>
            )}

            {canAccessRessourcesPartenairesHub && (
              <li className="admin-link">
                <Link
                  to="/gestion-cabinet/ressources-partenaires"
                  className={isRessourcesPartenairesActive ? "active" : ""}
                >
                  <Briefcase size={20} />
                  <span className="link-text">Ressources</span>
                </Link>
              </li>
            )}
          </>
        )}
        {canAccessCatalogues && <li className="admin-link">
          <Link
            to="/catalogue"
            className={isActivePath("/catalogue") ? "active" : ""}
          >
            <BookOpen size={20} />
            <span className="link-text">Catalogues</span>
          </Link>
        </li>}

        {canAccessProstheses && <li className="admin-link">
          <Link
            to="/gestion-cabinet/prosthetics-tracking"
            className={isActivePath("/gestion-cabinet/prosthetics-tracking") ? "active" : ""}
          >
            <Layers size={20} />
            <span className="link-text">Prothèses</span>
          </Link>
        </li>}

        {canAccessSettings && <li className="admin-link">
          <Link
            to="/settings"
            className={isActivePath("/settings") ? "active" : ""}
          >
            <Settings size={20} />
            <span className="link-text">Paramètres</span>
          </Link>
        </li>}
      </ul>

      {/* --- Logout --- */}
      <div className="sidebar-logout">
        <button type="button" onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span className="link-text">Se déconnecter</span>
        </button>
      </div>

      {/* PIN management moved to Settings → Sécurité
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]" onClick={() => setShowPinModal(false)}>
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            {pinMode === "enable" && (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Verrouiller Gestion cabinet</h2>
                <p className="text-gray-600 mb-5">Mot de passe + PIN à 4 chiffres.</p>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-sm text-gray-700 mb-2">Mot de passe</div>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      inputClassName="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Mot de passe"
                      disabled={pinSubmitting}
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinModal(false);
                        navigate("/settings/security");
                      }}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>

                  <div>
                    <div className="text-sm text-gray-700 mb-2">Nouveau PIN</div>
                    <div className="flex justify-center">
                      <PinCodeInput value={newPin} onChange={setNewPin} autoFocus disabled={pinSubmitting} />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-700 mb-2">Confirmation</div>
                    <div className="flex justify-center">
                      <PinCodeInput value={confirmPin} onChange={setConfirmPin} disabled={pinSubmitting} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPinModal(false)}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={pinSubmitting}
                      onClick={handleEnablePin}
                      className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 transition-colors"
                    >
                      {pinSubmitting ? "..." : "Verrouiller"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {pinMode === "remove" && (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Retirer le verrou</h2>
                <p className="text-gray-600 mb-5">Entrez votre mot de passe pour désactiver le PIN.</p>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-sm text-gray-700 mb-2">Mot de passe</div>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      inputClassName="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Mot de passe"
                      disabled={pinSubmitting}
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinModal(false);
                        navigate("/settings/security");
                      }}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>

                  <div className="flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={openModifyModal}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Modifier
                    </button>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPinModal(false)}
                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={pinSubmitting}
                        onClick={handleRemovePin}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                      >
                        {pinSubmitting ? "..." : "Retirer"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {pinMode === "modify" && (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Modifier le PIN</h2>
                <p className="text-gray-600 mb-5">Mot de passe + nouveau PIN.</p>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-sm text-gray-700 mb-2">Mot de passe</div>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      inputClassName="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Mot de passe"
                      disabled={pinSubmitting}
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinModal(false);
                        navigate("/settings/security");
                      }}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>

                  <div>
                    <div className="text-sm text-gray-700 mb-2">Nouveau PIN</div>
                    <div className="flex justify-center">
                      <PinCodeInput value={newPin} onChange={setNewPin} disabled={pinSubmitting} />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-700 mb-2">Confirmation</div>
                    <div className="flex justify-center">
                      <PinCodeInput value={confirmPin} onChange={setConfirmPin} disabled={pinSubmitting} />
                    </div>
                  </div>

                  <div className="flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={openRemoveModal}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Retour
                    </button>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPinModal(false)}
                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={pinSubmitting}
                        onClick={handleModifyPin}
                        className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 transition-colors"
                      >
                        {pinSubmitting ? "..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>
      */}

    </div>
  );
};

export default Sidebar;






