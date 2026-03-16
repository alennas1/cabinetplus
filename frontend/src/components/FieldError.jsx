import React from "react";

const NBSP = "\u00A0";

const FieldError = ({ message, id, className = "" }) => {
  const text = message ? String(message) : "";
  const isPlaceholder = !text;

  return (
    <p
      id={id}
      className={`cp-field-error ${isPlaceholder ? "placeholder" : ""} ${className}`.trim()}
      aria-live="polite"
    >
      {text || NBSP}
    </p>
  );
};

export default FieldError;

