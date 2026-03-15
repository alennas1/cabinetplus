import React from "react";
import { ChevronDown, ChevronUp } from "react-feather";
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
        <div className="sort-icons" aria-hidden="true">
          <button
            type="button"
            className={`sort-icon-btn ${active && direction === SORT_DIRECTIONS.ASC ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onSort(sortKey, SORT_DIRECTIONS.ASC);
            }}
            title="Trier par ordre croissant"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className={`sort-icon-btn ${active && direction === SORT_DIRECTIONS.DESC ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onSort(sortKey, SORT_DIRECTIONS.DESC);
            }}
            title="Trier par ordre decroissant"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </th>
  );
}
