import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
const config = require("../config.json");

const ScoreVsMarketPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${config.api_base_url}/market/score-vs-market`)
      .then((res) => res.json())
      .then((json) => {
        if (json.queryError) {
          setError(`Query error: ${json.queryError}`);
        } else {
          setData(Array.isArray(json) ? json : []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load score vs market data");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading Score vs Market data...</div>;
  if (error) return <div className="error">{error}</div>;

  const chartData = data.map((row) => ({
    score_diff: parseInt(row.score_diff),
    kalshi: parseFloat(row.avg_kalshi_home_price),
    vegas: parseFloat(row.avg_vegas_wp),
    observations: parseInt(row.num_observations),
  }));

  const totalObs = chartData.reduce((s, d) => s + d.observations, 0);

  return (
    <div className="dashboard-container">
      <h1>Score Differential vs. Market Price</h1>
      <p style={{ color: "#757575", marginBottom: "1.5rem" }}>
        For each in-game score differential (home score − away score), this shows the average
        Kalshi market price observed at that moment across all games. Built from a timestamp
        join between NFL play-by-play data and Kalshi 1-minute price candles — each play's
        UTC timestamp is matched to the most recent Kalshi candle within 2 minutes. The
        resulting S-curve shows how crowd pricing responds to the live score: when the home
        team is tied the market sits near 52% (reflecting home-field advantage), and each
        touchdown shifts it roughly 10–15 percentage points.
      </p>

      {chartData.length > 0 && (
        <>
          <div className="summary-cards">
            <div className="card info">
              <h3>Score Bands</h3>
              <div className="value">{chartData.length}</div>
              <div className="subtext">Distinct score differentials with ≥5 observations</div>
            </div>
            <div className="card success">
              <h3>Total Observations</h3>
              <div className="value">{totalObs.toLocaleString()}</div>
              <div className="subtext">Play–candle timestamp matches</div>
            </div>
            <div className="card success">
              <h3>Tied Game (0)</h3>
              <div className="value">
                {chartData.find((d) => d.score_diff === 0)
                  ? `${(chartData.find((d) => d.score_diff === 0).kalshi * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <div className="subtext">Avg Kalshi home price when tied</div>
            </div>
            <div className="card info">
              <h3>Score Range</h3>
              <div className="value">
                {Math.min(...chartData.map((d) => d.score_diff))} to{" "}
                {Math.max(...chartData.map((d) => d.score_diff))}
              </div>
              <div className="subtext">Home − away score differential</div>
            </div>
          </div>

          <div className="chart-container">
            <h2>Kalshi Market Price by Live Score Differential</h2>
            <p style={{ color: "#757575", marginBottom: "1rem" }}>
              Each point is the average Kalshi home-team price across all plays where the
              score stood at that differential. Only differentials with ≥100 timestamp-matched
              observations are shown to ensure statistical reliability.
            </p>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="score_diff"
                  label={{ value: "Score Differential (Home − Away)", position: "insideBottom", offset: -10 }}
                  height={50}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(v) => [`${(v * 100).toFixed(1)}%`, "Kalshi Home Price"]}
                  labelFormatter={(label) => `Score diff: ${label > 0 ? "+" : ""}${label}`}
                />
                <ReferenceLine x={0} stroke="#999" strokeDasharray="4 4" label="Tied" />
                <ReferenceLine y={0.5} stroke="#ccc" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="kalshi"
                  name="Kalshi Home Price"
                  stroke="#1a73e8"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="table-container">
            <h2>By Score Differential</h2>
            <table>
              <thead>
                <tr>
                  <th>Score Diff</th>
                  <th>Observations</th>
                  <th>Avg Kalshi Home Price</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => {
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>
                        {row.score_diff > 0 ? "+" : ""}{row.score_diff}
                      </td>
                      <td>{row.observations.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: "#1a73e8" }}>
                        {(row.kalshi * 100).toFixed(1)}%
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
          No data returned. This query requires matching UTC timestamps between Plays and
          Kalshi_Prices candles. Verify that timestamp_utc is populated in the Plays table.
        </p>
      )}
    </div>
  );
};

export default ScoreVsMarketPage;
