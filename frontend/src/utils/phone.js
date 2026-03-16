const coerceDzLocalDigits = (digits) => {
  const d = String(digits || "").replace(/\D/g, "");
  if (!d) return "";

  // If stored as +213XXXXXXXXX (common), convert to 0XXXXXXXXX
  if (d.startsWith("213") && d.length === 12) {
    return `0${d.slice(3)}`;
  }
  return d;
};

export const normalizePhoneInput = (value) => {
  const digits = coerceDzLocalDigits(String(value ?? "").replace(/\D/g, ""));
  if (!digits) return "";

  // Keep only the first 10 digits (DZ local format)
  return digits.slice(0, 10);
};

export const isValidPhoneNumber = (value) => {
  const digits = normalizePhoneInput(value);
  return digits.length === 10 && digits.startsWith("0");
};

// Account phone number validation (used for login / OTP flows).
// Backend expects a DZ mobile number: 05/06/07XXXXXXXX.
export const isValidDzMobilePhoneNumber = (value) => {
  const digits = normalizePhoneInput(value);
  return /^0[5-7]\d{8}$/.test(digits);
};

export const formatPhoneNumber = (value) => {
  const digits = normalizePhoneInput(value);
  if (!digits) return "";
  if (digits.length !== 10 || !digits.startsWith("0")) return String(value ?? "");

  // 05 51 51 51 51
  return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
};

export const formatPhoneInputWithCaret = (raw, caretPos = raw?.length ?? 0) => {
  const str = String(raw ?? "");
  const caret = typeof caretPos === "number" ? caretPos : str.length;

  const before = str.slice(0, caret);
  const digitsBeforeCaret = normalizePhoneInput(before).length;

  const digits = normalizePhoneInput(str);
  const grouped = digits.match(/.{1,2}/g)?.join(" ") ?? "";

  const spacesBeforeCaret =
    digitsBeforeCaret > 0 ? Math.floor((digitsBeforeCaret - 1) / 2) : 0;
  const nextCaret = Math.min(grouped.length, digitsBeforeCaret + spacesBeforeCaret);

  return { formatted: grouped, caretPos: nextCaret };
};
