import React from "react";

const DentistPageSkeleton = ({
  title = "Chargement",
  subtitle = "Les donnees du cabinet arrivent...",
  variant = "table",
}) => {
  const renderTableRows = (rows = 6, cols = 5) =>
    Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: cols }).map((__, colIndex) => (
          <td key={colIndex}>
            <span
              className={`dentist-skeleton dentist-skeleton-line ${
                colIndex === 0 ? "dentist-skeleton-line-strong" : ""
              }`}
            />
          </td>
        ))}
      </tr>
    ));

  return (
    <div className="patients-container dentist-skeleton-page">
      <div className="dentist-skeleton-header">
        <span className="dentist-skeleton dentist-skeleton-kicker" />
        <span className="dentist-skeleton dentist-skeleton-heading" />
        <span className="dentist-skeleton dentist-skeleton-subheading" />
      </div>

      <div className="dentist-skeleton-toolbar">
        <span className="dentist-skeleton dentist-skeleton-search" />
        <div className="dentist-skeleton-toolbar-right">
          <span className="dentist-skeleton dentist-skeleton-chip" />
          <span className="dentist-skeleton dentist-skeleton-button" />
        </div>
      </div>

      {variant === "schedule" ? (
        <div className="dentist-skeleton-schedule">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="dentist-skeleton-schedule-row">
              <span className="dentist-skeleton dentist-skeleton-time" />
              <div className="dentist-skeleton-schedule-content">
                <span className="dentist-skeleton dentist-skeleton-line dentist-skeleton-line-strong" />
                <span className="dentist-skeleton dentist-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : variant === "settings" ? (
        <div className="dentist-skeleton-settings">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="dentist-skeleton-settings-card">
              <span className="dentist-skeleton dentist-skeleton-settings-icon" />
              <div className="dentist-skeleton-settings-text">
                <span className="dentist-skeleton dentist-skeleton-line dentist-skeleton-line-strong" />
                <span className="dentist-skeleton dentist-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : variant === "plan" ? (
        <>
          <div className="dentist-skeleton-plan-card">
            <div className="dentist-skeleton-plan-top">
              <div>
                <span className="dentist-skeleton dentist-skeleton-kicker" />
                <span className="dentist-skeleton dentist-skeleton-heading" />
                <span className="dentist-skeleton dentist-skeleton-subheading" />
              </div>
              <span className="dentist-skeleton dentist-skeleton-pill" />
            </div>

            <div className="dentist-skeleton-usage-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="dentist-skeleton-usage-card">
                  <span className="dentist-skeleton dentist-skeleton-line" />
                  <span className="dentist-skeleton dentist-skeleton-line dentist-skeleton-line-strong" />
                </div>
              ))}
            </div>

            <div className="dentist-skeleton-actions">
              <span className="dentist-skeleton dentist-skeleton-button" />
              <span className="dentist-skeleton dentist-skeleton-button dentist-skeleton-button-light" />
            </div>
          </div>

          <div className="dentist-skeleton-tabs">
            <span className="dentist-skeleton dentist-skeleton-chip" />
            <span className="dentist-skeleton dentist-skeleton-chip" />
          </div>
        </>
      ) : (
        <div className="dentist-skeleton-table-wrap">
          <table className="patients-table">
            <thead>
              <tr>
                {Array.from({ length: 5 }).map((_, index) => (
                  <th key={index}>
                    <span className="dentist-skeleton dentist-skeleton-line" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderTableRows(6, 5)}</tbody>
          </table>
        </div>
      )}

      <span className="dentist-skeleton-visually-hidden">
        {title} - {subtitle}
      </span>
    </div>
  );
};

export default DentistPageSkeleton;
