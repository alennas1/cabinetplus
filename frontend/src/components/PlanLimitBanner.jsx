import React, { useEffect, useMemo, useState } from "react";
import { X } from "react-feather";
import { useSelector } from "react-redux";
import { getCurrentPlanUsage, getCurrentSubscriptionSummary } from "../services/userService";
import { formatDateByPreference } from "../utils/dateFormat";
import "./PlanLimitBanner.css";

const GB_BYTES = 1024 * 1024 * 1024;

const daysBetweenNow = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const buildDismissKey = (userId) => `cp_limits_banner_dismissed_v1:${userId || "anon"}`;

const PlanLimitBanner = () => {
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [usage, setUsage] = useState(null);
  const [sub, setSub] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const key = buildDismissKey(user?.id);
    setDismissed(window.localStorage.getItem(key) === "1");
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (String(user?.role || "").toUpperCase() === "ADMIN") return;

    let cancelled = false;
    const load = async () => {
      try {
        const [usageData, subData] = await Promise.all([getCurrentPlanUsage(), getCurrentSubscriptionSummary()]);
        if (cancelled) return;
        setUsage(usageData || null);
        setSub(subData || null);
      } catch (err) {
        if (cancelled) return;
        // Fail silent: banner is informational.
        setUsage(null);
        setSub(null);
      }
    };

    load();
    const interval = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, user?.id, user?.role]);

  const expiringSoon = useMemo(() => {
    const expiration = sub?.expirationDate;
    const hasNextPlan = Boolean(sub?.hasNextPlan);
    if (!expiration) return false;
    if (hasNextPlan) return false;
    const daysLeft = daysBetweenNow(expiration);
    if (daysLeft == null) return false;
    return daysLeft >= 0 && daysLeft <= 7;
  }, [sub?.expirationDate, sub?.hasNextPlan]);

  const expiringMessage = useMemo(() => {
    if (!expiringSoon) return "";
    const daysLeft = daysBetweenNow(sub?.expirationDate);
    const dateLabel = formatDateByPreference(sub?.expirationDate);
    const suffix = daysLeft === 0 ? "aujourd'hui" : `dans ${daysLeft} jour(s)`;
    return `Votre abonnement se termine le ${dateLabel} (${suffix}). Ajoutez un abonnement prochain pour éviter une interruption.`;
  }, [expiringSoon, sub?.expirationDate]);

  const nearLimitMessage = useMemo(() => {
    if (!usage?.planAssigned) return "";

    const messages = [];

    const patientsMax = Number(usage?.patientsMax || 0);
    const patientsUsed = Number(usage?.patientsUsed || 0);
    if (patientsMax > 0) {
      const remaining = patientsMax - patientsUsed;
      if (remaining <= 50 && remaining >= 0) {
        messages.push(`Patients actifs: il vous reste ${remaining} création(s) avant la limite (${patientsUsed}/${patientsMax}).`);
      }
    }

    const storageMaxGb = Number(usage?.storageMaxGb || 0);
    const storageUsedBytes = Number(usage?.storageUsedBytes || 0);
    if (storageMaxGb > 0) {
      const usedGb = storageUsedBytes / GB_BYTES;
      const remainingGb = storageMaxGb - usedGb;
      const near = remainingGb <= 1 || usedGb / storageMaxGb >= 0.9;
      if (near && remainingGb >= 0) {
        messages.push(`Stockage: il vous reste ~${remainingGb.toFixed(2)} Go avant la limite.`);
      }
    }

    return messages.join("  ");
  }, [usage]);

  const showNearLimit = Boolean(nearLimitMessage) && !dismissed && !expiringSoon;

  if (!isAuthenticated || !user) return null;
  if (String(user?.role || "").toUpperCase() === "ADMIN") return null;

  if (expiringSoon) {
    return (
      <div className="cp-plan-banner cp-plan-banner--danger" role="status">
        <div className="cp-plan-banner__text">{expiringMessage}</div>
      </div>
    );
  }

  if (!showNearLimit) return null;

  return (
    <div className="cp-plan-banner cp-plan-banner--warn" role="status">
      <div className="cp-plan-banner__text">{nearLimitMessage}</div>
      <button
        type="button"
        className="cp-plan-banner__close"
        aria-label="Ne plus afficher"
        onClick={() => {
          const key = buildDismissKey(user?.id);
          window.localStorage.setItem(key, "1");
          setDismissed(true);
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default PlanLimitBanner;
