import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { initializeSession, getCurrentUser } from "./services/authService";
import { setCredentials, sessionExpired, setLoading } from "./store/authSlice";
import LoadingLogo from "./components/LoadingLogo"; // <-- adjust the path if needed
// --- Pages ---
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Settings from "./pages/Settings";
import Patient from "./pages/Patient";
import Medications from "./pages/Medications";
import TreatmentCatalog from "./pages/Treatments";
import ProstheticsSettings from "./pages/ProstheticsSettings";
import Prosthetics from "./pages/Prosthetics";
import MaterialsSettings from "./pages/MaterialsSettings";
import Preference from "./pages/Preference";
import Profile from "./pages/Profile";
import Security from "./pages/Security";
import AuditLogs from "./pages/AuditLogs";
import Finance from "./pages/Finance";
import Expenses from "./pages/Expenses";
import Ordonnance from "./pages/Ordonnance";
import Inventory from "./pages/Inventory";
import Items from "./pages/Items";
import Employees from "./pages/Employees";
import EmployeeDetails from "./pages/EmployeeDetails"; 
import VerificationPage from "./pages/VerificationPage"; 
import PlanPage from "./pages/PlanPage"; 
import WaitingPage from "./pages/WaitingPage"; 
import HandPaymentHistory from "./pages/HandPaymentHistory";
import JustificationContent from "./pages/JustificationContent";
import GestionCabinet from "./pages/GestionCabinet";
import Catalogue from "./pages/Catalogue";
// --- Admin Pages ---
import DentistsPage from "./pages/Dentists"; 
import DentistDetails from "./pages/DentistDetails";
import PendingPaymentsPage from "./pages/PendingPayments"; 
import PaymentHistoryPage from "./pages/PaymentHistory"; 
import ExpiringPlansPage from "./pages/EndingPlans"; 
import AdminSettings from "./pages/AdminSettings"; 
import AdminFinance from "./pages/AdminFinance";
import ManageAdmins from "./pages/ManageAdmins";
import AdminChangePassword from "./pages/AdminChangePassword";
import ManagePlans from "./pages/ManagePlans";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import Justification from "./pages/Justification";

import Devis from "./pages/Devis"; 
import Laboratory from "./pages/Laboratory";
import LaboratoryDetails from "./pages/LaboratoryDetails";
// --- Components ---
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import RequireAuth from "./components/RequireAuth"; 
import RequireClinicRole from "./components/RequireClinicRole";
import GestionCabinetPinGuard from "./components/GestionCabinetPinGuard";
import SessionExpiredModal from "./components/SessionExpiredModal";
import OfflineScreen from "./components/OfflineScreen";
import { CLINIC_ROLES, getClinicRole } from "./utils/clinicAccess";
import { isPlanActiveForAccess } from "./utils/planAccess";
import { applyUserPreferences } from "./utils/workingHours";
import { getUserPreferences } from "./services/userPreferenceService";

import "./index.css";

const AppContent = () => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth); 
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  // Lock background scroll whenever a modal overlay is present.
  useEffect(() => {
    const updateBodyLock = () => {
      const hasModal =
        document.querySelector(".modal-overlay, .modal-backdrop, .doc-selector-overlay") ||
        document.querySelector('[class*="fixed"][class*="inset-0"][class*="z-[9999]"]');
      document.body.classList.toggle("modal-open", !!hasModal);
    };

    updateBodyLock();

    const observer = new MutationObserver(() => updateBodyLock());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      document.body.classList.remove("modal-open");
    };
  }, []);

  // --- Session Expired Listener ---
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }
      dispatch(sessionExpired());
      navigate("/login", { replace: true, state: { reason: "session_expired" } });
    };
    window.addEventListener("sessionExpired", handleSessionExpired);
    return () => window.removeEventListener("sessionExpired", handleSessionExpired);
  }, [dispatch, navigate]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      window.location.reload();
    };
    const handleOffline = () => setIsOffline(true);
    const handleAppOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("appOffline", handleAppOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("appOffline", handleAppOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOffline || !navigator.onLine) return;

    const tryReconnect = async () => {
      const status = await initializeSession();
      if (status !== null) {
        window.location.reload();
      }
    };

    // Attempt immediately, then retry quickly while offline is shown.
    tryReconnect();
    const interval = window.setInterval(tryReconnect, 1000);

    return () => window.clearInterval(interval);
  }, [isOffline]);

  // --- Initialize Session on Page Load ---
  useEffect(() => {
    const bootApp = async () => {
      dispatch(setLoading(true));

      try {
        const hasSession = await initializeSession(); // refreshes token if refresh cookie is valid
        if (hasSession === true) {
          const userData = await getCurrentUser();
          try {
            const preferences = await getUserPreferences();
            applyUserPreferences(preferences);
          } catch {
            applyUserPreferences(null);
          }
          dispatch(setCredentials({ user: userData, token: true })); // now token is valid
          return;
        }

        if (hasSession === null || !navigator.onLine) {
          setIsOffline(true);
          dispatch(setLoading(false));
          return;
        }

        dispatch(sessionExpired());
      } catch (error) {
        if (!navigator.onLine) {
          setIsOffline(true);
          dispatch(setLoading(false));
          return;
        }
        dispatch(sessionExpired());
      }
    };

    bootApp();
  }, [dispatch]);

  // --- Determine Redirect Path based on User Status ---
  const getRedirectPath = (user) => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin-dashboard";
    if (getClinicRole(user) === CLINIC_ROLES.DENTIST) {
      if (!user.phoneVerified) return "/verify";
      const isPlanActive = isPlanActiveForAccess(user);
      if (!isPlanActive && user.planStatus === "WAITING") return "/waiting";
      if (!isPlanActive) return "/plan";
      return "/dashboard";
    }
    if (getClinicRole(user) === CLINIC_ROLES.PARTNER_DENTIST) return "/dashboard";
    return "/appointments";
  };

  // --- Loading Screen ---
  if (loading) {
    return <LoadingLogo />;
  }

  if (isOffline) {
    return <OfflineScreen />;
  }

  const RootRedirect = () => (!isAuthenticated ? <Navigate to="/login" replace /> : <Navigate to={getRedirectPath(user)} replace />);
  const CatchAllRedirect = () => (!isAuthenticated ? <Navigate to="/login" replace /> : <Navigate to={getRedirectPath(user)} replace />);

  return (
    <div className="app-container">
      <SessionExpiredModal />
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        closeOnClick
        theme="light"
        style={{ zIndex: 100000 }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<CatchAllRedirect />} />

        {/* Dentist Protected Routes */}
        <Route element={<RequireAuth allowedRoles={["DENTIST"]} />}>
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/waiting" element={<WaitingPage />} />

          <Route element={<Layout />}>
            <Route path="/devis" element={<Devis />} />
            <Route element={<RequireClinicRole allowedClinicRoles={[CLINIC_ROLES.DENTIST, CLINIC_ROLES.PARTNER_DENTIST]} />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<Patient />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/patients/:id/ordonnance/:ordonnanceId" element={<Ordonnance />} />
            <Route path="/patients/:id/ordonnance/create" element={<Ordonnance />} />
            <Route path="/patients/:patientId/justification/:templateId" element={<Justification />} />

            <Route element={<RequireClinicRole allowedClinicRoles={[CLINIC_ROLES.DENTIST, CLINIC_ROLES.PARTNER_DENTIST, CLINIC_ROLES.ASSISTANT]} />}>
              <Route path="/gestion-cabinet/prosthetics-tracking" element={<Prosthetics />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/catalogue/medications" element={<Medications />} />
              <Route path="/catalogue/treatments" element={<TreatmentCatalog />} />
              <Route path="/catalogue/justifications" element={<JustificationContent />} />
              <Route path="/catalogue/prosthetics" element={<ProstheticsSettings />} />
              <Route path="/catalogue/materials" element={<MaterialsSettings />} />
              <Route path="/catalogue/items" element={<Items />} />
            </Route>

            <Route element={<RequireClinicRole allowedClinicRoles={[CLINIC_ROLES.DENTIST, CLINIC_ROLES.PARTNER_DENTIST]} />}>
              <Route element={<GestionCabinetPinGuard />}>
                <Route path="/gestion-cabinet" element={<GestionCabinet />} />
                <Route path="/gestion-cabinet/laboratories" element={<Laboratory />} />
                <Route path="/gestion-cabinet/laboratories/:id" element={<LaboratoryDetails />} />
                <Route path="/gestion-cabinet/finance" element={<Finance />} />
                <Route path="/gestion-cabinet/inventory" element={<Inventory />} />
                <Route path="/gestion-cabinet/expenses" element={<Expenses />} />
                <Route path="/gestion-cabinet/employees" element={<Employees />} />
                <Route path="/gestion-cabinet/employees/:id" element={<EmployeeDetails />} />
              </Route>
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/preferences" element={<Preference />} />
              <Route path="/settings/profile" element={<Profile />} />
              <Route path="/settings/security" element={<Security />} />
              <Route path="/settings/audit-logs" element={<AuditLogs />} />
              <Route path="/settings/payments" element={<HandPaymentHistory />} />
            </Route>

            <Route path="/settings/medications" element={<Navigate to="/catalogue/medications" replace />} />
            <Route path="/settings/treatments" element={<Navigate to="/catalogue/treatments" replace />} />
            <Route path="/settings/justifications" element={<Navigate to="/catalogue/justifications" replace />} />
            <Route path="/settings/prosthetics" element={<Navigate to="/catalogue/prosthetics" replace />} />
            <Route path="/settings/materials" element={<Navigate to="/catalogue/materials" replace />} />
            <Route path="/settings/items" element={<Navigate to="/catalogue/items" replace />} />
            
          </Route>
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin-dashboard" element={<DentistsPage />} />
            <Route path="/dentists" element={<DentistsPage />} />
            <Route path="/dentists/:id" element={<DentistDetails />} />
            <Route path="/pending-payments" element={<PendingPaymentsPage />} />
            <Route path="/payment-history" element={<PaymentHistoryPage />} />
            <Route path="/expiring-plans" element={<ExpiringPlansPage />} />
            <Route path="/settings-admin" element={<AdminSettings />} />
            <Route path="/finance-admin" element={<AdminFinance />} />
            <Route path="/admin/preferences" element={<Preference showWorkingHours={false} />} />
            <Route path="/admin/manage-admins" element={<ManageAdmins />} />
            <Route path="/admin/change-password" element={<AdminChangePassword />} />
            <Route path="/admin/manage-plans" element={<ManagePlans />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>
        </Route>

        {/* Redirects */}
        <Route index element={<RootRedirect />} />
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
