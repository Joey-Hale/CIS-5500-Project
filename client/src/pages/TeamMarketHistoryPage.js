import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
const config = require("../config.json");

const TeamMarketHistoryPage = () => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const NFL_TEAMS = [
    "KC",
    "CIN",
    "BUF",
    "MIA",
    "NYJ",
    "PIT",
    "BAL",
    "CLE",
    "LAC",
    "LV",
    "DEN",
    "KC",
    "TB",
    "NO",
    "ATL",
    "CAR",
    "PHI",
    "DAL",
    "WAS",
    "NYG",
    "SF",
    "LAR",
    "SEA",
    "ARI",
    "GB",
    "MIN",
    "DET",
    "CHI",
    "IND",
    "TEN",
    "HOU",
    "JAX",
    "NE",
    "BUF",
  ];

  const uniqueTeams = [...new Set(NFL_TEAMS)].sort();

  const handleTeamChange = (e) => {
    const team = e.target.value;
    setSelectedTeam(team);
    if (team) {
      fetchTeamHistory(team);
    } else {
      setData([]);
      setError(null);
    }
  };

  const fetchTeamHistory = async (team) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${config.api_base_url}/markets/${team}`,
      );
      const result = await response.json();

      if (Array.isArray(result) && result.length > 0) {
        const processedData = result.map((row) => ({
          date: new Date(row.datetime_utc).toLocaleDateString(),
          time: new Date(row.datetime_utc).toLocaleTimeString(),
          ticker: row.market_ticker,
          open: parseFloat(row.kalshi_open),
          high: parseFloat(row.kalshi_high),
          low: parseFloat(row.kalshi_low),
          close: parseFloat(row.kalshi_close),
          volume: parseInt(row.kalshi_volume),
        }));
        setData(processedData);
      } else {
        setError(`No market history found for ${team}`);
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load market history");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Team Market History</h1>

      <div className="filters-panel">
        <h2>Select Team</h2>
        <div className="filter-group">
          <div className="filter-item" style={{ flex: 1, minWidth: "250px" }}>
            <label>NFL Team</label>
            <select
              value={selectedTeam}
              onChange={handleTeamChange}
              style={{ padding: "0.75rem", fontSize: "1rem" }}
            >
              <option value="">-- Choose a team --</option>
              {uniqueTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedTeam && (
        <>
          {loading && (
            <div className="loading">
              Loading market history for {selectedTeam}
            </div>
          )}
          {error && <div className="error">{error}</div>}

          {data.length > 0 && (
            <>
              <div className="chart-container">
                <h2>Price Movement</h2>
                <p style={{ color: "#757575", marginBottom: "1rem" }}>
                  {data.length} price records for {selectedTeam}
                </p>

                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => value.toFixed(3)}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="open"
                      stroke="#2196f3"
                      name="Open"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#4caf50"
                      name="Close"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="high"
                      stroke="#ff9800"
                      name="High"
                      isAnimationActive={false}
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="low"
                      stroke="#f44336"
                      name="Low"
                      isAnimationActive={false}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="table-container">
                <h2>Detailed Price History</h2>
                <table style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Market Ticker</th>
                      <th>Open</th>
                      <th>High</th>
                      <th>Low</th>
                      <th>Close</th>
                      <th>Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 100).map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.date}</td>
                        <td>{row.time}</td>
                        <td style={{ fontWeight: 600 }}>{row.ticker}</td>
                        <td>{row.open.toFixed(3)}</td>
                        <td style={{ color: "#4caf50" }}>
                          {row.high.toFixed(3)}
                        </td>
                        <td style={{ color: "#f44336" }}>
                          {row.low.toFixed(3)}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {row.close.toFixed(3)}
                        </td>
                        <td>{row.volume.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 100 && (
                  <p
                    style={{
                      marginTop: "1rem",
                      color: "#757575",
                      fontSize: "0.9rem",
                    }}
                  >
                    Showing 100 of {data.length} records
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TeamMarketHistoryPage;
