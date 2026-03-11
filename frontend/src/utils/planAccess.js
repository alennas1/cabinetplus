const isDateExpired = (dateValue) => {
  if (!dateValue) return false;
  const endDate = new Date(dateValue);
  if (Number.isNaN(endDate.getTime())) return false;
  return endDate.getTime() < Date.now();
};

export const isPlanActiveForAccess = (user) => {
  if (!user) return false;

  const hasAssignedPlan = !!user.plan;
  const hasFutureExpiration =
    !!user.expirationDate && !isDateExpired(user.expirationDate);

  // If a plan is assigned and expiration is in the future, keep access even if a
  // renewal/upgrade request puts planStatus into WAITING.
  if (hasAssignedPlan && hasFutureExpiration) return true;

  // Fallback for plans that may not have expirationDate populated yet.
  if (user.planStatus === "ACTIVE" && hasAssignedPlan && !isDateExpired(user.expirationDate)) {
    return true;
  }

  return false;
};
