import React, { useState } from "react";
import FiltersPanel from "../components/FiltersPanel";
import MarketAccuracyChart from "../components/MarketAccuracyChart";
import MarketSwingsTable from "../components/MarketSwingsTable";
import FavoriteCalibrationChart from "../components/FavoriteCalibrationChart";
import SummaryCards from "../components/SummaryCards";

const Dashboard = () => {
  const [filters, setFilters] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});

  const handleApply = () => setAppliedFilters({ ...filters });

  return (
    <div className="dashboard-container">
      <h1>NFL Market Analytics Dashboard</h1>
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
