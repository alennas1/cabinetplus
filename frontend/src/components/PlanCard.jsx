import React, { useMemo } from "react";
import { Check } from "react-feather";
import { formatMoney, formatMoneyWithLabel } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import "./PlanCard.css";

const getPlanFeatures = (plan) => [
  `${plan?.maxDentists ?? 1} dentiste(s) maximum`,
  `${plan?.maxEmployees ?? 0} employé(s) maximum`,
  `${plan?.maxPatients ?? 0} patient(s) actif(s) maximum`,
  `${plan?.maxStorageGb ?? 0} Go de stockage`,
];

const PlanCard = ({
  plan,
  isYearly = false,
  featured = false,
  variant = "full", // full | compact
  className,
  showFeatures = true,
  showButton = true,
  disabled = false,
  buttonVariant, // primary | outline (optional override)
  buttonLabel,
  onSelect,
  headerBadge,
  headerBadges,
  footerNote,
  extraContent,
}) => {
  const isFree = Number(plan?.monthlyPrice || 0) === 0;
  const hasDiscount =
    !isFree &&
    Number(plan?.yearlyMonthlyPrice || 0) > 0 &&
    Number(plan?.yearlyMonthlyPrice || 0) < Number(plan?.monthlyPrice || 0);

  const displayPrice = useMemo(() => {
    if (isFree) return 0;
    return isYearly ? Number(plan?.yearlyMonthlyPrice || 0) : Number(plan?.monthlyPrice || 0);
  }, [isFree, isYearly, plan]);

  const currencyLabel = getCurrencyLabelPreference();
  const totalAnnualPrice = Number(plan?.yearlyMonthlyPrice || 0) * 12;
  const totalMonthlyEquivalent = Number(plan?.monthlyPrice || 0) * 12;
  const resolvedButtonVariant = buttonVariant || (featured ? "primary" : "outline");
  const resolvedBadges = Array.isArray(headerBadges)
    ? headerBadges.filter(Boolean)
    : headerBadge
    ? [headerBadge]
    : [];

  return (
    <div
      className={[
        "cp-plan-card",
        featured ? "is-featured" : "",
        variant === "compact" ? "is-compact" : "",
        className || "",
      ].join(" ")}
    >
      <div className="cp-plan-card-header">
        <div>
          <div className="cp-plan-card-name">{plan?.name || "-"}</div>
        </div>
        {resolvedBadges.length ? (
          <div className="cp-plan-card-badges">
            {resolvedBadges.map((badge) => (
              <span key={badge} className="cp-plan-card-badge">{badge}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="cp-plan-card-price">
        {!isFree && isYearly && hasDiscount ? (
          <div className="cp-plan-card-strike">{formatMoneyWithLabel(plan?.monthlyPrice || 0)}</div>
        ) : null}

        <div className="cp-plan-card-price-row">
          <span className="cp-plan-card-price-main">{isFree ? "Gratuit" : formatMoney(displayPrice)}</span>
          <span className="cp-plan-card-price-sub">{isFree ? "" : `${currencyLabel} / mois`}</span>
        </div>

        {!isFree && isYearly && hasDiscount ? (
          <div className="cp-plan-card-save">
            <div className="cp-plan-card-annual-total">
              Total:{" "}
              <span className="cp-plan-card-annual-strike">{formatMoney(totalMonthlyEquivalent)}</span>{" "}
              {formatMoney(totalAnnualPrice)} {currencyLabel}/an
            </div>
            <span className="cp-plan-card-save-badge">
              -
              {Math.round(((Number(plan?.monthlyPrice || 0) - Number(plan?.yearlyMonthlyPrice || 0)) / Number(plan?.monthlyPrice || 1)) * 100)}
              % de réduction
            </span>
          </div>
        ) : null}

      </div>

      {showFeatures ? (
        <ul className="cp-plan-card-features">
          {getPlanFeatures(plan).map((feature) => (
            <li key={feature}>
              <Check size={16} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {footerNote ? <div className="cp-plan-card-footnote">{footerNote}</div> : null}

      {extraContent ? <div className="cp-plan-card-extra">{extraContent}</div> : null}

      {showButton ? (
        <button
          type="button"
          className={`cp-plan-card-btn ${resolvedButtonVariant}`}
          onClick={disabled ? undefined : onSelect}
          disabled={disabled}
        >
          {buttonLabel || (isFree ? "Essayer maintenant" : "Choisir ce plan")}
        </button>
      ) : null}
    </div>
  );
};

export default PlanCard;
