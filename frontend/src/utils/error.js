export const getApiErrorMessage = (error, fallback = "Une erreur est survenue") => {
  const normalizeUserMessage = (message) => {
    if (typeof message !== "string") return "";
    const trimmed = message.trim();
    if (!trimmed) return "";

    const lower = trimmed.toLowerCase();

    if (lower.includes("data integrity violation")) {
      return "Operation impossible: cet element est lie a d'autres donnees";
    }
    if (lower.includes("validation failed")) {
      return "Certaines informations sont invalides";
    }
    if (lower.includes("internal server error")) {
      return "Une erreur interne est survenue";
    }
    if (lower.includes("access denied")) {
      return "Acces refuse";
    }
    if (lower.includes("user not found") || lower.includes("current user not found")) {
      return "Utilisateur introuvable";
    }
    if (lower.includes("patient not found")) return "Patient introuvable";
    if (lower.includes("plan not found")) return "Plan introuvable";
    if (lower.includes("payment not found")) return "Paiement introuvable";
    if (lower.includes("template not found")) return "Modele introuvable";
    if (lower.includes("laboratory not found")) return "Laboratoire introuvable";
    if (lower.includes("employee not found")) return "Employe introuvable";
    if (lower.includes("username already exists")) return "Ce nom d'utilisateur est deja utilise";
    if (lower.includes("email already exists")) return "Cet email est deja utilise";
    if (lower.includes("appointment overlaps with existing appointments")) {
      return "Ce rendez-vous chevauche un autre rendez-vous";
    }
    if (lower.includes("payment is already processed")) return "Ce paiement est deja traite";

    return trimmed;
  };

  if (!error) return fallback;

  if (error.response) {
    const data = error.response.data;

    if (typeof data === "string" && data.trim()) {
      return normalizeUserMessage(data);
    }

    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error.trim()) return normalizeUserMessage(data.error);
      if (typeof data.message === "string" && data.message.trim()) return normalizeUserMessage(data.message);

      // Support validation maps like { field: message } from Spring @Valid handlers.
      const firstFieldMessage = Object.entries(data).find(
        ([key, value]) =>
          key !== "status" &&
          key !== "path" &&
          typeof value === "string" &&
          value.trim().length > 0
      );
      if (firstFieldMessage) return normalizeUserMessage(firstFieldMessage[1]);
    }
  }

  if (error.request) return "Impossible de contacter le serveur";
  if (typeof error.message === "string" && error.message.trim()) return normalizeUserMessage(error.message);

  return fallback;
};
