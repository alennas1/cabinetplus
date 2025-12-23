import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "./store/authSlice";

// --- Page Imports ---
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Settings from "./pages/Settings";
import Unauthorized from "./pages/Unauthorized";
import Patient from "./pages/Patient";
import Medications from "./pages/Medications";
import TreatmentCatalog from "./pages/Treatments";
import Preference from "./pages/Preference";
import Profile from "./pages/Profile";
import Security from "./pages/Security";
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

// --- ADMIN PAGE Imports ---
import DentistsPage from "./pages/Dentists"; 
import PendingPaymentsPage from "./pages/PendingPayments"; 
import PaymentHistoryPage from "./pages/PaymentHistory"; 
import ExpiringPlansPage from "./pages/EndingPlans"; 
import AdminSettings from "./pages/AdminSettings"; 
import AdminFinance from "./pages/AdminFinance";
import ManageAdmins from "./pages/ManageAdmins";
import AdminChangePassword from "./pages/AdminChangePassword";
import ManagePlans from "./pages/ManagePlans";

// --- Component Imports ---
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import RequireAuth from "./components/RequireAuth"; 
import SessionExpiredModal from "./components/SessionExpiredModal";

import "./index.css";

// Separate the navigation logic into a wrapper to use hooks like useNavigate
const AppContent = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth); 
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Session Expired Listener ---
  // This ensures that if the refresh token fails (authService catches it),
  // the app cleans up the state and sends the user to login.
// Inside AppContent component in App.js
useEffect(() => {
  const handleSessionExpired = () => {
    // 1. Clear Redux state so RequireAuth triggers redirect
    dispatch(sessionExpired());
    
    // 2. Redirect to login with a state flag to show the modal/alert
    navigate("/login", { 
      replace: true, 
      state: { reason: "session_expired" } 
    });
  };

  window.addEventListener("sessionExpired", handleSessionExpired);
  return () => window.removeEventListener("sessionExpired", handleSessionExpired);
}, [dispatch, navigate]);

  const getRedirectPath = (user) => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin-dashboard";

    if (!user.isPhoneVerified) return "/verify";
    if (user.planStatus === "WAITING") return "/waiting";
    if (user.planStatus !== "ACTIVE") return "/plan";

    return "/dashboard";
  };

  const RootRedirect = () => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Navigate to={getRedirectPath(user)} replace />;
  };

  const CatchAllRedirect = () => {
    if (!isAuthenticated) return <Navigate to="/login" replace />; 
    return <Navigate to={getRedirectPath(user)} replace />;
  };

  return (
    <div className="app-container">
      <SessionExpiredModal />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Dentist Routes */}
        <Route element={<RequireAuth allowedRoles={["DENTIST"]} />}>
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/waiting" element={<WaitingPage />} />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<Patient />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/medications" element={<Medications />} />
            <Route path="/settings/treatments" element={<TreatmentCatalog />} />
            <Route path="/settings/items" element={<Items />} />
            <Route path="/settings/preferences" element={<Preference />} />
            <Route path="/settings/profile" element={<Profile />} />
            <Route path="/settings/security" element={<Security />} />
            <Route path="/settings/payments" element={<HandPaymentHistory />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/patients/:id/ordonnance/:ordonnanceId" element={<Ordonnance />} />
            <Route path="/patients/:id/ordonnance/create" element={<Ordonnance />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetails />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
          <Route element={<AdminLayout />}>
          <Route path="/admin-dashboard" element={<DentistsPage />} />
            <Route path="/dentists" element={<DentistsPage />} />
            <Route path="/pending-payments" element={<PendingPaymentsPage />} />
            <Route path="/payment-history" element={<PaymentHistoryPage />} />
            <Route path="/expiring-plans" element={<ExpiringPlansPage />} />
            <Route path="/settings-admin" element={<AdminSettings />} />
            <Route path="/finance-admin" element={<AdminFinance />} />
            <Route path="/admin/manage-admins" element={<ManageAdmins />} />
            <Route path="/admin/change-password" element={<AdminChangePassword />} />
            <Route path="/admin/manage-plans" element={<ManagePlans />} />
          </Route>
        </Route>

        <Route index element={<RootRedirect />} />
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </div>
  );
};

// Router must wrap AppContent so useNavigate is available
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;