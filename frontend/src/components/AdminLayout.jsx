// File: src/components/AdminLayout.jsx
import React from "react";
import SidebarAdmin from "./SidebarAdmin"; // Assuming you name the new admin sidebar component this
import { Outlet } from "react-router-dom";
import "./Layout.css"; // Reuse the existing CSS file

const AdminLayout = () => {
  return (
    <div className="layout-container">
      <SidebarAdmin className="sidebar" /> {/* Use the dedicated Admin Sidebar */}
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;