import React, { useState } from "react";

const DEFAULT_FILTERS = {
  favorite_threshold: "0.5",
  volatility_threshold: "0.5",
  limit: "20",
};

const FILTER_LABELS = {
  favorite_threshold: "Favorite Threshold",
  volatility_threshold: "Volatility Threshold",
  limit: "Results Limit",
};

const FiltersPanel = ({ filters, setFilters, onApply }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getValue = (key) => {
    return filters[key] ?? DEFAULT_FILTERS[key] ?? "";
  };

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  };

  // const buildAppliedFilters = () => {
  //   const nextFilters = {};

  //   Object.entries({ ...DEFAULT_FILTERS, ...filters }).forEach(([key, value]) => {
  //     if (value === "" || value === null || value === undefined) return;

  //     const parsed = Number(value);

  //     if (!Number.isNaN(parsed)) {
  //       nextFilters[key] = parsed;
  //     }
  //   });

  //   return nextFilters;
  // };
  const buildAppliedFilters = () => {
    const nextFilters = {};

    Object.entries(filters)
      .filter(([key]) => Object.prototype.hasOwnProperty.call(FILTER_LABELS, key))
      .forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) return;

        const parsed = Number(value);

        if (!Number.isNaN(parsed)) {
          nextFilters[key] = parsed;
        }
      });

    return nextFilters;
  };

  const handleApply = () => {
    const nextFilters = buildAppliedFilters();
    setFilters(nextFilters);
    onApply && onApply(nextFilters);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleApply();
  };

  const resetFilters = () => {
    setFilters({});
    onApply && onApply({});
  };

  const formatFilterValue = (key, value) => {
    if (value === "" || value === null || value === undefined) return null;

    if (key === "favorite_threshold" || key === "volatility_threshold") {
      return `${(Number(value) * 100).toFixed(0)}%`;
    }

    return value;
  };

  // const activeFilters = Object.entries({ ...DEFAULT_FILTERS, ...filters })
  //   .map(([key, value]) => ({
  //     key,
  //     label: FILTER_LABELS[key] || key,
  //     value: formatFilterValue(key, value),
  //   }))
  //   .filter((filter) => filter.value !== null);
  const activeFilters = Object.entries(filters)
  .filter(([key]) => Object.prototype.hasOwnProperty.call(FILTER_LABELS, key))
  .map(([key, value]) => ({
    key,
    label: FILTER_LABELS[key],
    value: formatFilterValue(key, value),
  }))
  .filter((filter) => filter.value !== null);

  return (
    <div className="filters-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Filters & Options</h2>
        <button
          className="filter-button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ minWidth: "auto", padding: "0.5rem 1rem" }}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="filter-group" style={{ marginTop: "1.5rem" }}>
            {/* <div className="filter-item">
              <label>Min Games for Analysis</label>
              <input
                type="number"
                min="1"
                value={getValue("min_games")}
                onChange={(e) => handleFilterChange("min_games", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Minimum games"
              />
            </div> */}

            <div className="filter-item">
              <label>Favorite Threshold (Probability)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={getValue("favorite_threshold")}
                onChange={(e) => handleFilterChange("favorite_threshold", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.5"
              />
            </div>

            <div className="filter-item">
              <label>Volatility Threshold</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={getValue("volatility_threshold")}
                onChange={(e) => handleFilterChange("volatility_threshold", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.5"
              />
            </div>

            <div className="filter-item">
              <label>Results Limit</label>
              <input
                type="number"
                min="1"
                max="100"
                value={getValue("limit")}
                onChange={(e) => handleFilterChange("limit", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Limit results"
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="filter-button" onClick={handleApply}>
                Apply Filters
              </button>
              <button className="filter-button" onClick={resetFilters}>
                Reset Filters
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              fontSize: "0.9rem",
              color: "#757575",
            }}
          >
            <strong>Current Filters:</strong>

            {activeFilters.length === 0 ? (
              <span style={{ marginLeft: "0.5rem" }}>No filters applied</span>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginTop: "0.75rem",
                }}
              >
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.35rem 0.6rem",
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "999px",
                      color: "#333",
                    }}
                  >
                    <strong>{filter.label}:</strong> {filter.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FiltersPanel;