// Notification.jsx
import React from "react";
import PageHeader from "../components/PageHeader";

const Notification = () => {
  return (
    <div className="settings-container">
      <PageHeader title="Notifications" subtitle="Gérer vos notifications" />
      <div className="settings-content">
        <p>Préférences de notifications à ajouter ici...</p>
      </div>
    </div>
  );
};

export default Notification;
