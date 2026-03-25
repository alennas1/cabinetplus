import { DATE_FORMATS, getDateFormatPreference } from "./workingHours";

import { formatHour } from "./workingHours";

const pad2 = (value) => String(value).padStart(2, "0");

const parseDateLike = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value);

  // Avoid timezone shift for date-only strings.
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateByPreference = (value, dateFormat = getDateFormatPreference(), locale = "fr-FR") => {
  const date = parseDateLike(value);
  if (!date) return "-";

  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear());

  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH) return `${day}-${month}-${year}`;
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH) return `${day}/${month}/${year}`;

  return `${day}/${month}/${year}`;
};

export const formatDayMonthByPreference = (value, dateFormat = getDateFormatPreference(), locale = "fr-FR") => {
  const date = parseDateLike(value);
  if (!date) return "-";

  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);

  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH) return `${day}-${month}`;
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH) return `${day}/${month}`;

  return `${day}/${month}`;
};

export const formatDateTimeByPreference = (value, dateFormat = getDateFormatPreference(), locale = "fr-FR") => {
  const date = parseDateLike(value);
  if (!date) return "-";

  const dateLabel = formatDateByPreference(date, dateFormat, locale);
  const timeLabel = formatHour(date);
  return timeLabel ? `${dateLabel} ${timeLabel}` : dateLabel;
};

export const formatMonthYearByPreference = (value, dateFormat = getDateFormatPreference(), locale = "fr-FR") => {
  const date = parseDateLike(value);
  if (!date) return "-";

  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear());

  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH) return `${month}-${year}`;
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH) return `${month}/${year}`;

  return `${month}/${year}`;
};


