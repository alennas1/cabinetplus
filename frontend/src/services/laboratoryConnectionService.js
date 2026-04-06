import api from "./authService";

export const inviteLaboratoryConnection = async ({ labPublicId, mergeFromLaboratoryId } = {}) => {
  const payload = { labPublicId };
  if (mergeFromLaboratoryId) payload.mergeFromLaboratoryId = mergeFromLaboratoryId;
  const { data } = await api.post("/api/laboratory-connections/invite", payload);
  return data;
};

