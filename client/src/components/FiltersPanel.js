import React, { useState } from "react";

const FiltersPanel = ({ filters, setFilters, onApply }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") onApply();
  };

  const resetFilters = () => {
    setFilters({});
    onApply && onApply();
  };

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
            <div className="filter-item">
              <label>Min Games for Analysis</label>
              <input
                type="number"
                min="1"
                value={filters.min_games || 5}
                onChange={(e) =>
                  handleFilterChange("min_games", parseInt(e.target.value))
                }
                onKeyDown={handleKeyDown}
                placeholder="Minimum games"
              />
            </div>

            <div className="filter-item">
              <label>Favorite Threshold (Probability)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={filters.favorite_threshold || 0.5}
                onChange={(e) =>
                  handleFilterChange("favorite_threshold", parseFloat(e.target.value))
                }
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
                value={filters.volatility_threshold || 0.5}
                onChange={(e) =>
                  handleFilterChange("volatility_threshold", parseFloat(e.target.value))
                }
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
                value={filters.limit || 20}
                onChange={(e) => handleFilterChange("limit", parseInt(e.target.value))}
                onKeyDown={handleKeyDown}
                placeholder="Limit results"
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="filter-button" onClick={onApply}>
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
            <p>
              <strong>Current Filters:</strong> {JSON.stringify(filters) === "{}" 
                ? "No filters applied" 
                : JSON.stringify(filters, null, 2)}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default FiltersPanel;
