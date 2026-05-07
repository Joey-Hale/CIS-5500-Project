import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import TeamMarketHistoryPage from "./pages/TeamMarketHistoryPage";
import TeamMarketBiasPage from "./pages/TeamMarketBiasPage";
import AdversityPage from "./pages/AdversityPage";
import HypeFadePage from "./pages/HypeFadePage";
import VegasVsKalshiPage from "./pages/VegasVsKalshiPage";
import ScoreVsMarketPage from "./pages/ScoreVsMarketPage";
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
          <li>
            <Link to="/team-bias">Market Bias</Link>
          </li>
          <li>
            <Link to="/adversity">Adversity</Link>
          </li>
          <li>
            <Link to="/hype-fade">Hype Fade</Link>
          </li>
          <li>
            <Link to="/vegas-vs-kalshi">Vegas vs Kalshi</Link>
          </li>
          <li>
            <Link to="/score-vs-market">Score vs Market</Link>
          </li>
        </ul>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/team-history" element={<TeamMarketHistoryPage />} />
        <Route path="/team-bias" element={<TeamMarketBiasPage />} />
        <Route path="/adversity" element={<AdversityPage />} />
        <Route path="/hype-fade" element={<HypeFadePage />} />
        <Route path="/vegas-vs-kalshi" element={<VegasVsKalshiPage />} />
        <Route path="/score-vs-market" element={<ScoreVsMarketPage />} />
      </Routes>
    </Router>
  );
}

export default App;
