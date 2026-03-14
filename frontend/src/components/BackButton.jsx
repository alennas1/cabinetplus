import React from "react";
import { ArrowLeft } from "react-feather";
import { useNavigate } from "react-router-dom";

export default function BackButton({
  fallbackTo = "/dashboard",
  label = "Retour",
  className = "",
  onClick,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof onClick === "function") return onClick();
    if (window.history.length > 1) return navigate(-1);
    return navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`mb-3 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm ${className}`}
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}

