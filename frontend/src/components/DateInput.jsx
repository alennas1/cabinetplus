import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as RdrCalendar } from "react-date-range";
import { format, isValid, parse, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "react-feather";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import "./DateInput.css";
import { DATE_FORMATS, getDateFormatPreference } from "../utils/workingHours";

const POPOVER_WIDTH = 360;
const POPOVER_ESTIMATED_HEIGHT = 392;
const VIEWPORT_GUTTER = 8;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseIsoDateOnly(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAnyDate(value) {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = parseIsoDateOnly(trimmed);
  if (iso) return iso;

  const candidates = [
    parse(trimmed, "dd/MM/yyyy", new Date(), { locale: fr }),
    parse(trimmed, "dd-MM-yyyy", new Date(), { locale: fr }),
    parse(trimmed, "dd MMMM yyyy", new Date(), { locale: fr }),
  ];

  const found = candidates.find((d) => isValid(d));
  if (!found) return null;
  return new Date(found.getFullYear(), found.getMonth(), found.getDate(), 0, 0, 0, 0);
}

function formatIsoDate(date) {
  return format(date, "yyyy-MM-dd");
}

function makeSyntheticEvent({ name, value }) {
  return {
    target: { name, value },
    currentTarget: { name, value },
  };
}

function getPreferencePattern(dateFormat) {
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH) return "dd-MM-yyyy";
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH) return "dd/MM/yyyy";
  return "dd/MM/yyyy";
}

function getPlaceholder(dateFormat) {
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH) return "DD-MM-YYYY";
  if (dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH) return "DD/MM/YYYY";
  return "DD/MM/YYYY";
}

function getTemplate(separator) {
  return `dd${separator}mm${separator}yyyy`;
}

const DIGIT_SLOTS = [0, 1, 3, 4, 6, 7, 8, 9];

function applySlotsToTemplate(slots, separator) {
  const template = getTemplate(separator).split("");
  for (let i = 0; i < DIGIT_SLOTS.length; i += 1) {
    const digit = slots?.[i] || "";
    if (digit) template[DIGIT_SLOTS[i]] = digit;
  }
  return template.join("");
}

function parseDigitsToDate(digits) {
  const cleaned = String(digits || "").replace(/\D/g, "");
  if (cleaned.length !== 8) return null;
  const day = Number(cleaned.slice(0, 2));
  const month = Number(cleaned.slice(2, 4));
  const year = Number(cleaned.slice(4, 8));
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function slotsFromIso(value) {
  const date = parseIsoDateOnly(value);
  if (!date) return Array(8).fill("");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).padStart(4, "0");
  const digits = `${day}${month}${year}`.split("");
  return digits.length === 8 ? digits : Array(8).fill("");
}

function slotsToDigits(slots) {
  if (!Array.isArray(slots) || slots.length !== 8) return "";
  return slots.join("");
}

function isAllEmpty(slots) {
  return Array.isArray(slots) && slots.every((s) => !s);
}

function isComplete(slots) {
  return Array.isArray(slots) && slots.length === 8 && slots.every((s) => /^\d$/.test(s));
}

function segmentFromCaret(pos) {
  if (pos <= 2) return "day";
  if (pos <= 5) return "month";
  return "year";
}

function segmentRange(segment) {
  if (segment === "day") return { start: 0, end: 2, slotStart: 0, slotEnd: 1 };
  if (segment === "month") return { start: 3, end: 5, slotStart: 2, slotEnd: 3 };
  return { start: 6, end: 10, slotStart: 4, slotEnd: 7 };
}

function previousDigitSlotIndex(pos) {
  for (let i = DIGIT_SLOTS.length - 1; i >= 0; i -= 1) {
    if (DIGIT_SLOTS[i] < pos) return i;
  }
  return null;
}

function nextDigitSlotIndex(pos) {
  for (let i = 0; i < DIGIT_SLOTS.length; i += 1) {
    if (DIGIT_SLOTS[i] >= pos) return i;
  }
  return null;
}

function formatByPreference(date, dateFormat) {
  if (!date) return "";
  const pattern = getPreferencePattern(dateFormat);
  return format(date, pattern, { locale: fr });
}

function useDateFormat() {
  const [dateFormat, setDateFormat] = useState(() => getDateFormatPreference());

  useEffect(() => {
    const handler = (e) => {
      setDateFormat(e?.detail || getDateFormatPreference());
    };
    window.addEventListener("dateFormatChanged", handler);
    return () => window.removeEventListener("dateFormatChanged", handler);
  }, []);

  return dateFormat;
}

export default function DateInput({
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  min,
  max,
  clearable = true,
  required = false,
  className = "",
}) {
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);
  const openRequestedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [popoverReady, setPopoverReady] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [slots, setSlots] = useState(() => slotsFromIso(value));
  const [isEditing, setIsEditing] = useState(false);
  const pendingSelectionRef = useRef(null);
  const lastSyncedRef = useRef({ value: null, preference: null });
  const lastSegmentRef = useRef("day");

  const preference = useDateFormat();

  const selectedDate = useMemo(() => parseIsoDateOnly(value), [value]);
  const minDate = useMemo(() => parseIsoDateOnly(min), [min]);
  const maxDate = useMemo(() => parseIsoDateOnly(max), [max]);
  const separator = useMemo(() => {
    if (preference === DATE_FORMATS.DD_MM_YYYY_DASH) return "-";
    if (preference === DATE_FORMATS.DD_MM_YYYY_SLASH) return "/";
    return "/";
  }, [preference]);

  const displayValue = useMemo(() => {
    if (!separator) return draft;
    return applySlotsToTemplate(slots, separator);
  }, [draft, slots, separator]);

  const draftDate = useMemo(() => {
    if (!separator) return parseAnyDate(draft);
    const digits = slotsToDigits(slots);
    return parseDigitsToDate(digits);
  }, [draft, separator, slots]);

  useEffect(() => {
    if (isEditing) return;

    const last = lastSyncedRef.current;
    if (last.value === value && last.preference === preference) return;
    lastSyncedRef.current = { value, preference };

    if (separator) {
      const nextSlots = slotsFromIso(value);
      setSlots(nextSlots);
      return;
    }

    setDraft(selectedDate ? formatByPreference(selectedDate, preference) : "");
  }, [value, isEditing, preference, selectedDate]);

  useEffect(() => {
    const nextSelection = pendingSelectionRef.current;
    if (!nextSelection) return;
    pendingSelectionRef.current = null;
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(nextSelection.start, nextSelection.end);
      } catch {
        // noop
      }
    });
  }, [draft, slots, separator]);

  const calculatePopoverPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return { top: VIEWPORT_GUTTER, left: VIEWPORT_GUTTER, width: 0 };

    const rect = el.getBoundingClientRect();
    const popoverRect = popoverRef.current;
    const measuredWidth = popoverRect?.offsetWidth || 0;
    const measuredHeight = popoverRect?.offsetHeight || 0;
    const popoverWidth = measuredWidth || Math.min(POPOVER_WIDTH, Math.max(260, window.innerWidth - 16));
    const popoverHeight = measuredHeight || POPOVER_ESTIMATED_HEIGHT;
    const maxLeft = window.innerWidth - VIEWPORT_GUTTER - popoverWidth;
    const left = clamp(rect.left, VIEWPORT_GUTTER, Math.max(VIEWPORT_GUTTER, maxLeft));

    const belowTop = rect.bottom + 8;
    const aboveTop = rect.top - 8 - popoverHeight;
    const fitsBelow = belowTop + popoverHeight <= window.innerHeight - VIEWPORT_GUTTER;
    const fitsAbove = aboveTop >= VIEWPORT_GUTTER;
    const top = fitsBelow || !fitsAbove ? belowTop : aboveTop;

    return { top, left, width: rect.width };
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

  useEffect(() => {
    if (open) openRequestedRef.current = false;
  }, [open]);

  const emitChange = useCallback(
    (nextValue) => {
      if (!onChange) return;
      onChange(makeSyntheticEvent({ name, value: nextValue }));
    },
    [name, onChange]
  );

  const commitDraft = useCallback(() => {
    if (separator) {
      if (isAllEmpty(slots)) {
        if (value) emitChange("");
        return;
      }

      if (isComplete(slots)) {
        const parsedFromDigits = parseDigitsToDate(slotsToDigits(slots));
        if (parsedFromDigits) {
          emitChange(formatIsoDate(parsedFromDigits));
        }
      }

      return;
    }

    const trimmed = (draft || "").trim();
    if (!trimmed) {
      emitChange("");
      setDraft("");
      return;
    }

    const parsed = parseAnyDate(trimmed) || parse(trimmed, getPreferencePattern(preference), new Date(), { locale: fr });
    if (parsed && isValid(parsed)) {
      const normalized = formatIsoDate(parsed);
      emitChange(normalized);
      setDraft(formatByPreference(parseIsoDateOnly(normalized), preference));
    }
  }, [draft, emitChange, preference, separator, slots, value]);

  const handleSelect = useCallback(
    (date) => {
      if (!date || !isValid(date)) return;
      const normalized = formatIsoDate(date);
      emitChange(normalized);
      if (separator) setSlots(slotsFromIso(normalized));
      else setDraft(formatByPreference(parseIsoDateOnly(normalized), preference));
      setOpen(false);
    },
    [emitChange, preference, separator]
  );

  const handleClear = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      emitChange("");
      if (separator) setSlots(Array(8).fill(""));
      else setDraft("");
      setOpen(false);
    },
    [emitChange, separator]
  );

  const openCalendar = useCallback(() => {
    if (disabled) return;
    setPopoverReady(false);

    const anchor = anchorRef.current;
    const rect = anchor?.getBoundingClientRect?.();
    const isNotLaidOut = !rect || (rect.width === 0 && rect.height === 0);

    const pos = calculatePopoverPosition();
    const looksLikeTopLeft = pos.top === VIEWPORT_GUTTER && pos.left === VIEWPORT_GUTTER;

    // If the element is not laid out yet (modal animation), delay a frame to avoid top-left flash.
    if (isNotLaidOut || looksLikeTopLeft) {
      requestAnimationFrame(() => {
        setOpen(true);
        requestAnimationFrame(() => {
          setPosition(calculatePopoverPosition());
          setPopoverReady(true);
        });
      });
      return;
    }

    setPosition(pos);
    setOpen(true);
  }, [calculatePopoverPosition, disabled]);

  const toggleCalendar = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    openCalendar();
  }, [open, openCalendar]);

  const handleInputPress = useCallback(
    (e) => {
      if (disabled) return;

      // Only react to primary button for mouse down. Click events don't expose `button` consistently.
      if (e?.type === "mousedown") {
        const button = e?.button;
        if (typeof button === "number" && button !== 0) return;
      }

      if (open || openRequestedRef.current) return;
      openRequestedRef.current = true;
      openCalendar();
    },
    [disabled, open, openCalendar]
  );

  return (
    <div
      className={`cp-date-field ${clearable && !disabled && value ? "cp-date-field--has-clear" : ""} ${className}`}
      ref={anchorRef}
    >
      <div className="cp-date-shell">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder || getPlaceholder(preference)}
          disabled={disabled}
          required={required}
          inputMode={separator ? "numeric" : undefined}
          onMouseDown={handleInputPress}
          onClick={handleInputPress}
          onFocus={() => {
            setIsEditing(true);
            if (!separator) return;
            lastSegmentRef.current = "day";
            requestAnimationFrame(() => {
              try {
                inputRef.current?.setSelectionRange(0, 2);
              } catch {
                // noop
              }
            });
          }}
          onBlur={() => {
            setIsEditing(false);
            commitDraft();
          }}
          onChange={(e) => {
            if (separator) return;
            setDraft(e.target.value);
          }}
          onMouseUp={() => {
            if (!separator) return;
            const el = inputRef.current;
            if (!el) return;
            if (el.selectionStart !== el.selectionEnd) return;
            const pos = el.selectionStart ?? 0;
            const seg = segmentFromCaret(pos);
            lastSegmentRef.current = seg;
            const range = segmentRange(seg);
            requestAnimationFrame(() => {
              try {
                el.setSelectionRange(range.start, range.end);
              } catch {
                // noop
              }
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setOpen(false);
            if (e.altKey && e.key === "ArrowDown") openCalendar();

            if (!separator) return;

            const el = e.currentTarget;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            const seg = segmentFromCaret(start);
            lastSegmentRef.current = seg;
            const range = segmentRange(seg);

            const setSelection = (slotIndex) => {
              const pos = DIGIT_SLOTS[slotIndex] ?? range.start;
              pendingSelectionRef.current = { start: pos, end: pos };
            };

            const setSegmentSelection = (segment) => {
              const r = segmentRange(segment);
              pendingSelectionRef.current = { start: r.start, end: r.end };
            };

            if (e.key === "ArrowLeft") {
              e.preventDefault();
              if (seg === "month") setSegmentSelection("day");
              else if (seg === "year") setSegmentSelection("month");
              else setSegmentSelection("day");
              return;
            }
            if (e.key === "ArrowRight" || e.key === "Tab") {
              if (e.key === "Tab" && e.shiftKey) return;
              if (e.key !== "Tab") e.preventDefault();
              if (seg === "day") setSegmentSelection("month");
              else if (seg === "month") setSegmentSelection("year");
              else setSegmentSelection("year");
              return;
            }
            if (e.key === "Tab" && e.shiftKey) {
              if (seg === "year") setSegmentSelection("month");
              else if (seg === "month") setSegmentSelection("day");
              else setSegmentSelection("day");
              return;
            }

            if (/^\d$/.test(e.key)) {
              e.preventDefault();
              setSlots((current) => {
                const next = [...(current || Array(8).fill(""))];

                const segmentIsSelected = start === range.start && end === range.end;
                if (segmentIsSelected) {
                  for (let i = range.slotStart; i <= range.slotEnd; i += 1) next[i] = "";
                }

                // Find target slot: first empty within segment, or overwrite the first slot.
                let target = range.slotStart;
                for (let i = range.slotStart; i <= range.slotEnd; i += 1) {
                  if (!next[i]) {
                    target = i;
                    break;
                  }
                }

                // If caret is inside a segment and not selecting it, prefer the slot at/after caret.
                if (!segmentIsSelected) {
                  const slotAt = nextDigitSlotIndex(start);
                  if (slotAt != null && slotAt >= range.slotStart && slotAt <= range.slotEnd) target = slotAt;
                }

                next[target] = e.key;

                const nextSlot = target < range.slotEnd ? target + 1 : null;
                if (nextSlot != null) setSelection(nextSlot);
                else if (seg === "day") pendingSelectionRef.current = { start: 3, end: 5 };
                else if (seg === "month") pendingSelectionRef.current = { start: 6, end: 10 };
                else pendingSelectionRef.current = { start: 6, end: 10 };

                return next;
              });
              return;
            }

            if (e.key === "Backspace") {
              e.preventDefault();
              // If selecting the segment, clear it.
              if (start === range.start && end === range.end) {
                setSlots((current) => {
                  const next = [...(current || Array(8).fill(""))];
                  for (let i = range.slotStart; i <= range.slotEnd; i += 1) next[i] = "";
                  return next;
                });
                pendingSelectionRef.current = { start: range.start, end: range.end };
                return;
              }

              const prev = previousDigitSlotIndex(start);
              if (prev == null) return;
              if (prev < range.slotStart) {
                // jump to previous segment
                if (seg === "month") pendingSelectionRef.current = { start: 0, end: 2 };
                else if (seg === "year") pendingSelectionRef.current = { start: 3, end: 5 };
                return;
              }

              setSlots((current) => {
                const next = [...(current || Array(8).fill(""))];
                next[prev] = "";
                return next;
              });
              setSelection(prev);
              return;
            }

            if (e.key === "Delete") {
              e.preventDefault();
              const nextIdx = nextDigitSlotIndex(start);
              if (nextIdx == null) return;
              if (nextIdx < range.slotStart || nextIdx > range.slotEnd) return;
              setSlots((current) => {
                const next = [...(current || Array(8).fill(""))];
                next[nextIdx] = "";
                return next;
              });
              setSelection(nextIdx);
              return;
            }
          }}
          onPaste={(e) => {
            if (!separator) return;
            const pasted = e.clipboardData?.getData("text") || "";
            const digits = pasted.replace(/\D/g, "").slice(0, 8);
            if (!digits) return;
            e.preventDefault();
            const next = Array(8).fill("");
            for (let i = 0; i < Math.min(8, digits.length); i += 1) next[i] = digits[i];
            setSlots(next);
            const caret = digits.length >= 8 ? 10 : DIGIT_SLOTS[digits.length] ?? 10;
            pendingSelectionRef.current = { start: caret, end: caret };
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
              aria-label="Sélecteur de date"
            >
              <div className="cp-date-popover-inner">
                <RdrCalendar
                  date={draftDate || selectedDate || new Date()}
                  onChange={handleSelect}
                  minDate={minDate || undefined}
                  maxDate={maxDate || undefined}
                  locale={fr}
                  weekStartsOn={1}
                  color="var(--cp-input-border-focus)"
                  showDateDisplay={false}
                  showPreview={false}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
