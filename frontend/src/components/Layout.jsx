import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import PlanLimitBanner from "./PlanLimitBanner";
import "./Layout.css";

const Layout = () => {
  return (
    <div className="layout-container">
      <Sidebar className="sidebar" /> {/* fixed sidebar */}
      <div className="content">
        <PlanLimitBanner />
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
