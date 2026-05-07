import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
const config = require("../config.json");

const AdversityPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteThreshold, setFavoriteThreshold] = useState(0.65);
  const [adversityDrop, setAdversityDrop] = useState(0.25);

  const fetchData = (threshold, drop) => {
    setLoading(true);
    fetch(
      `http://${config.server_host}:${config.server_port}/favorites/adversity-performance?favorite_threshold=${threshold}&adversity_drop=${drop}`
    )
      .then((res) => res.json())
      .then((json) => {
        if (json.queryError) {
          setError(`Query error: ${json.queryError}`);
          setData([]);
        } else {
          setData(Array.isArray(json) ? json : []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load adversity data");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(favoriteThreshold, adversityDrop);
  }, []);

  const chartData = data.map((row) => {
    const hadAdversity =
      parseInt(row.experienced_major_adversity) === 1 ||
      row.experienced_major_adversity === true;
    return {
      group: hadAdversity ? "Faced Adversity" : "No Major Adversity",
      num_games: parseInt(row.num_games),
      avg_pregame_prob: parseFloat(row.avg_pregame_prob),
      favorite_win_rate: parseFloat(row.favorite_win_rate),
    };
  });

  if (loading) return <div className="loading">Loading Adversity Performance...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard-container">
      <h1>Favorite Adversity Performance</h1>
      <p style={{ color: "#757575", marginBottom: "1.5rem" }}>
        Compares the win rate of pre-game favorites in two situations: games where the
        favorite's Vegas win probability fell by more than{" "}
        <strong>{(adversityDrop * 100).toFixed(0)} percentage points</strong> from where it
        stood at kickoff ("Faced Adversity" — the opponent had a real shot at some point),
        versus games where the favorite's lead never eroded that much ("No Major Adversity" —
        a relatively comfortable game throughout). Uses the Vegas win probability from NFL
        play-by-play data.
      </p>

      <div className="filters-panel">
        <h2>Parameters</h2>
        <div className="filter-group">
          <div className="filter-item">
            <label>Favorite Threshold (pre-game prob ≥)</label>
            <input
              type="number"
              min="0.5"
              max="1"
              step="0.05"
              value={favoriteThreshold}
              onChange={(e) => setFavoriteThreshold(parseFloat(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && fetchData(favoriteThreshold, adversityDrop)}
            />
          </div>
          <div className="filter-item">
            <label>Adversity Drop (WP must fall this many points from kickoff WP)</label>
            <input
              type="number"
              min="0.05"
              max="0.5"
              step="0.05"
              value={adversityDrop}
              onChange={(e) => setAdversityDrop(parseFloat(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && fetchData(favoriteThreshold, adversityDrop)}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              className="filter-button"
              onClick={() => fetchData(favoriteThreshold, adversityDrop)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <>
          <div className="chart-container">
            <h2>Win Rate: Adversity vs. No Adversity</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip
                  formatter={(v, name) =>
                    name === "num_games" ? v : `${(v * 100).toFixed(1)}%`
                  }
                />
                <Legend />
                <Bar
                  dataKey="avg_pregame_prob"
                  name="Avg Pre-game Prob"
                  fill="#1a73e8"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="favorite_win_rate"
                  name="Actual Win Rate"
                  fill="#4caf50"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="summary-cards">
            {chartData.map((row, idx) => (
              <div
                key={idx}
                className={`card ${row.favorite_win_rate >= row.avg_pregame_prob ? "success" : "danger"}`}
              >
                <h3>{row.group}</h3>
                <div className="value">{(row.favorite_win_rate * 100).toFixed(1)}%</div>
                <div className="subtext">
                  Win rate across {row.num_games} games · avg pre-game prob{" "}
                  {(row.avg_pregame_prob * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {chartData.length === 0 && !loading && (
        <p style={{ color: "#757575", marginTop: "2rem" }}>
          No data returned. Try lowering the favorite threshold or adversity drop.
        </p>
      )}
    </div>
  );
};

export default AdversityPage;
