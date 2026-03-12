import { formatDateByPreference } from "./dateFormat";
import { getCurrencyLabelPreference, getMoneyFormatPreference, MONEY_FORMATS } from "./workingHours";

export const formatDate = (value) => formatDateByPreference(value);

const formatNumberWithSeparator = (value, separator) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

export const formatMoney = (value, moneyFormat = getMoneyFormatPreference()) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "0";

  const isNegative = numeric < 0;
  const abs = Math.abs(numeric);

  let formatted;
  if (moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS_CENTS) {
    const [intPart, decPart] = abs.toFixed(2).split(".");
    formatted = `${formatNumberWithSeparator(intPart, ",")}.${decPart}`;
  } else {
    const rounded = Math.round(abs);
    const separator =
      moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS ? "," : " ";
    formatted = formatNumberWithSeparator(String(rounded), separator);
  }

  return isNegative ? `-${formatted}` : formatted;
};

export const formatMoneyWithLabel = (
  value,
  moneyFormat = getMoneyFormatPreference(),
  currencyLabel = getCurrencyLabelPreference()
) => `${formatMoney(value, moneyFormat)} ${currencyLabel}`;

export const currency = (v) => formatMoneyWithLabel(v);
