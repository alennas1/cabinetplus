import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const SupportChat = () => {
  const location = useLocation();
  const isLab = String(location?.pathname || "").startsWith("/lab/");
  return <Navigate to={isLab ? "/lab/support" : "/support"} replace />;
};

export default SupportChat;

