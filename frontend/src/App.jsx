import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

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
import AdminDashboard from "./pages/AdminDashboard"; 
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

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth); 

  // Centralized redirection logic for root and catch-all
  const getRedirectPath = (user) => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin-dashboard";

    // Detailed check for Dentists (must be synchronized with RequireAuth logic)
    const isVerified = user.isEmailVerified && user.isPhoneVerified;
    if (!isVerified) return "/verify";
    
    // If verified but not active/pending/waiting, go to plan selection
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
    <Router>
      <SessionExpiredModal />
      <div className="app-container">
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ---------------------------------------------------- */}
          {/* DENTIST PROTECTED ROUTES (All dentist access is controlled here) */}
          {/* ---------------------------------------------------- */}
          <Route element={<RequireAuth allowedRoles={["DENTIST"]} />}>
            
            {/* 1. INTERMEDIATE PAGES (Requires Auth, but not full verification/plan) */}
            <Route path="/verify" element={<VerificationPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/waiting" element={<WaitingPage />} />

            {/* 2. MAIN APP PAGES (Requires Auth AND full verification/active plan) */}
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

          {/* ADMIN PROTECTED ROUTES */}
          <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
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

          {/* ROOT & CATCH-ALL */}
          <Route index element={<RootRedirect />} />
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;