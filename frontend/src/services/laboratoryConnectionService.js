import api from "./authService";

export const inviteLaboratoryConnection = async ({ labInviteCode, mergeFromLaboratoryId } = {}) => {
  const payload = { labInviteCode };
  if (mergeFromLaboratoryId) payload.mergeFromLaboratoryId = mergeFromLaboratoryId;
  const { data } = await api.post("/api/laboratory-connections/invite", payload);
  return data;
};
