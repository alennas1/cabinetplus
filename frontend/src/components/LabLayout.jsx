import React from "react";
import { Outlet } from "react-router-dom";
import SidebarLab from "./SidebarLab";
import NotificationBell from "./NotificationBell";
import "./Layout.css";

const LabLayout = () => {
  return (
    <div className="layout-container">
      <SidebarLab className="sidebar" />
      <div className="content">
        <NotificationBell variant="top" />
        <Outlet />
      </div>
    </div>
  );
};

export default LabLayout;
