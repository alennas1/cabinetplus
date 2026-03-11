export const CLINIC_ROLES = {
  DENTIST: "DENTIST",
  PARTNER_DENTIST: "PARTNER_DENTIST",
  ASSISTANT: "ASSISTANT",
  RECEPTION: "RECEPTION",
};

export const getClinicRole = (user) => {
  if (!user) return null;
  if (user.role === "ADMIN") return "ADMIN";
  if (user.clinicAccessRole) return user.clinicAccessRole;

  // Backward compatibility for existing staff accounts created before clinicAccessRole.
  // If linked to an owner dentist, treat as staff by default.
  if (user.ownerDentist || user.ownerDentistId) return CLINIC_ROLES.RECEPTION;

  return CLINIC_ROLES.DENTIST;
};

export const hasClinicRole = (user, allowedRoles = []) => {
  const role = getClinicRole(user);
  return !!role && allowedRoles.includes(role);
};
