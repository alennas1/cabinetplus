import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { initializeSession, getCurrentUser } from "./services/authService";
import { setCredentials, sessionExpired, setLoading } from "./store/authSlice";
import LoadingLogo from "./components/LoadingLogo"; // <-- adjust the path if needed
import { initPwaUpdatePrompt } from "./pwa/registerPwaUpdate";
// --- Pages ---
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterLabPage from "./pages/RegisterLabPage";
import EmployeeSetup from "./pages/EmployeeSetup";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import ArchivedPatients from "./pages/ArchivedPatients";
import Appointments from "./pages/Appointments";
import Settings from "./pages/Settings";
import PatientManagementSettings from "./pages/PatientManagementSettings";
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
import ArchivedEmployees from "./pages/ArchivedEmployees";
import EmployeeDetails from "./pages/EmployeeDetails"; 
  import VerificationPage from "./pages/VerificationPage"; 
  import PlanPage from "./pages/PlanPage"; 
  import WaitingPage from "./pages/WaitingPage"; 
  import PinRequired from "./pages/PinRequired";
  import PinSetup from "./pages/PinSetup";
  import HandPaymentHistory from "./pages/HandPaymentHistory";
import JustificationContent from "./pages/JustificationContent";
import GestionCabinet from "./pages/GestionCabinet";
import Catalogue from "./pages/Catalogue";
import DiseaseCatalog from "./pages/DiseaseCatalog";
import AllergyCatalog from "./pages/AllergyCatalog";
// --- Admin Pages ---
import DentistsPage from "./pages/Dentists";
import AdminDentistsHub from "./pages/AdminDentistsHub";
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
  import SupportCenter from "./pages/SupportCenter";
  import SupportChat from "./pages/SupportChat";
  import AdminSupportCenter from "./pages/AdminSupportCenter";
  import AdminSupportChat from "./pages/AdminSupportChat";
  import AdminFeedbackDetails from "./pages/AdminFeedbackDetails";
  import AdminMessagingCenter from "./pages/AdminMessagingCenter";
  import MessagingCenter from "./pages/MessagingCenter";
  import Justification from "./pages/Justification";

import Devis from "./pages/Devis"; 
import Laboratory from "./pages/Laboratory";
import ArchivedLaboratories from "./pages/ArchivedLaboratories";
import LaboratoryDetails from "./pages/LaboratoryDetails";
import Fournisseurs from "./pages/Fournisseurs";
import ArchivedFournisseurs from "./pages/ArchivedFournisseurs";
import FournisseurDetails from "./pages/FournisseurDetails";

// --- Lab Portal Pages ---
import LabProsthetics from "./pages/LabProsthetics";
import LabPayments from "./pages/LabPayments";
import LabPending from "./pages/LabPending";
  import LabDentists from "./pages/LabDentists";
  import LabDentistDetails from "./pages/LabDentistDetails";
  import LabInvitations from "./pages/LabInvitations";
  import LabSettings from "./pages/LabSettings";
  import LabSettingsHome from "./pages/LabSettingsHome";
// --- Components ---
  import Layout from "./components/Layout";
  import AdminLayout from "./components/AdminLayout";
  import LabLayout from "./components/LabLayout";
  import RequireAuth from "./components/RequireAuth"; 
  import RequirePermission from "./components/RequirePermission";
  import RequireAnyPermission from "./components/RequireAnyPermission";
  import GestionCabinetPinGuard from "./components/GestionCabinetPinGuard";
  import SessionExpiredModal from "./components/SessionExpiredModal";
  import OfflineScreen from "./components/OfflineScreen";
import { CLINIC_ROLES, getClinicRole } from "./utils/clinicAccess";
import { PERMISSIONS } from "./utils/permissions";
import { isPlanActiveForAccess } from "./utils/planAccess";
import { applyUserPreferences } from "./utils/workingHours";
import { getUserPreferences } from "./services/userPreferenceService";
import { heartbeatMessagingPresence } from "./services/messagingService";

import "./index.css";

const AppContent = () => {
  const { isAuthenticated, user, token, loading } = useSelector((state) => state.auth); 
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  useEffect(() => {
    initPwaUpdatePrompt();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    let disposed = false;

    const HEARTBEAT_MS = 25000;
    const heartbeat = async () => {
      try {
        await heartbeatMessagingPresence();
      } catch {
        // ignore
      }
    };

    heartbeat();
    const id = setInterval(() => {
      if (!disposed) heartbeat();
    }, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") heartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, token]);

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
    if (!user.phoneVerified) return "/verify";
    if (user.role === "LAB") return "/lab";
    if (getClinicRole(user) === CLINIC_ROLES.DENTIST) {
      const isPlanActive = isPlanActiveForAccess(user);
      if (!isPlanActive && user.planStatus === "WAITING") return "/waiting";
      if (!isPlanActive) return "/plan";
      if (user?.gestionCabinetPinConfigured !== true) return "/pin-setup";
      return "/dashboard";
    }
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
        <Route path="/register-lab" element={<RegisterLabPage />} />
        <Route path="/employee-setup/:setupCode" element={<EmployeeSetup />} />
        <Route path="/unauthorized" element={<CatchAllRedirect />} />

        {/* Shared Protected Routes (Dentist + Employee + Lab) */}
        <Route element={<RequireAuth allowedRoles={["DENTIST", "EMPLOYEE", "LAB"]} />}>
          <Route path="/verify" element={<VerificationPage />} />
        </Route>

        {/* Clinic Protected Routes (Dentist + Employee) */}
        <Route element={<RequireAuth allowedRoles={["DENTIST", "EMPLOYEE"]} />}>
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/waiting" element={<WaitingPage />} />
          <Route path="/pin-required" element={<PinRequired />} />
          <Route path="/pin-setup" element={<PinSetup />} />

          <Route element={<Layout />}>
            <Route element={<RequirePermission permission={PERMISSIONS.DEVIS} />}>
              <Route path="/devis" element={<Devis />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.DASHBOARD} />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.PATIENTS} />}>
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/archived" element={<ArchivedPatients />} />
              <Route path="/patients/:id" element={<Patient />} />
              <Route path="/patients/:id/ordonnance/:ordonnanceId" element={<Ordonnance />} />
              <Route path="/patients/:id/ordonnance/create" element={<Ordonnance />} />
              <Route path="/patients/:patientId/justification/:templateId" element={<Justification />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.APPOINTMENTS} />}>
              <Route path="/appointments" element={<Appointments />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.PROSTHESES} />}>
              <Route path="/gestion-cabinet/prosthetics-tracking" element={<Prosthetics />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.CATALOGUE} />}>
              <Route path="/catalogue" element={<Navigate to="/gestion-cabinet/catalogue" replace />} />
              <Route path="/catalogue/medications" element={<Navigate to="/gestion-cabinet/catalogue/medications" replace />} />
              <Route path="/catalogue/treatments" element={<Navigate to="/gestion-cabinet/catalogue/treatments" replace />} />
              <Route path="/catalogue/justifications" element={<Navigate to="/gestion-cabinet/catalogue/justifications" replace />} />
              <Route path="/catalogue/prosthetics" element={<Navigate to="/gestion-cabinet/catalogue/prosthetics" replace />} />
              <Route path="/catalogue/materials" element={<Navigate to="/gestion-cabinet/catalogue/materials" replace />} />
              <Route path="/catalogue/items" element={<Navigate to="/gestion-cabinet/catalogue/items" replace />} />
              <Route path="/catalogue/diseases" element={<Navigate to="/gestion-cabinet/catalogue/diseases" replace />} />
              <Route path="/catalogue/allergies" element={<Navigate to="/gestion-cabinet/catalogue/allergies" replace />} />
            </Route>

              <Route element={<GestionCabinetPinGuard />}>
              <Route element={<RequireAnyPermission permissions={[PERMISSIONS.GESTION_CABINET, PERMISSIONS.LABORATORIES, PERMISSIONS.FOURNISSEURS, PERMISSIONS.EXPENSES, PERMISSIONS.INVENTORY, PERMISSIONS.CATALOGUE]} />}>
                <Route path="/gestion-cabinet" element={<GestionCabinet />} />
                <Route path="/gestion-cabinet/finance-logistique" element={<GestionCabinet section="finance_logistique" />} />
                <Route path="/gestion-cabinet/ressources-partenaires" element={<GestionCabinet section="ressources_partenaires" />} />
              </Route>

              <Route element={<RequirePermission permission={PERMISSIONS.CATALOGUE} />}>
                <Route path="/gestion-cabinet/catalogue" element={<Catalogue />} />
                <Route path="/gestion-cabinet/catalogue/medications" element={<Medications />} />
                <Route path="/gestion-cabinet/catalogue/treatments" element={<TreatmentCatalog />} />
                <Route path="/gestion-cabinet/catalogue/justifications" element={<JustificationContent />} />
                <Route path="/gestion-cabinet/catalogue/prosthetics" element={<ProstheticsSettings />} />
                <Route path="/gestion-cabinet/catalogue/materials" element={<MaterialsSettings />} />
                <Route path="/gestion-cabinet/catalogue/items" element={<Items />} />
                <Route path="/gestion-cabinet/catalogue/diseases" element={<DiseaseCatalog />} />
                <Route path="/gestion-cabinet/catalogue/allergies" element={<AllergyCatalog />} />
              </Route>

              <Route element={<RequirePermission permission={PERMISSIONS.GESTION_CABINET} />}>
                <Route path="/gestion-cabinet/finance" element={<Finance />} />
                <Route path="/gestion-cabinet/employees" element={<Employees />} />
                <Route path="/gestion-cabinet/employees/archived" element={<ArchivedEmployees />} />
                <Route path="/gestion-cabinet/employees/:id" element={<EmployeeDetails />} />
              </Route>

              <Route element={<RequirePermission permission={PERMISSIONS.LABORATORIES} />}>
                <Route path="/gestion-cabinet/laboratories" element={<Laboratory />} />
                <Route path="/gestion-cabinet/laboratories/archived" element={<ArchivedLaboratories />} />
                <Route path="/gestion-cabinet/laboratories/:id" element={<LaboratoryDetails />} />
              </Route>

              <Route element={<RequirePermission permission={PERMISSIONS.FOURNISSEURS} />}>
                <Route path="/gestion-cabinet/fournisseurs" element={<Fournisseurs />} />
                <Route path="/gestion-cabinet/fournisseurs/archived" element={<ArchivedFournisseurs />} />
                <Route path="/gestion-cabinet/fournisseurs/:id" element={<FournisseurDetails />} />
              </Route>

              <Route element={<RequirePermission permission={PERMISSIONS.EXPENSES} />}>
                <Route path="/gestion-cabinet/expenses" element={<Expenses />} />
              </Route>

              <Route element={<RequirePermission permission={PERMISSIONS.INVENTORY} />}>
                <Route path="/gestion-cabinet/inventory" element={<Inventory />} />
              </Route>
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.SETTINGS} />}>
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/preferences" element={<Preference />} />
              <Route path="/settings/patient-management" element={<PatientManagementSettings />} />
              <Route path="/settings/profile" element={<Profile />} />
              <Route path="/settings/security" element={<Security />} />
              <Route path="/settings/audit-logs" element={<AuditLogs />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.GESTION_CABINET} />}>
              <Route path="/settings/payments" element={<HandPaymentHistory />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.SUPPORT} />}>
              <Route path="/support" element={<SupportCenter />} />
              <Route path="/support/chat" element={<SupportChat />} />
            </Route>

            <Route element={<RequirePermission permission={PERMISSIONS.MESSAGING} />}>
              <Route path="/messagerie" element={<MessagingCenter />} />
            </Route>
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.CATALOGUE} />}>
            <Route path="/settings/medications" element={<Navigate to="/gestion-cabinet/catalogue/medications" replace />} />
            <Route path="/settings/treatments" element={<Navigate to="/gestion-cabinet/catalogue/treatments" replace />} />
            <Route path="/settings/justifications" element={<Navigate to="/gestion-cabinet/catalogue/justifications" replace />} />
            <Route path="/settings/prosthetics" element={<Navigate to="/gestion-cabinet/catalogue/prosthetics" replace />} />
            <Route path="/settings/materials" element={<Navigate to="/gestion-cabinet/catalogue/materials" replace />} />
            <Route path="/settings/items" element={<Navigate to="/gestion-cabinet/catalogue/items" replace />} />
          </Route>
        </Route>

        {/* Lab Protected Routes */}
        <Route element={<RequireAuth allowedRoles={["LAB"]} />}>
          <Route element={<LabLayout />}>
            <Route path="/lab" element={<Navigate to="/lab/prosthetics" replace />} />
            <Route path="/lab/prosthetics" element={<LabProsthetics />} />
            <Route path="/lab/pending" element={<LabPending />} />
            <Route path="/lab/payments" element={<LabPayments />} />
            <Route path="/lab/dentists" element={<LabDentists />} />
            <Route path="/lab/dentists/:id" element={<LabDentistDetails />} />
            <Route path="/lab/invitations" element={<LabInvitations />} />
            <Route path="/lab/messagerie" element={<MessagingCenter subtitle="Discutez avec vos dentistes partenaires" />} />
            <Route path="/lab/support" element={<SupportCenter />} />
            <Route path="/lab/support/chat" element={<SupportChat />} />
            <Route path="/lab/settings" element={<LabSettingsHome />} />
            <Route path="/lab/settings/profile" element={<LabSettings />} />
            <Route path="/lab/settings/security" element={<Security basePath="/lab/settings" />} />
            <Route path="/lab/settings/preferences" element={<Preference basePath="/lab/settings" showWorkingHours={false} />} />
          </Route>
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin-dashboard" element={<AdminDentistsHub />} />
            <Route path="/admin/dentists" element={<AdminDentistsHub />} />
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
             <Route path="/admin/messagerie" element={<AdminMessagingCenter />} />
             <Route path="/admin/support" element={<AdminSupportCenter />} />
             <Route path="/admin/support/chat" element={<AdminSupportChat />} />
             <Route path="/admin/support/feedback/:id" element={<AdminFeedbackDetails />} />
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



