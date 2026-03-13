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
  Lock,
  Unlock
} from "react-feather";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../utils/error";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";

import { logout as logoutRedux } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";
import PinCodeInput from "./PinCodeInput";
import PasswordInput from "./PasswordInput";
import {
  changeGestionCabinetPin,
  clearGestionCabinetUnlocked,
  disableGestionCabinetPin,
  enableGestionCabinetPin,
  setCachedGestionCabinetPinEnabled,
  getGestionCabinetPinStatus,
  setGestionCabinetUnlocked,
} from "../services/pinGuardService";

import "./Sidebar.css";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.username;
  const clinicRole = getClinicRole(user);
  const canAccessAdminCore = [CLINIC_ROLES.DENTIST, CLINIC_ROLES.PARTNER_DENTIST].includes(clinicRole);
  const canAccessDashboard = canAccessAdminCore;
  const canAccessCatalogues = canAccessAdminCore || clinicRole === CLINIC_ROLES.ASSISTANT;
  const canAccessProstheses = canAccessCatalogues;
  const showAdminGroup = canAccessAdminCore || canAccessCatalogues || canAccessProstheses;

  const isInGestionCabinet = useMemo(() => location.pathname.startsWith("/gestion-cabinet"), [location.pathname]);

  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinChecking, setPinChecking] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState("enable"); // enable | remove | modify
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const refreshPinStatus = async () => {
    try {
      setPinChecking(true);
      const status = await getGestionCabinetPinStatus();
      const nextEnabled = !!status?.enabled;
      setPinEnabled(nextEnabled);
      setCachedGestionCabinetPinEnabled(userKey, nextEnabled);
    } catch {
      setPinEnabled(false);
    } finally {
      setPinChecking(false);
    }
  };

  useEffect(() => {
    if (!userKey) return;
    refreshPinStatus();
    const onChanged = () => refreshPinStatus();
    window.addEventListener("gcPinStatusChanged", onChanged);
    return () => window.removeEventListener("gcPinStatusChanged", onChanged);
  }, [userKey]);

  const resetModal = () => {
    setPassword("");
    setNewPin("");
    setConfirmPin("");
    setPinSubmitting(false);
  };

  const openEnableModal = () => {
    resetModal();
    setPinMode("enable");
    setShowPinModal(true);
  };

  const openRemoveModal = () => {
    resetModal();
    setPinMode("remove");
    setShowPinModal(true);
  };

  const openModifyModal = () => {
    resetModal();
    setPinMode("modify");
    setShowPinModal(true);
  };

  const validatePin = () => {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error("Le PIN doit contenir 4 chiffres");
      return false;
    }
    if (newPin !== confirmPin) {
      toast.error("Les codes PIN ne correspondent pas");
      return false;
    }
    return true;
  };

  const handleEnablePin = async () => {
    if (pinSubmitting) return;
    if (!validatePin()) return;
    try {
      setPinSubmitting(true);
      await enableGestionCabinetPin(newPin);
      setGestionCabinetUnlocked(userKey, 30);
      toast.success("Gestion cabinet verrouillée");
      setShowPinModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible d'activer le PIN"));
    } finally {
      setPinSubmitting(false);
    }
  };

  const handleRemovePin = async () => {
    if (pinSubmitting) return;
    if (!password.trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }
    try {
      setPinSubmitting(true);
      await disableGestionCabinetPin(password);
      clearGestionCabinetUnlocked(userKey);
      toast.success("Verrou retiré");
      setShowPinModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de retirer le verrou"));
    } finally {
      setPinSubmitting(false);
    }
  };

  const handleModifyPin = async () => {
    if (pinSubmitting) return;
    if (!password.trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }
    if (!validatePin()) return;

    try {
      setPinSubmitting(true);
      await changeGestionCabinetPin(newPin, password);
      setGestionCabinetUnlocked(userKey, 30);
      toast.success("PIN modifié");
      setShowPinModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de modifier le PIN"));
    } finally {
      setPinSubmitting(false);
    }
  };

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

  const isActivePath = (path, { exact = false } = {}) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
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

        {canAccessDashboard && <li>
          <Link
            to="/dashboard"
            className={isActivePath("/dashboard", { exact: true }) ? "active" : ""}
          >
            <Home size={20} />
            <span className="link-text">Tableau de bord</span>
          </Link>
        </li>}

        <li>
          <Link
            to="/appointments"
            className={isActivePath("/appointments") ? "active" : ""}
          >
            <Calendar size={20} />
            <span className="link-text">Rendez-vous</span>
          </Link>
        </li>

        <li>
          <Link
            to="/patients"
            className={isActivePath("/patients") ? "active" : ""}
          >
            <Users size={20} />
            <span className="link-text">Patients</span>
          </Link>
        </li>

        <li>
          <Link
            to="/devis"
            className={isActivePath("/devis") ? "active" : ""}
          >
            <FileText size={20} />
            <span className="link-text">Devis</span>
          </Link>
        </li>

        {/* --- Administration Group --- */}
        {showAdminGroup && <li className="sidebar-group-title admin">Administration</li>}

        {canAccessAdminCore && <li className="admin-link">
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
            <button
              type="button"
              className="gc-lock-btn"
              title={pinEnabled ? "Retirer ou modifier le verrou" : "Verrouiller Gestion cabinet"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (pinChecking) return;
                if (pinEnabled) openRemoveModal();
                else openEnableModal();
              }}
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: pinChecking ? "default" : "pointer",
                padding: 0,
              }}
            >
              {pinEnabled ? <Lock size={18} color="#ef4444" /> : <Unlock size={18} color="#22c55e" />}
            </button>
          </Link>
        </li>}

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

        {canAccessAdminCore && <li className="admin-link">
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
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span className="link-text">Se déconnecter</span>
        </button>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]" onClick={() => setShowPinModal(false)}>
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            {pinMode === "enable" && (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Verrouiller Gestion cabinet</h2>
                <p className="text-gray-600 mb-5">Choisissez un PIN à 4 chiffres.</p>

                <div className="flex flex-col gap-4">
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
      )}

    </div>
  );
};

export default Sidebar;





