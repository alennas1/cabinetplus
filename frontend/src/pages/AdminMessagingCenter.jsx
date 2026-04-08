import React from "react";
import MessagingCenter from "./MessagingCenter";

const AdminMessagingCenter = () => {
  return (
    <MessagingCenter
      title="Messagerie"
      subtitle="Messagerie interne entre admins"
      forcedContactType="ADMIN"
      hideContactTypeSelector
      enableAdminGroup
    />
  );
};

export default AdminMessagingCenter;

