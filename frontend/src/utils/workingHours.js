export const WORKING_HOURS_MODES = {
  STANDARD: "standard",
  FULL_DAY: "full_day",
  CUSTOM: "custom",
};

export const DEFAULT_WORKING_HOURS = {
  mode: WORKING_HOURS_MODES.STANDARD,
  startTime: "08:00",
  endTime: "17:00",
};

export const TIME_FORMATS = {
  TWENTY_FOUR_HOURS: "24h",
  TWELVE_HOURS: "12h",
};

export const DEFAULT_TIME_FORMAT = TIME_FORMATS.TWENTY_FOUR_HOURS;

export const DATE_FORMATS = {
  DD_MM_YYYY_DASH: "dd-mm-yyyy",
  DD_MM_YYYY_SLASH: "dd/mm/yyyy",
};

export const DEFAULT_DATE_FORMAT = DATE_FORMATS.DD_MM_YYYY_SLASH;

export const MONEY_FORMATS = {
  SPACE_THOUSANDS: "space",
  COMMA_THOUSANDS: "comma",
  COMMA_THOUSANDS_CENTS: "comma_cents",
};

export const DEFAULT_MONEY_FORMAT = MONEY_FORMATS.SPACE_THOUSANDS;

export const CURRENCY_LABELS = {
  DA: "DA",
  DZD: "DZD",
  MAD: "MAD",
};

export const DEFAULT_CURRENCY_LABEL = CURRENCY_LABELS.DA;

let currentWorkingHours = { ...DEFAULT_WORKING_HOURS };
let currentTimeFormat = DEFAULT_TIME_FORMAT;
let currentDateFormat = DEFAULT_DATE_FORMAT;
let currentMoneyFormat = DEFAULT_MONEY_FORMAT;
let currentCurrencyLabel = DEFAULT_CURRENCY_LABEL;

const clampTime = (value, fallback) => {
  if (!/^\d{2}:\d{2}$/.test(value || "")) return fallback;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const normalizeWorkingHours = (value) => {
  const mode = Object.values(WORKING_HOURS_MODES).includes(value?.mode)
    ? value.mode
    : DEFAULT_WORKING_HOURS.mode;

  if (mode === WORKING_HOURS_MODES.FULL_DAY) {
    return {
      mode,
      startTime: "00:00",
      endTime: "23:59",
    };
  }

  const fallbackStart =
    mode === WORKING_HOURS_MODES.STANDARD
      ? DEFAULT_WORKING_HOURS.startTime
      : value?.startTime || DEFAULT_WORKING_HOURS.startTime;
  const fallbackEnd =
    mode === WORKING_HOURS_MODES.STANDARD
      ? DEFAULT_WORKING_HOURS.endTime
      : value?.endTime || DEFAULT_WORKING_HOURS.endTime;

  return {
    mode,
    startTime: clampTime(value?.startTime, fallbackStart),
    endTime: clampTime(value?.endTime, fallbackEnd),
  };
};

export const getWorkingHoursPreference = () => {
  return currentWorkingHours;
};

export const saveWorkingHoursPreference = (value) => {
  const normalized = normalizeWorkingHours(value);
  currentWorkingHours = normalized;
  window.dispatchEvent(new CustomEvent("workingHoursChanged", { detail: normalized }));
  return normalized;
};

export const parseTimeToMinutes = (time) => {
  const normalized = clampTime(time, "00:00");
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
};

export const getWorkingHoursWindow = () => {
  const preference = getWorkingHoursPreference();
  if (preference.mode === WORKING_HOURS_MODES.FULL_DAY) {
    return {
      ...preference,
      startMinutes: 0,
      endMinutes: 24 * 60,
    };
  }

  const startMinutes = parseTimeToMinutes(preference.startTime);
  const endMinutes = parseTimeToMinutes(preference.endTime);

  return {
    ...preference,
    startMinutes,
    endMinutes: Math.max(endMinutes, startMinutes + 15),
  };
};

export const buildDateAtMinutes = (baseDate, totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0
  );
};

export const getTimeFormatPreference = () => currentTimeFormat;

export const saveTimeFormatPreference = (value) => {
  const normalized = Object.values(TIME_FORMATS).includes(value) ? value : DEFAULT_TIME_FORMAT;
  currentTimeFormat = normalized;
  window.dispatchEvent(new CustomEvent("timeFormatChanged", { detail: normalized }));
  return normalized;
};

export const getDateFormatPreference = () => currentDateFormat;

export const saveDateFormatPreference = (value) => {
  const normalized = Object.values(DATE_FORMATS).includes(value) ? value : DEFAULT_DATE_FORMAT;
  currentDateFormat = normalized;
  window.dispatchEvent(new CustomEvent("dateFormatChanged", { detail: normalized }));
  return normalized;
};

export const getMoneyFormatPreference = () => currentMoneyFormat;

export const saveMoneyFormatPreference = (value) => {
  const normalized = Object.values(MONEY_FORMATS).includes(value) ? value : DEFAULT_MONEY_FORMAT;
  currentMoneyFormat = normalized;
  window.dispatchEvent(new CustomEvent("moneyFormatChanged", { detail: normalized }));
  return normalized;
};

export const getCurrencyLabelPreference = () => currentCurrencyLabel;

export const saveCurrencyLabelPreference = (value) => {
  const normalized = Object.values(CURRENCY_LABELS).includes(value) ? value : DEFAULT_CURRENCY_LABEL;
  currentCurrencyLabel = normalized;
  window.dispatchEvent(new CustomEvent("currencyLabelChanged", { detail: normalized }));
  return normalized;
};

export const applyStoredPreferences = ({ workingHours, timeFormat, dateFormat }) => {
  const normalizedWorkingHours = saveWorkingHoursPreference(workingHours || DEFAULT_WORKING_HOURS);
  const normalizedTimeFormat = saveTimeFormatPreference(timeFormat || DEFAULT_TIME_FORMAT);
  const normalizedDateFormat = saveDateFormatPreference(dateFormat || DEFAULT_DATE_FORMAT);
  return {
    workingHours: normalizedWorkingHours,
    timeFormat: normalizedTimeFormat,
    dateFormat: normalizedDateFormat,
  };
};

export const applyUserPreferences = (payload) => {
  if (!payload) {
    const applied = applyStoredPreferences({
      workingHours: DEFAULT_WORKING_HOURS,
      timeFormat: DEFAULT_TIME_FORMAT,
      dateFormat: DEFAULT_DATE_FORMAT,
    });
    const moneyFormat = saveMoneyFormatPreference(DEFAULT_MONEY_FORMAT);
    const currencyLabel = saveCurrencyLabelPreference(DEFAULT_CURRENCY_LABEL);
    return {
      ...applied,
      moneyFormat,
      currencyLabel,
    };
  }

  const applied = applyStoredPreferences({
    workingHours: {
      mode: payload.workingHoursMode,
      startTime: payload.workingHoursStart,
      endTime: payload.workingHoursEnd,
    },
    timeFormat: payload.timeFormat,
    dateFormat: payload.dateFormat,
  });

  const moneyFormat = saveMoneyFormatPreference(payload.moneyFormat);
  const currencyLabel = saveCurrencyLabelPreference(payload.currencyLabel);

  return {
    ...applied,
    moneyFormat,
    currencyLabel,
  };
};

export const buildPreferencePayload = () => {
  const workingHours = getWorkingHoursPreference();
  return {
    workingHoursMode: workingHours.mode,
    workingHoursStart: workingHours.startTime,
    workingHoursEnd: workingHours.endTime,
    timeFormat: getTimeFormatPreference(),
    dateFormat: getDateFormatPreference(),
    moneyFormat: getMoneyFormatPreference(),
    currencyLabel: getCurrencyLabelPreference(),
  };
};

export const formatHour = (value, timeFormat = getTimeFormatPreference()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === TIME_FORMATS.TWELVE_HOURS,
  });
};

export const formatMinutesLabel = (totalMinutes, timeFormat = getTimeFormatPreference()) => {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60) % 24;
  const minutes = safeMinutes % 60;
  const date = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return formatHour(date, timeFormat);
};
