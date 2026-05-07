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
  ReferenceLine,
} from "recharts";
const config = require("../config.json");

const TeamMarketBiasPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [minGames, setMinGames] = useState(5);
  const [sortBy, setSortBy] = useState("avg_signed_error");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchData = (games) => {
    setLoading(true);
    fetch(
      `http://${config.server_host}:${config.server_port}/teams/market-bias?min_games=${games}`
    )
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load team market bias data");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(minGames);
  }, []);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const getSortedData = () =>
    [...data].sort((a, b) => {
      let aVal = parseFloat(a[sortBy]) || 0;
      let bVal = parseFloat(b[sortBy]) || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const SortIndicator = ({ column }) => {
    if (sortBy !== column) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  const chartData = [...data]
    .sort((a, b) => parseFloat(b.avg_signed_error) - parseFloat(a.avg_signed_error))
    .slice(0, 20);

  if (loading) return <div className="loading">Loading Team Market Bias...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard-container">
      <h1>Team Market Bias</h1>
      <p style={{ color: "#757575", marginBottom: "1.5rem" }}>
        How much Kalshi markets over- or under-estimate each team's true win rate.
        A positive signed error means the market overestimates the team; negative means underestimates.
      </p>

      <div className="filters-panel">
        <h2>Options</h2>
        <div className="filter-group">
          <div className="filter-item">
            <label>Min Games Required</label>
            <input
              type="number"
              min="1"
              value={minGames}
              onChange={(e) => setMinGames(parseInt(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && fetchData(minGames)}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button className="filter-button" onClick={() => fetchData(minGames)}>
              Apply
            </button>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="chart-container">
          <h2>Market Signed Error by Team (Top 20)</h2>
          <p style={{ color: "#757575", marginBottom: "1rem" }}>
            Positive = market overestimates team · Negative = market underestimates team
          </p>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="target_team" angle={-45} textAnchor="end" height={70} />
              <YAxis tickFormatter={(v) => v.toFixed(2)} />
              <Tooltip formatter={(v) => parseFloat(v).toFixed(3)} />
              <Legend />
              <ReferenceLine y={0} stroke="#333" strokeWidth={2} />
              <Bar
                dataKey="avg_signed_error"
                name="Avg Signed Error"
                fill="#1a73e8"
                label={false}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="table-container">
        <h2>All Teams</h2>
        <p style={{ color: "#757575", marginBottom: "1rem" }}>
          {data.length} teams with at least {minGames} games
        </p>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("target_team")} style={{ cursor: "pointer" }}>
                Team <SortIndicator column="target_team" />
              </th>
              <th onClick={() => handleSort("num_games")} style={{ cursor: "pointer" }}>
                Games <SortIndicator column="num_games" />
              </th>
              <th onClick={() => handleSort("avg_market_prob")} style={{ cursor: "pointer" }}>
                Avg Market Prob <SortIndicator column="avg_market_prob" />
              </th>
              <th onClick={() => handleSort("actual_win_rate")} style={{ cursor: "pointer" }}>
                Actual Win Rate <SortIndicator column="actual_win_rate" />
              </th>
              <th onClick={() => handleSort("avg_signed_error")} style={{ cursor: "pointer" }}>
                Avg Signed Error <SortIndicator column="avg_signed_error" />
              </th>
            </tr>
          </thead>
          <tbody>
            {getSortedData().map((row, idx) => {
              const err = parseFloat(row.avg_signed_error);
              const errColor = err > 0.05 ? "#f44336" : err < -0.05 ? "#4caf50" : "#ff9800";
              return (
                <tr key={idx}>
                  <td style={{ fontWeight: 700 }}>{row.target_team}</td>
                  <td>{row.num_games}</td>
                  <td>{parseFloat(row.avg_market_prob).toFixed(3)}</td>
                  <td>{parseFloat(row.actual_win_rate).toFixed(3)}</td>
                  <td style={{ fontWeight: 600, color: errColor }}>
                    {err > 0 ? "+" : ""}{err.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamMarketBiasPage;
