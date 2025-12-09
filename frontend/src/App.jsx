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
import AdminDashboard from "./pages/AdminDashboard"; 

// --- ADMIN PAGE Imports (Placeholders - ensure you create these!) ---
import DentistsPage from "./pages/Dentists"; // Assuming Dentists management page
import PendingPaymentsPage from "./pages/PendingPayments"; // Assuming Pending Payments page
import PaymentHistoryPage from "./pages/PaymentHistory"; // Assuming Payment History page
import ExpiringPlansPage from "./pages/EndingPlans"; // Assuming Expiring Plans page
import AdminSettings from "./pages/AdminSettings"; // Reusing Settings for Admin

// --- Component Imports ---
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout"; // <-- NEW IMPORT
import RequireAuth from "./components/RequireAuth"; 
import SessionExpiredModal from "./components/SessionExpiredModal";

import "./index.css";

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth); 

  // Handles the root '/' redirect
  const RootRedirect = () => {
    if (!isAuthenticated || !user) {
      return <Navigate to="/login" replace />;
    }
    if (user.role === "ADMIN") {
      return <Navigate to="/admin-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  };

  // Handles all non-existent routes
  const CatchAllRedirect = () => {
    if (!isAuthenticated || !user) {
      return <Navigate to="/login" replace />; 
    }
    if (user.role === "ADMIN") {
      return <Navigate to="/admin-dashboard" replace />; 
    }
    return <Navigate to="/dashboard" replace />;
  };

  return (
    <Router>
      <SessionExpiredModal /> 
      <div className="app-container">
        <Routes>
          {/* ======================================= */}
          {/* PUBLIC/GATED ROUTES */}
          {/* ======================================= */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/verify" element={<VerificationPage />} /> 
          <Route path="/plan" element={<PlanPage />} />          

          {/* ======================================= */}
          {/* DENTIST PROTECTED ROUTES (uses Layout) */}
          {/* ======================================= */}
          <Route element={<RequireAuth allowedRoles={["DENTIST"]} />}>
            <Route element={<Layout />}> {/* Layout uses the DENTIST Sidebar */}
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
              <Route path="/finance" element={<Finance />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/patients/:id/ordonnance/:ordonnanceId" element={<Ordonnance />} />
              <Route path="/patients/:id/ordonnance/create" element={<Ordonnance />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/:id" element={<EmployeeDetails />} />
            </Route>
          </Route>
          
          {/* ======================================= */}
          {/* ADMIN PROTECTED ROUTES (uses AdminLayout) */}
          {/* ======================================= */}
          <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
            <Route element={<AdminLayout />}> {/* AdminLayout uses the ADMIN Sidebar */}
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              {/* ADMIN-SPECIFIC ROUTES (Matching the SidebarAdmin links) */}
              <Route path="/dentists" element={<DentistsPage />} />
              <Route path="/pending-payments" element={<PendingPaymentsPage />} />
              <Route path="/payment-history" element={<PaymentHistoryPage />} />
              <Route path="/expiring-plans" element={<ExpiringPlansPage />} />
              <Route path="/settings-admin" element={<AdminSettings />} /> {/* Reusing Settings page */}
              {/* Note: Employees routes might also be needed here for Admin management */}
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/:id" element={<EmployeeDetails />} />
            </Route>
          </Route>

          {/* ======================================= */}
          {/* ROOT & CATCH-ALL REDIRECT */}
          {/* ======================================= */}
          <Route index element={<RootRedirect />} />
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;