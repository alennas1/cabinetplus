import React from "react";
import { AlertTriangle } from "react-feather";
import "./PatientDangerIcon.css";

const buildDangerTitle = ({ dangerCancelled, dangerOwed, title }) => {
  if (title) return title;
  const cancelled = !!dangerCancelled;
  const owed = !!dangerOwed;
  if (cancelled && owed) return "Alerte: RDV annulés + montant dû";
  if (cancelled) return "Alerte: RDV annulés";
  if (owed) return "Alerte: montant dû";
  return "Patient en alerte";
};

const PatientDangerIcon = ({
  show,
  title,
  dangerCancelled,
  dangerOwed,
  compact = false,
  big = false,
  className = "",
}) => {
  if (!show) return null;

  const classes = [
    "patient-danger-icon",
    compact ? "compact" : "",
    big ? "big" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      title={buildDangerTitle({ dangerCancelled, dangerOwed, title })}
      aria-label={buildDangerTitle({ dangerCancelled, dangerOwed, title })}
    >
      <AlertTriangle size={big ? 18 : compact ? 14 : 16} />
    </span>
  );
};

export default PatientDangerIcon;
