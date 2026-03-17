import React from "react";
import { SORT_DIRECTIONS } from "../utils/tableSort";
import "./SortableTh.css";

const getAriaSort = (active, direction) => {
  if (!active) return "none";
  return direction === SORT_DIRECTIONS.DESC ? "descending" : "ascending";
};

export default function SortableTh({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = "",
  title,
  style,
}) {
  const active = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction || SORT_DIRECTIONS.ASC;
  const nextDirection = !active
    ? SORT_DIRECTIONS.ASC
    : direction === SORT_DIRECTIONS.ASC
      ? SORT_DIRECTIONS.DESC
      : SORT_DIRECTIONS.ASC;
  const toggleTitle =
    nextDirection === SORT_DIRECTIONS.ASC ? "Trier par ordre croissant" : "Trier par ordre decroissant";

  return (
    <th className={`sortable-th ${className}`} style={style} aria-sort={getAriaSort(active, direction)}>
      <div className="sortable-th-inner">
        <button
          type="button"
          className="sortable-label-btn"
          title={title || "Trier"}
          onClick={() => onSort(sortKey)}
        >
          {label}
        </button>
        <button
          type="button"
          className="sort-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSort(sortKey);
          }}
          title={toggleTitle}
          aria-label={toggleTitle}
        >
          <span
            className={`sort-triangle up ${active && direction === SORT_DIRECTIONS.ASC ? "active" : ""}`}
            aria-hidden="true"
          />
          <span
            className={`sort-triangle down ${active && direction === SORT_DIRECTIONS.DESC ? "active" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </th>
  );
}
