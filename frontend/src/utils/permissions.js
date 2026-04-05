export const PERMISSIONS = {
  DASHBOARD: "DASHBOARD",
  APPOINTMENTS: "APPOINTMENTS",
  PATIENTS: "PATIENTS",
  DEVIS: "DEVIS",
  SUPPORT: "SUPPORT",
  CATALOGUE: "CATALOGUE",
  PROSTHESES: "PROSTHESES",
  GESTION_CABINET: "GESTION_CABINET",
  SETTINGS: "SETTINGS",
};

export const getUserPermissions = (user) => {
  if (!user) return [];
  if (Array.isArray(user.permissions)) return user.permissions;
  return [];
};

export const isClinicOwnerDentist = (user) => {
  return user?.role === "DENTIST" && !user?.ownerDentist && !user?.ownerDentistId;
};

export const userHasPermission = (user, permission) => {
  if (!user || !permission) return false;
  if (user.role === "ADMIN") return true;
  if (isClinicOwnerDentist(user)) return true;
  return getUserPermissions(user).includes(permission);
};

