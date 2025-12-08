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

// --- NEW PAGE IMPORTS ---
import VerificationPage from "./pages/VerificationPage"; 
import PlanPage from "./pages/PlanPage";             

// --- Component Imports ---
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth"; // This is your updated ProtectedRoute
import SessionExpiredModal from "./components/SessionExpiredModal";

import "./index.css";

function App() {
  // Get authentication status from Redux
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Router>
      <SessionExpiredModal /> {/* global modal */}
      <div className="app-container">
        <Routes>
          {/* ======================================= */}
          {/* PUBLIC/GATED ROUTES           */}
          {/* ======================================= */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* NEW GATED PAGES: Users are redirected here by login/RequireAuth logic */}
          <Route path="/verify" element={<VerificationPage />} /> 
          <Route path="/plan" element={<PlanPage />} />          

          {/* ======================================= */}
          {/* PROTECTED ROUTES              */}
          {/* ======================================= */}
          {/* RequireAuth component enforces JWT claims checks (verification, plan status) */}
          <Route element={<RequireAuth />}>
            {/* Layout wraps all pages that use the sidebar/header */}
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
          {/* DEFAULT & CATCH-ALL         */}
          {/* ======================================= */}
          <Route
            path="/"
            // Redirects root path based on simple authentication status
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;