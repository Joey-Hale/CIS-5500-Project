import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
const config = require("../config.json");

const MarketAccuracyChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(
      `${config.api_base_url}/market/accuracy-by-week`
    )
      .then((res) => res.json())
      .then((json) => {
        const processedData = (json.rows || json).map((row) => ({
          week: `W${row.week}`,
          games: row.numberoffgames,
          predicted: parseFloat(row.avg_predicted),
          actual: parseFloat(row.actual),
          error: parseFloat(row.error),
        }));
        setData(processedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load market accuracy data");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading Market Accuracy</div>;
  if (error) return <div className="error">{error}</div>;
  if (data.length === 0)
    return (
      <div className="chart-container">
        <h2>Market Accuracy by Week</h2>
        <p style={{ textAlign: "center", color: "#757575" }}>No data available</p>
      </div>
    );

  return (
    <div className="chart-container">
      <h2>Market Accuracy by Week</h2>

      <h3 style={{ marginTop: "2rem", marginBottom: "1rem", fontSize: "1.1rem" }}>
        Predicted vs Actual Win Rates
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="predicted" fill="#1a73e8" name="Avg Predicted" />
          <Bar dataKey="actual" fill="#4caf50" name="Actual Win Rate" />
        </ComposedChart>
      </ResponsiveContainer>

      <h3 style={{ marginTop: "2rem", marginBottom: "1rem", fontSize: "1.1rem" }}>
        Prediction Error by Week
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="error"
            stroke="#f57c00"
            name="Mean Absolute Error"
            strokeWidth={2}
            dot={{ fill: "#f57c00", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
          Weekly Statistics
        </h3>
        <table style={{ fontSize: "0.9rem" }}>
          <thead>
            <tr>
              <th>Week</th>
              <th>Games</th>
              <th>Avg Predicted</th>
              <th>Actual</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td>{row.week}</td>
                <td>{row.games}</td>
                <td>{row.predicted.toFixed(3)}</td>
                <td>{row.actual.toFixed(3)}</td>
                <td>{row.error.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketAccuracyChart;
