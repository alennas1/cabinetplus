import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as RdrCalendar } from "react-date-range";
import { format, isValid, parse, parseISO } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "react-feather";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import "./DateInput.css";
import { DATE_FORMATS, TIME_FORMATS, getDateFormatPreference, getTimeFormatPreference } from "../utils/workingHours";

const POPOVER_WIDTH = 360;
const POPOVER_ESTIMATED_HEIGHT = 440;
const VIEWPORT_GUTTER = 8;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseIsoDateTime(value) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function parseAnyDateTime(value) {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = parseIsoDateTime(trimmed);
  if (iso) return iso;

  const candidates = [
    parse(trimmed, "dd/MM/yyyy HH:mm", new Date(), { locale: fr }),
    parse(trimmed, "dd-MM-yyyy HH:mm", new Date(), { locale: fr }),
    parse(trimmed, "dd MMMM yyyy HH:mm", new Date(), { locale: fr }),
    parse(trimmed, "dd/MM/yyyy hh:mm a", new Date(), { locale: enUS }),
    parse(trimmed, "dd-MM-yyyy hh:mm a", new Date(), { locale: enUS }),
    parse(trimmed, "dd MMMM yyyy hh:mm a", new Date(), { locale: fr }),
    parse(trimmed, "yyyy-MM-dd HH:mm", new Date(), { locale: fr }),
  ];

  return candidates.find((d) => isValid(d)) || null;
}

function formatIsoDateTime(date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function makeSyntheticEvent({ name, value }) {
  return {
    target: { name, value },
    currentTarget: { name, value },
  };
}

function withTime(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour);
  next.setMinutes(minute);
  next.setSeconds(0);
  next.setMilliseconds(0);
  return next;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function getPreferencePattern(dateFormat) {
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH) return "dd-MM-yyyy";
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH) return "dd/MM/yyyy";
  return "dd/MM/yyyy";
}

function getPlaceholder(dateFormat, timeFormat) {
  const date =
    dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH
      ? "DD-MM-YYYY"
      : dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH
        ? "DD/MM/YYYY"
        : "DD/MM/YYYY";
  const time = timeFormat === TIME_FORMATS.TWELVE_HOURS ? "hh:mm AM" : "HH:mm";
  return `${date} ${time}`;
}

function formatByPreference(date, dateFormat, timeFormat) {
  if (!date) return "";
  const dateLabel = format(date, getPreferencePattern(dateFormat), { locale: fr });
  const timeLabel =
    timeFormat === TIME_FORMATS.TWELVE_HOURS
      ? format(date, "hh:mm a", { locale: enUS })
      : format(date, "HH:mm", { locale: fr });
  return `${dateLabel} ${timeLabel}`;
}

function useDateTimePreferences() {
  const [dateFormat, setDateFormat] = useState(() => getDateFormatPreference());
  const [timeFormat, setTimeFormat] = useState(() => getTimeFormatPreference());

  useEffect(() => {
    const onDate = (e) => setDateFormat(e?.detail || getDateFormatPreference());
    const onTime = (e) => setTimeFormat(e?.detail || getTimeFormatPreference());
    window.addEventListener("dateFormatChanged", onDate);
    window.addEventListener("timeFormatChanged", onTime);
    return () => {
      window.removeEventListener("dateFormatChanged", onDate);
      window.removeEventListener("timeFormatChanged", onTime);
    };
  }, []);

  return { dateFormat, timeFormat };
}

export default function DateTimeInput({
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  clearable = true,
  required = false,
  className = "",
}) {
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [popoverReady, setPopoverReady] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [draft, setDraft] = useState(value || "");
  const [isEditing, setIsEditing] = useState(false);

  const { dateFormat, timeFormat } = useDateTimePreferences();

  const selectedDateTime = useMemo(() => parseIsoDateTime(value), [value]);
  const draftDateTime = useMemo(() => parseAnyDateTime(draft), [draft]);
  const uiDateTime = draftDateTime || selectedDateTime || new Date();

  useEffect(() => {
    if (isEditing) return;
    setDraft(selectedDateTime ? formatByPreference(selectedDateTime, dateFormat, timeFormat) : "");
  }, [value, isEditing, selectedDateTime, dateFormat, timeFormat]);

  const [hour, minute] = useMemo(() => {
    return [String(uiDateTime.getHours()).padStart(2, "0"), String(uiDateTime.getMinutes()).padStart(2, "0")];
  }, [uiDateTime]);

  const calculatePopoverPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return { top: VIEWPORT_GUTTER, left: VIEWPORT_GUTTER };

    const rect = el.getBoundingClientRect();
    const popoverWidth = Math.min(POPOVER_WIDTH, Math.max(260, window.innerWidth - 16));
    const maxLeft = window.innerWidth - VIEWPORT_GUTTER - popoverWidth;
    const left = clamp(rect.left, VIEWPORT_GUTTER, Math.max(VIEWPORT_GUTTER, maxLeft));

    const belowTop = rect.bottom + 8;
    const aboveTop = rect.top - 8 - POPOVER_ESTIMATED_HEIGHT;
    const fitsBelow = belowTop + POPOVER_ESTIMATED_HEIGHT <= window.innerHeight - VIEWPORT_GUTTER;
    const fitsAbove = aboveTop >= VIEWPORT_GUTTER;
    const top = fitsBelow || !fitsAbove ? belowTop : aboveTop;

    return { top, left };
  }, []);

  const updatePosition = useCallback(() => {
    setPosition(calculatePopoverPosition());
  }, [calculatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    setPopoverReady(false);
    requestAnimationFrame(() => {
      updatePosition();
      setPopoverReady(true);
    });

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onMouseDown = (e) => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      if (anchor.contains(e.target) || popover.contains(e.target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  const emitChange = useCallback(
    (nextValue) => {
      if (!onChange) return;
      onChange(makeSyntheticEvent({ name, value: nextValue }));
    },
    [name, onChange]
  );

  const commitDraft = useCallback(() => {
    const trimmed = (draft || "").trim();
    if (!trimmed) {
      emitChange("");
      setDraft("");
      return;
    }

    const parsed = parseAnyDateTime(trimmed);
    if (parsed && isValid(parsed)) {
      const normalized = formatIsoDateTime(parsed);
      emitChange(normalized);
      setDraft(formatByPreference(parseIsoDateTime(normalized), dateFormat, timeFormat));
      return;
    }

    setDraft(selectedDateTime ? formatByPreference(selectedDateTime, dateFormat, timeFormat) : "");
  }, [draft, emitChange, value, selectedDateTime, dateFormat, timeFormat]);

  const handleSelectDate = useCallback(
    (date) => {
      if (!date || !isValid(date)) return;
      const hours = Number(hour);
      const minutes = Number(minute);
      const normalized = formatIsoDateTime(withTime(date, hours, minutes));
      emitChange(normalized);
      setDraft(formatByPreference(parseIsoDateTime(normalized), dateFormat, timeFormat));
    },
    [emitChange, hour, minute, dateFormat, timeFormat]
  );

  const handleChangeTime = useCallback(
    (nextHour, nextMinute) => {
      const base = uiDateTime || new Date();
      const next = withTime(base, Number(nextHour), Number(nextMinute));
      const normalized = formatIsoDateTime(next);
      emitChange(normalized);
      setDraft(formatByPreference(parseIsoDateTime(normalized), dateFormat, timeFormat));
    },
    [emitChange, uiDateTime, dateFormat, timeFormat]
  );

  const handleClear = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      emitChange("");
      setDraft("");
      setOpen(false);
    },
    [emitChange]
  );

  const openCalendar = useCallback(() => {
    if (disabled) return;
    setPopoverReady(false);

    const pos = calculatePopoverPosition();
    if (pos.top === VIEWPORT_GUTTER && pos.left === VIEWPORT_GUTTER) {
      requestAnimationFrame(() => {
        setPosition(calculatePopoverPosition());
        setPopoverReady(true);
        setOpen(true);
      });
      return;
    }

    setPosition(pos);
    setPopoverReady(true);
    setOpen(true);
  }, [calculatePopoverPosition, disabled]);

  const toggleCalendar = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    openCalendar();
  }, [open, openCalendar]);

  return (
    <div
      className={`cp-date-field ${clearable && !disabled && value ? "cp-date-field--has-clear" : ""} ${className}`}
      ref={anchorRef}
    >
      <div className="cp-date-shell">
        <input
          type="text"
          value={draft}
          placeholder={placeholder || getPlaceholder(dateFormat, timeFormat)}
          disabled={disabled}
          required={required}
          onFocus={() => {
            setOpen(false);
            setIsEditing(true);
          }}
          onBlur={() => {
            setIsEditing(false);
            commitDraft();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setOpen(false);
            if (e.altKey && e.key === "ArrowDown") openCalendar();
          }}
        />

        {clearable && !disabled && value ? (
          <button type="button" className="cp-date-clear" aria-label="Effacer" onClick={handleClear}>
            <X size={16} />
          </button>
        ) : null}

        <button
          type="button"
          className="cp-date-open"
          aria-label="Ouvrir le calendrier"
          onClick={toggleCalendar}
        >
          <CalendarIcon size={16} />
        </button>
      </div>

      {open
        ? createPortal(
            <div
              className="cp-date-popover"
              ref={popoverRef}
              style={{ top: position.top, left: position.left, visibility: popoverReady ? "visible" : "hidden" }}
              role="dialog"
              aria-label="Sélecteur de date et heure"
            >
              <div className="cp-date-popover-inner">
                <RdrCalendar
                  date={uiDateTime}
                  onChange={handleSelectDate}
                  locale={fr}
                  weekStartsOn={1}
                  color="var(--cp-input-border-focus)"
                  showDateDisplay={false}
                  showPreview={false}
                />
              </div>
              <div className="cp-date-time-row">
                <div style={{ flex: 1 }}>
                  <label>Heure</label>
                  <select value={hour} onChange={(e) => handleChangeTime(e.target.value, minute)}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Minutes</label>
                  <select value={minute} onChange={(e) => handleChangeTime(hour, e.target.value)}>
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
