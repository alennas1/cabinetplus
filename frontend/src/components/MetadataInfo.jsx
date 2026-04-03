import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "react-feather";
import { formatDateTimeByPreference } from "../utils/dateFormat";

const firstValue = (...values) => {
  for (const value of values) {
    if (value === 0) return value;
    if (value) return value;
  }
  return null;
};

const joinName = (first, last) => {
  const f = String(first || "").trim();
  const l = String(last || "").trim();
  const full = `${f} ${l}`.trim();
  return full || null;
};

const getUserFullName = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  const firstname = String(value?.firstname || "").trim();
  const lastname = String(value?.lastname || "").trim();
  const full = `${firstname} ${lastname}`.trim();
  if (full) return full;
  const fallback = String(value?.fullName || value?.name || value?.username || value?.phoneNumber || "").trim();
  return fallback || null;
};

const buildDefaultEntries = (entity) => {
  if (!entity) return [];
  const entries = [];

  const push = (label, at, by) => {
    if (!at) return;
    entries.push({
      label,
      at,
      by: by || null,
    });
  };

  const createdAt = firstValue(
    entity.createdAt,
    entity.created_at,
    entity.dateCreated,
    entity.uploadedAt,
    entity.uploaded_at,
    entity.date,
    entity.billingDate,
    entity.paymentDate
  );
  const createdBy = firstValue(
    getUserFullName(entity.createdBy),
    getUserFullName(entity.practitioner),
    entity.createdByName,
    entity.practitionerName,
    joinName(entity.practitionerFirstname, entity.practitionerLastname)
  );
  push("Créé", createdAt, createdBy);

  const updatedAt = firstValue(entity.updatedAt, entity.updated_at);
  const updatedBy = firstValue(
    getUserFullName(entity.updatedBy),
    entity.updatedByName,
    entity.updatedByUsername,
    joinName(entity.updatedByFirstname, entity.updatedByLastname)
  );
  push("Mis à jour", updatedAt, updatedBy);

  const cancelledAt = firstValue(entity.cancelledAt, entity.canceledAt, entity.cancelled_at, entity.canceled_at);
  const cancelledBy = firstValue(
    getUserFullName(entity.cancelledBy),
    getUserFullName(entity.canceledBy),
    entity.cancelledByName,
    entity.canceledByName,
    joinName(entity.cancelledByFirstname, entity.cancelledByLastname),
    joinName(entity.canceledByFirstname, entity.canceledByLastname)
  );
  push("Annulé", cancelledAt, cancelledBy);

  const archivedAt = firstValue(entity.archivedAt, entity.archived_at);
  const archivedBy = firstValue(
    getUserFullName(entity.archivedBy),
    entity.archivedByName,
    joinName(entity.archivedByFirstname, entity.archivedByLastname)
  );
  push("Archivé", archivedAt, archivedBy);

  const sentToLabAt = firstValue(entity.sentToLabAt, entity.sentToLabDate, entity.sentToLabOn);
  const sentToLabBy = firstValue(
    getUserFullName(entity.sentToLabBy),
    entity.sentToLabByName,
    getUserFullName(entity.sentBy),
    entity.sentByName,
    joinName(entity.sentByFirstname, entity.sentByLastname),
    joinName(entity.sentToLabByFirstname, entity.sentToLabByLastname)
  );
  push("Envoyé au labo", sentToLabAt, sentToLabBy);

  const receivedAt = firstValue(
    entity.receivedAt,
    entity.receivedDate,
    entity.receivedOn,
    entity.received_at,
    entity.actualReturnDate,
    entity.returnDate,
    entity.returnedAt
  );
  const receivedBy = firstValue(
    getUserFullName(entity.receivedBy),
    entity.receivedByName,
    joinName(entity.receivedByFirstname, entity.receivedByLastname)
  );
  push("Reçu du labo", receivedAt, receivedBy);

  const posedAt = firstValue(
    entity.posedAt,
    entity.poseeAt,
    entity.poseeDate,
    entity.placedAt,
    entity.installedAt,
    entity.fittedAt,
    entity.fittedDate,
    entity.fittedOn
  );
  const posedBy = firstValue(
    getUserFullName(entity.posedBy),
    getUserFullName(entity.poseeBy),
    entity.posedByName,
    entity.poseeByName,
    joinName(entity.posedByFirstname, entity.posedByLastname),
    joinName(entity.poseeByFirstname, entity.poseeByLastname)
  );
  push("Posé", posedAt, posedBy);

  if (!sentToLabAt) {
    const sentAt = firstValue(entity.sentAt, entity.sent_at);
    const sentBy = firstValue(getUserFullName(entity.sentBy), entity.sentByName);
    push("Envoyé", sentAt, sentBy);
  }

  return entries;
};

const MetadataInfo = ({ entity, entries, iconSize = 18, className = "" }) => {
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const computed = useMemo(() => {
    const base = Array.isArray(entries) ? entries : buildDefaultEntries(entity);
    return (base || []).filter((e) => e?.at);
  }, [entity, entries]);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = rect.left + rect.width / 2;
      const top = rect.bottom + 8;
      setPos({ top, left });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  if (!computed.length) return null;

  const openTooltip = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (pinned) return;
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 120);
  };

  useEffect(() => {
    if (!open || !pinned) return;

    const onPointerDown = (e) => {
      const t = e.target;
      if (triggerRef.current && triggerRef.current.contains(t)) return;
      if (tooltipRef.current && tooltipRef.current.contains(t)) return;
      setPinned(false);
      setOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setPinned(false);
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, pinned]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${className}`}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const nextPinned = !pinned;
          setPinned(nextPinned);
          if (nextPinned) openTooltip();
          else setOpen(false);
        }}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleClose}
        onFocus={openTooltip}
        onBlur={scheduleClose}
        aria-label="Voir les métadonnées"
      >
        <HelpCircle size={iconSize} aria-hidden="true" />
      </button>

      {open
        ? createPortal(
            <div
              ref={tooltipRef}
              className="z-[99999] rounded-xl border border-gray-200 bg-white shadow-lg p-3 text-xs text-gray-700"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                transform: "translateX(-50%)",
                minWidth: 220,
                maxWidth: 320,
              }}
              role="tooltip"
              onMouseEnter={openTooltip}
              onMouseLeave={scheduleClose}
            >
              <div className="font-semibold text-gray-900 mb-2">Métadonnées</div>
              <div className="space-y-1">
                {computed.map((e, idx) => (
                  <div key={`${e.label}-${idx}`} className="flex items-start justify-between gap-3">
                    <span className="text-gray-600">{e.label}</span>
                    <span className="text-right">
                      <div className="text-gray-900">{formatDateTimeByPreference(e.at)}</div>
                      <div className="text-gray-500">par {e.by || "—"}</div>
                    </span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default MetadataInfo;
