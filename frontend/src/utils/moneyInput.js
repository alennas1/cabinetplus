import { formatMoney } from "./format";
import { getMoneyFormatPreference, MONEY_FORMATS } from "./workingHours";

const keepLeadingSign = (value) => {
  const negative = value.trim().startsWith("-");
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return `${negative ? "-" : ""}${digitsOnly}`;
};

const formatIntDigits = (digits, moneyFormat) => {
  if (!digits) return "";
  const negative = digits.startsWith("-");
  const absDigits = negative ? digits.slice(1) : digits;
  const separator = moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS ? "," : " ";
  const grouped = absDigits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return negative ? `-${grouped}` : grouped;
};

export const parseMoneyInput = (value, moneyFormat = getMoneyFormatPreference()) => {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;

  if (moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS_CENTS) {
    const cleaned = raw.replace(/\s+/g, "").replace(/[^\d.,-]/g, "");
    const negative = cleaned.startsWith("-");
    const unsigned = cleaned.replace(/-/g, "");

    const lastDot = unsigned.lastIndexOf(".");
    const lastComma = unsigned.lastIndexOf(",");
    const lastSep = Math.max(lastDot, lastComma);

    let intPartRaw = unsigned;
    let decPartRaw = "";
    if (lastSep >= 0) {
      intPartRaw = unsigned.slice(0, lastSep);
      decPartRaw = unsigned.slice(lastSep + 1);
    }

    const intDigits = intPartRaw.replace(/\D/g, "") || "0";
    const decDigits = decPartRaw.replace(/\D/g, "").slice(0, 2);
    const normalized = decDigits.length > 0 ? `${intDigits}.${decDigits}` : intDigits;
    const num = Number(normalized);
    return Number.isNaN(num) ? 0 : negative ? -num : num;
  }

  const intDigits = keepLeadingSign(raw);
  const num = Number(intDigits);
  return Number.isNaN(num) ? 0 : num;
};

export const formatMoneyInputWithCaret = (
  raw,
  caretPos = raw?.length ?? 0,
  moneyFormat = getMoneyFormatPreference()
) => {
  const str = String(raw ?? "");
  const caret = typeof caretPos === "number" ? caretPos : str.length;

  if (!str.trim()) return { formatted: "", caretPos: 0 };

  if (moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS_CENTS) {
    const cleaned = str.replace(/[^\d.,-]/g, "");
    const negative = cleaned.startsWith("-");
    const unsigned = cleaned.replace(/-/g, "");
    const lastDot = unsigned.lastIndexOf(".");
    const lastComma = unsigned.lastIndexOf(",");
    const lastSep = Math.max(lastDot, lastComma);

    const rawSepIndex = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
    const caretInCleaned = Math.min(caret, cleaned.length);
    const caretBeforeSep = rawSepIndex >= 0 ? caretInCleaned <= rawSepIndex : true;

    let intPartRaw = unsigned;
    let decPartRaw = "";
    if (lastSep >= 0) {
      intPartRaw = unsigned.slice(0, lastSep);
      decPartRaw = unsigned.slice(lastSep + 1);
    }

    const intDigits = intPartRaw.replace(/\D/g, "");
    const decDigits = decPartRaw.replace(/\D/g, "").slice(0, 2);

    const formattedInt = formatIntDigits(`${negative ? "-" : ""}${intDigits}`, MONEY_FORMATS.COMMA_THOUSANDS);
    const formatted = decDigits.length > 0 || rawSepIndex >= 0 ? `${formattedInt}.${decDigits}` : formattedInt;

    const digitsBeforeCaret = cleaned.slice(0, caretInCleaned).replace(/\D/g, "").length;
    if (caretBeforeSep) {
      let seen = 0;
      let outPos = 0;
      while (outPos < formattedInt.length && seen < digitsBeforeCaret) {
        if (/\d/.test(formattedInt[outPos])) seen += 1;
        outPos += 1;
      }
      return { formatted, caretPos: outPos };
    }

    const intDigitsCount = intDigits.length;
    const decDigitsBeforeCaret = Math.max(0, digitsBeforeCaret - intDigitsCount);
    const base = formattedInt.length + 1; // decimal dot
    return { formatted, caretPos: Math.min(base + decDigitsBeforeCaret, formatted.length) };
  }

  const before = str.slice(0, caret);
  const digitsBeforeCaret = before.replace(/\D/g, "").length;
  const normalizedDigits = keepLeadingSign(str);
  const formatted = normalizedDigits ? formatIntDigits(normalizedDigits, moneyFormat) : "";

  if (!formatted) return { formatted: "", caretPos: 0 };

  let seen = 0;
  let outPos = 0;
  while (outPos < formatted.length && seen < digitsBeforeCaret) {
    if (/\d/.test(formatted[outPos])) seen += 1;
    outPos += 1;
  }

  return { formatted, caretPos: outPos };
};

export const formatMoneyInput = (raw, moneyFormat = getMoneyFormatPreference()) =>
  formatMoneyInputWithCaret(raw, String(raw ?? "").length, moneyFormat).formatted;

export const formatMoneyInputFromNumber = (value, moneyFormat = getMoneyFormatPreference()) =>
  formatMoney(value, moneyFormat);
