export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/;

export const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,20}$/;

export const FIELD_LIMITS = Object.freeze({
  PERSON_NAME_MIN: 2,
  PERSON_NAME_MAX: 50,
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  PLAN_CODE_MIN: 2,
  PLAN_CODE_MAX: 20,
  PLAN_NAME_MIN: 2,
  PLAN_NAME_MAX: 60,
  TITLE_MIN: 2,
  TITLE_MAX: 80,
  NOTES_MAX: 500,
  MEDICATION_NAME_MIN: 2,
  MEDICATION_NAME_MAX: 80,
  MEDICATION_STRENGTH_MIN: 1,
  MEDICATION_STRENGTH_MAX: 30,
});

export const AGE_LIMITS = Object.freeze({
  MIN: 0,
  MAX: 120,
});

export const isStrongPassword = (value) =>
  STRONG_PASSWORD_REGEX.test(String(value ?? ""));

export const isValidUsername = (value) =>
  USERNAME_REGEX.test(String(value ?? "").trim());

export const trimText = (value) => String(value ?? "").trim();

export const isBlank = (value) => trimText(value).length === 0;

export const validateText = (
  value,
  { label = "Champ", required = false, minLength, maxLength } = {},
) => {
  const text = trimText(value);
  if (required && !text) return `${label} est obligatoire.`;
  if (!text) return "";
  if (typeof minLength === "number" && text.length < minLength) {
    return `${label} doit contenir au moins ${minLength} caractères.`;
  }
  if (typeof maxLength === "number" && text.length > maxLength) {
    return `${label} ne doit pas dépasser ${maxLength} caractères.`;
  }
  return "";
};

export const validateNumber = (
  value,
  { label = "Champ", required = false, min, max, integer = false } = {},
) => {
  const raw = String(value ?? "").trim();
  if (required && !raw) return `${label} est obligatoire.`;
  if (!raw) return "";
  const num = Number(raw);
  if (!Number.isFinite(num)) return `${label} est invalide.`;
  if (integer && !Number.isInteger(num)) return `${label} doit être un nombre entier.`;
  if (typeof min === "number" && num < min) return `${label} doit être ≥ ${min}.`;
  if (typeof max === "number" && num > max) return `${label} doit être ≤ ${max}.`;
  return "";
};

export const validateAge = (value, { required = false } = {}) =>
  validateNumber(value, {
    label: "Âge",
    required,
    min: AGE_LIMITS.MIN,
    max: AGE_LIMITS.MAX,
    integer: true,
  });
