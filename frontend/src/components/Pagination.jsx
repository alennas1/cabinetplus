import React, { useMemo } from "react";
import "./Pagination.css";

const ELLIPSIS = "ELLIPSIS";

function buildPageItems(currentPage, totalPages) {
  const safeTotal = Math.max(0, Number(totalPages) || 0);
  const safeCurrent = Math.min(Math.max(1, Number(currentPage) || 1), Math.max(1, safeTotal));

  if (safeTotal <= 1) return [];

  // Small datasets: show everything.
  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  // Ellipsis pattern (fixed 7 slots):
  // Start:  1 2 3 4 5 … N
  // Middle: 1 … C-1 C C+1 … N
  // End:    1 … N-4 N-3 N-2 N-1 N
  if (safeCurrent <= 4) {
    return [1, 2, 3, 4, 5, ELLIPSIS, safeTotal];
  }

  if (safeCurrent >= safeTotal - 3) {
    return [1, ELLIPSIS, safeTotal - 4, safeTotal - 3, safeTotal - 2, safeTotal - 1, safeTotal];
  }

  return [1, ELLIPSIS, safeCurrent - 1, safeCurrent, safeCurrent + 1, ELLIPSIS, safeTotal];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  previousLabel = "← Précédent",
  nextLabel = "Suivant →",
  className = "",
}) {
  const items = useMemo(() => buildPageItems(currentPage, totalPages), [currentPage, totalPages]);
  const safeTotal = Math.max(0, Number(totalPages) || 0);
  const safeCurrent = Math.min(Math.max(1, Number(currentPage) || 1), Math.max(1, safeTotal));
  const isTruncated = safeTotal > 7;

  if (safeTotal <= 1) return null;

  return (
    <nav className={`pagination-bar ${className}`.trim()} aria-label="Pagination">
      <button
        type="button"
        className="pagination-nav"
        disabled={disabled || safeCurrent === 1}
        onClick={() => onPageChange?.(safeCurrent - 1)}
      >
        {previousLabel}
      </button>

      <div className={`pagination-pages ${isTruncated ? "is-truncated" : ""}`}>
        {items.map((item, idx) => {
          if (item === ELLIPSIS) {
            return (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                …
              </span>
            );
          }

          const page = item;
          const active = page === safeCurrent;
          return (
            <button
              key={`page-${page}`}
              type="button"
              className={`pagination-page ${active ? "active" : ""}`.trim()}
              aria-current={active ? "page" : undefined}
              disabled={disabled}
              onClick={() => onPageChange?.(page)}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="pagination-nav"
        disabled={disabled || safeCurrent === safeTotal}
        onClick={() => onPageChange?.(safeCurrent + 1)}
      >
        {nextLabel}
      </button>
    </nav>
  );
}

