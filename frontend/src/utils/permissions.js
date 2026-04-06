export const PERMISSIONS = {
  DASHBOARD: "DASHBOARD",
  APPOINTMENTS: "APPOINTMENTS",
  PATIENTS: "PATIENTS",
  DEVIS: "DEVIS",
  SUPPORT: "SUPPORT",
  CATALOGUE: "CATALOGUE",
  PROSTHESES: "PROSTHESES",
  GESTION_CABINET: "GESTION_CABINET",
  LABORATORIES: "LABORATORIES",
  FOURNISSEURS: "FOURNISSEURS",
  EXPENSES: "EXPENSES",
  INVENTORY: "INVENTORY",
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

export const isClinicEmployeeAccount = (user) => {
  return user?.role === "EMPLOYEE" || !!user?.ownerDentist || !!user?.ownerDentistId;
};

export const userHasPermission = (user, permission) => {
  if (!user || !permission) return false;
  if (user.role === "ADMIN") return true;
  if (isClinicOwnerDentist(user)) return true;
  // Employees/staff must not access the dashboard (even if it exists in legacy permissions).
  if (isClinicEmployeeAccount(user) && permission === PERMISSIONS.DASHBOARD) return false;
  // Employees/staff must not access Gestion Cabinet hub (finance/employees management).
  if (isClinicEmployeeAccount(user) && permission === PERMISSIONS.GESTION_CABINET) return false;
  // Support is always enabled for employees/staff (not configurable).
  if (isClinicEmployeeAccount(user) && permission === PERMISSIONS.SUPPORT) return true;
  // Employees must always be able to access their own settings.
  if (isClinicEmployeeAccount(user) && permission === PERMISSIONS.SETTINGS) return true;
  return getUserPermissions(user).includes(permission);
};
