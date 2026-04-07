import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "react-feather";
import { formatDateTimeByPreference } from "../utils/dateFormat";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value !== "object") return null;

  const firstname = String(value?.firstname ?? value?.firstName ?? value?.prenom ?? "").trim();
  const lastname = String(value?.lastname ?? value?.lastName ?? value?.nom ?? "").trim();
  const full = `${firstname} ${lastname}`.trim();
  if (full) return full;

  const fallback = String(
    value?.fullName ?? value?.name ?? value?.username ?? value?.phoneNumber ?? value?.email ?? ""
  ).trim();
  return fallback || null;
};

const getReasonText = (value) => {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value !== "object") return null;
  const fromObj = String(value?.reason ?? value?.message ?? value?.motif ?? value?.label ?? "").trim();
  return fromObj || null;
};

const buildDefaultEntries = (entity) => {
  if (!entity) return [];
  const entries = [];

  const push = (label, at, by, note) => {
    if (!at) return;
    entries.push({
      label,
      at,
      by: by || null,
      note: note || null,
    });
  };

  const createdAt = firstValue(
    entity.createdAt,
    entity.created_at,
    entity.dateCreated,
    entity.dateTimeStart,
    entity.date_time_start,
    entity.startDateTime,
    entity.start_date_time,
    entity.startedAt,
    entity.uploadedAt,
    entity.uploaded_at,
    entity.date,
    entity.billingDate,
    entity.paymentDate
  );
  const createdBy = firstValue(
    getUserFullName(entity.createdBy),
    getUserFullName(entity.practitioner),
    getUserFullName(entity.receivedBy),
    getUserFullName(entity.createdByName),
    getUserFullName(entity.practitionerName),
    getUserFullName(entity.receivedByName),
    getUserFullName(entity.receivedByUsername),
    joinName(entity.practitionerFirstname, entity.practitionerLastname),
    joinName(entity.receivedByFirstname, entity.receivedByLastname)
  );
  push("Créé", createdAt, createdBy);

  const updatedAtRaw = firstValue(entity.updatedAt, entity.updated_at);
  const updatedAt = updatedAtRaw || createdAt;
  let updatedBy = firstValue(
    getUserFullName(entity.updatedBy),
    getUserFullName(entity.updatedByName),
    getUserFullName(entity.updatedByUsername),
    joinName(entity.updatedByFirstname, entity.updatedByLastname)
  );
  if (!updatedBy) updatedBy = createdBy;
  push("Mis à jour", updatedAt, updatedBy);

  const cancelledAtRaw = firstValue(entity.cancelledAt, entity.canceledAt, entity.cancelled_at, entity.canceled_at);
  const cancelledBy = firstValue(
    getUserFullName(entity.cancelledBy),
    getUserFullName(entity.canceledBy),
    getUserFullName(entity.cancelledByName),
    getUserFullName(entity.canceledByName),
    joinName(entity.cancelledByFirstname, entity.cancelledByLastname),
    joinName(entity.canceledByFirstname, entity.canceledByLastname)
  );
  const cancelledReason = firstValue(
    getReasonText(entity.cancelReason),
    getReasonText(entity.cancel_reason),
    getReasonText(entity.cancellationReason),
    getReasonText(entity.cancellation_reason),
    getReasonText(entity.cancelledReason),
    getReasonText(entity.canceledReason),
    getReasonText(entity.reason),
    getReasonText(entity.motif)
  );

  const statusNorm = String(entity.status ?? entity.recordStatus ?? entity.record_status ?? "").toUpperCase();
  const cancelledAt = cancelledAtRaw || (statusNorm === "CANCELLED" ? updatedAt || createdAt : null);
  const cancelledByResolved = cancelledBy || (statusNorm === "CANCELLED" ? updatedBy : null);
  push("Annulé", cancelledAt, cancelledByResolved, cancelledReason);

  const archivedAt = firstValue(entity.archivedAt, entity.archived_at);
  let archivedBy = firstValue(
    getUserFullName(entity.archivedBy),
    getUserFullName(entity.archivedByName),
    joinName(entity.archivedByFirstname, entity.archivedByLastname)
  );
  if (!archivedBy) archivedBy = updatedBy || createdBy;
  push("Archivé", archivedAt, archivedBy);

  const sentToLabAt = firstValue(entity.sentToLabAt, entity.sentToLabDate, entity.sentToLabOn);
  const sentToLabBy = firstValue(
    getUserFullName(entity.sentToLabBy),
    getUserFullName(entity.sentToLabByName),
    getUserFullName(entity.sentToLabByUsername),
    getUserFullName(entity.sentBy),
    getUserFullName(entity.sentByName),
    getUserFullName(entity.sentByUsername),
    joinName(entity.sentByFirstname, entity.sentByLastname),
    joinName(entity.sentToLabByFirstname, entity.sentToLabByLastname)
  );
  push("Envoyé au labo", sentToLabAt, sentToLabBy || updatedBy || createdBy);

  const readyAt = firstValue(entity.readyAt, entity.ready_at, entity.readyOn, entity.readyDate);
  push("Prête", readyAt, updatedBy || createdBy);

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
    getUserFullName(entity.receivedByName),
    getUserFullName(entity.receivedByUsername),
    joinName(entity.receivedByFirstname, entity.receivedByLastname)
  );
  push("Reçu du labo", receivedAt, receivedBy || updatedBy || createdBy);

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
    getUserFullName(entity.posedByName),
    getUserFullName(entity.poseeByName),
    joinName(entity.posedByFirstname, entity.posedByLastname),
    joinName(entity.poseeByFirstname, entity.poseeByLastname)
  );
  push("Posé", posedAt, posedBy || updatedBy || createdBy);

  if (!sentToLabAt) {
    const sentAt = firstValue(entity.sentAt, entity.sent_at);
    const sentBy = firstValue(getUserFullName(entity.sentBy), getUserFullName(entity.sentByName));
    push("Envoyé", sentAt, sentBy);
  }

  return entries;
};

const MetadataInfo = ({ entity, entries, iconSize = 18, className = "", hideByLine = false, byPrefix = "par " }) => {
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [layout, setLayout] = useState({ top: 0, left: 0, maxHeight: 320 });

  const computed = useMemo(() => {
    const base = Array.isArray(entries) ? entries : buildDefaultEntries(entity);
    return (base || []).filter((e) => e?.at);
  }, [entity, entries]);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const tip = tooltipRef.current;
      const rect = el.getBoundingClientRect();

      const padding = 12;
      const gap = 8;
      const maxHeight = Math.max(140, Math.min(360, window.innerHeight - padding * 2));

      const tooltipWidth = tip?.offsetWidth || 260;
      const rawHeight = tip?.scrollHeight || 220;
      const tooltipHeight = Math.min(rawHeight, maxHeight);

      const minLeft = padding + tooltipWidth / 2;
      const maxLeft = window.innerWidth - padding - tooltipWidth / 2;
      const left = clamp(
        rect.left + rect.width / 2,
        minLeft,
        Number.isFinite(maxLeft) ? Math.max(minLeft, maxLeft) : minLeft
      );

      const belowTop = rect.bottom + gap;
      const aboveTop = rect.top - gap - tooltipHeight;
      let top = belowTop;
      if (belowTop + tooltipHeight + padding > window.innerHeight && aboveTop >= padding) {
        top = aboveTop;
      }
      top = clamp(top, padding, Math.max(padding, window.innerHeight - padding - tooltipHeight));

      setLayout({ top, left, maxHeight });
    };

    update();
    window.requestAnimationFrame(update);
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
                top: layout.top,
                left: layout.left,
                transform: "translateX(-50%)",
                minWidth: 220,
                maxWidth: 320,
                maxHeight: layout.maxHeight,
                overflowY: "auto",
                overscrollBehavior: "contain",
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
                      {!hideByLine ? (
                        <div className="text-gray-500">{byPrefix ? `${byPrefix}${e.by || "—"}` : e.by || "—"}</div>
                      ) : null}
                      {e.note ? <div className="text-gray-500">motif : {e.note}</div> : null}
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
