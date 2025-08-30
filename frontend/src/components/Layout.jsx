import React from "react";
import Sidebar from "./Sidebar";  // Import Sidebar component
import { Outlet } from "react-router-dom";  // Renders the child components like Dashboard
import './Layout.css';  // Ensure to link this CSS file

const Layout = () => {
  return (
    <div className="layout-container">
      <Sidebar />  {/* Sidebar stays on the left */}
      <div className="content">
        <Outlet />  {/* Child components like Dashboard, Patients, etc. will be rendered here */}
      </div>
    </div>
  );
};

export default Layout;
