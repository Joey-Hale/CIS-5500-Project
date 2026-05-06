import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import TeamMarketHistoryPage from "./pages/TeamMarketHistoryPage";
import "./index.css";

function App() {
  return (
    <Router>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/team-history">Team History</Link>
          </li>
        </ul>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/team-history" element={<TeamMarketHistoryPage />} />
      </Routes>
    </Router>
  );
}

export default App;
