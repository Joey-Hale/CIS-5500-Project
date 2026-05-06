import React, { useState } from "react";
import FiltersPanel from "../components/FiltersPanel";
import MarketAccuracyChart from "../components/MarketAccuracyChart";
import MarketSwingsTable from "../components/MarketSwingsTable";
import FavoriteCalibrationChart from "../components/FavoriteCalibrationChart";
import SummaryCards from "../components/SummaryCards";

const Dashboard = () => {
  const [filters, setFilters] = useState({});

  return (
    <div className="dashboard-container">
      <h1>NFL Market Analytics Dashboard</h1>
      <SummaryCards />
      <FiltersPanel filters={filters} setFilters={setFilters} />
      <div className="visualizations">
        <MarketAccuracyChart />
        <FavoriteCalibrationChart />
        <MarketSwingsTable />
      </div>
    </div>
  );
};

export default Dashboard;
