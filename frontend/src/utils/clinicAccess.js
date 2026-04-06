export const CLINIC_ROLES = {
  DENTIST: "DENTIST",
  EMPLOYEE: "EMPLOYEE",
  LAB: "LAB",
};

export const getClinicRole = (user) => {
  if (!user) return null;
  if (user.role === "ADMIN") return "ADMIN";
  if (user.role === "EMPLOYEE") return CLINIC_ROLES.EMPLOYEE;
  if (user.role === "LAB") return CLINIC_ROLES.LAB;

  // Backward compatibility: legacy staff accounts may still come as role=DENTIST with ownerDentist.
  if (user.ownerDentist || user.ownerDentistId) return CLINIC_ROLES.EMPLOYEE;

  return CLINIC_ROLES.DENTIST;
};

export const hasClinicRole = (user, allowedRoles = []) => {
  const role = getClinicRole(user);
  return !!role && allowedRoles.includes(role);
};
