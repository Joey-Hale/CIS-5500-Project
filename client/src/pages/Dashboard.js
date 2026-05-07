import React, { useState, useEffect } from "react";
import FiltersPanel from "../components/FiltersPanel";
import MarketAccuracyChart from "../components/MarketAccuracyChart";
import MarketSwingsTable from "../components/MarketSwingsTable";
import FavoriteCalibrationChart from "../components/FavoriteCalibrationChart";
import SummaryCards from "../components/SummaryCards";
const config = require("../config.json");

const Dashboard = () => {
  const [filters, setFilters] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});
  const [coverage, setCoverage] = useState(null);

  const handleApply = (nextFilters = filters) => {
    setAppliedFilters({ ...nextFilters });
  };

  useEffect(() => {
    fetch(`${config.api_base_url}/games/coverage`)
      .then((res) => res.json())
      .then((json) => setCoverage(Array.isArray(json) ? json[0] : json))
      .catch(() => {});
  }, []);

  return (
    <div className="dashboard-container">
      <h1>NFL Market Analytics Dashboard</h1>

      {coverage && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginBottom: "0.75rem" }}>Dataset Coverage</h2>
          <p style={{ color: "#757575", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            Games verified using EXISTS / NOT EXISTS checks against Kalshi_Markets and Plays tables.
          </p>
          <div className="summary-cards">
            <div className="card info">
              <h3>Total Games</h3>
              <div className="value">{parseInt(coverage.total_games).toLocaleString()}</div>
              <div className="subtext">In the Games table</div>
            </div>
            <div className="card success">
              <h3>With Kalshi Data</h3>
              <div className="value">{parseInt(coverage.games_with_kalshi).toLocaleString()}</div>
              <div className="subtext">
                {((coverage.games_with_kalshi / coverage.total_games) * 100).toFixed(1)}% of games
              </div>
            </div>
            <div className="card warning">
              <h3>Without Kalshi Data</h3>
              <div className="value">{parseInt(coverage.games_without_kalshi).toLocaleString()}</div>
              <div className="subtext">No prediction market available</div>
            </div>
            <div className="card success">
              <h3>Complete Data</h3>
              <div className="value">{parseInt(coverage.games_with_complete_data).toLocaleString()}</div>
              <div className="subtext">Both Kalshi + play-by-play</div>
            </div>
          </div>
        </div>
      )}

      <FiltersPanel filters={filters} setFilters={setFilters} onApply={handleApply} />
      <SummaryCards filters={appliedFilters} />
      <div className="visualizations">
        <MarketAccuracyChart />
        <FavoriteCalibrationChart />
        <MarketSwingsTable filters={appliedFilters} />
      </div>
    </div>
  );
};

export default Dashboard;
