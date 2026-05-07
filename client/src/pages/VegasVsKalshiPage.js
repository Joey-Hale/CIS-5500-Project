import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
const config = require("../config.json");

const VegasVsKalshiPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${config.api_base_url}/market/vegas-vs-kalshi`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load Vegas vs Kalshi data");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading Vegas vs Kalshi comparison...</div>;
  if (error) return <div className="error">{error}</div>;

  const chartData = data.map((row) => ({
    week: `W${row.week}`,
    kalshi: parseFloat(row.avg_kalshi_prob),
    vegas: parseFloat(row.avg_vegas_wp),
    diff: parseFloat(row.avg_diff),
    num_games: parseInt(row.num_games),
  }));

  const avgDiff =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.diff, 0) / chartData.length
      : 0;

  return (
    <div className="dashboard-container">
      <h1>Vegas Win Probability vs. Kalshi Market Price</h1>
      <p style={{ color: "#757575", marginBottom: "1.5rem" }}>
        Compares two independent estimates of each team's win probability at kickoff: the NFL
        model's Vegas-derived win probability from the first play of each game, and Kalshi's
        pre-game market price. A positive difference means Kalshi bettors were more optimistic
        than the Vegas model; negative means Kalshi was more pessimistic.
      </p>

      {chartData.length > 0 && (
        <>
          <div className="summary-cards">
            <div className="card info">
              <h3>Weeks Analyzed</h3>
              <div className="value">{chartData.length}</div>
              <div className="subtext">NFL regular season weeks</div>
            </div>
            <div className="card success">
              <h3>Avg Kalshi Prob</h3>
              <div className="value">
                {(chartData.reduce((s, d) => s + d.kalshi, 0) / chartData.length * 100).toFixed(1)}%
              </div>
              <div className="subtext">Pre-game market estimate</div>
            </div>
            <div className="card warning">
              <h3>Avg Vegas WP</h3>
              <div className="value">
                {(chartData.reduce((s, d) => s + d.vegas, 0) / chartData.length * 100).toFixed(1)}%
              </div>
              <div className="subtext">NFL model win probability</div>
            </div>
            <div className={`card ${avgDiff > 0 ? "danger" : "success"}`}>
              <h3>Avg Difference</h3>
              <div className="value">
                {avgDiff > 0 ? "+" : ""}{(avgDiff * 100).toFixed(1)}%
              </div>
              <div className="subtext">Kalshi minus Vegas (season avg)</div>
            </div>
          </div>

          <div className="chart-container">
            <h2>Probability Comparison by Week</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis
                  domain={[0.3, 0.8]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="kalshi"
                  name="Kalshi Pre-game Price"
                  stroke="#1a73e8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="vegas"
                  name="Vegas Win Probability"
                  stroke="#f44336"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  strokeDasharray="5 5"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h2>Kalshi − Vegas Difference by Week</h2>
            <p style={{ color: "#757575", marginBottom: "1rem" }}>
              Positive = Kalshi market is more optimistic than Vegas model · Negative = Kalshi is more pessimistic
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} />
                <ReferenceLine y={0} stroke="#333" strokeWidth={2} />
                <Bar
                  dataKey="diff"
                  name="Kalshi − Vegas"
                  fill="#ff9800"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="table-container">
            <h2>Weekly Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Games</th>
                  <th>Avg Kalshi Prob</th>
                  <th>Avg Vegas WP</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => {
                  const diff = row.diff;
                  const diffColor = diff > 0.03 ? "#f44336" : diff < -0.03 ? "#4caf50" : "#ff9800";
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.week}</td>
                      <td>{row.num_games}</td>
                      <td>{(row.kalshi * 100).toFixed(1)}%</td>
                      <td>{(row.vegas * 100).toFixed(1)}%</td>
                      <td style={{ fontWeight: 600, color: diffColor }}>
                        {diff > 0 ? "+" : ""}{(diff * 100).toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {chartData.length === 0 && !loading && (
        <p style={{ color: "#757575", marginTop: "2rem" }}>
          No data available. Verify that Plays and Kalshi_Prices tables have overlapping game IDs.
        </p>
      )}
    </div>
  );
};

export default VegasVsKalshiPage;
