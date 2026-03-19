export const getApiErrorMessage = (error, fallback = "Une erreur est survenue") => {
  const clean = (message) => {
    if (typeof message !== "string") return "";
    const trimmed = message.trim();
    return trimmed || "";
  };

  if (!error) return fallback;

  if (error.response) {
    const data = error.response.data;

    if (typeof data === "string" && data.trim()) {
      return clean(data) || fallback;
    }

    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error.trim()) return clean(data.error) || fallback;
      if (typeof data.message === "string" && data.message.trim()) return clean(data.message) || fallback;

      if (data.fieldErrors && typeof data.fieldErrors === "object") {
        // Prefer the global form-level error (our backend envelope uses "_").
        if (typeof data.fieldErrors._ === "string" && data.fieldErrors._.trim()) {
          return clean(data.fieldErrors._) || fallback;
        }
        const firstFieldError = Object.entries(data.fieldErrors).find(
          ([, value]) => typeof value === "string" && value.trim().length > 0
        );
        if (firstFieldError) return clean(firstFieldError[1]) || fallback;
      }

      // Support validation maps like { field: message } from Spring @Valid handlers.
      const firstFieldMessage = Object.entries(data).find(
        ([key, value]) =>
          key !== "status" &&
          key !== "path" &&
          typeof value === "string" &&
          value.trim().length > 0
      );
      if (firstFieldMessage) return clean(firstFieldMessage[1]) || fallback;
    }
  }

  if (error.request) return "Impossible de contacter le serveur";
  if (typeof error.message === "string" && error.message.trim()) return clean(error.message) || fallback;

  return fallback;
};

export const getApiFieldErrors = (error) => {
  const data = error?.response?.data;
  const fieldErrors = data?.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object" || Array.isArray(fieldErrors)) return {};
  return fieldErrors;
};
