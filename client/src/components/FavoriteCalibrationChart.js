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

const FavoriteCalibrationChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(
      `${config.api_base_url}/favorites/calibration`
    )
      .then((res) => res.json())
      .then((json) => {
        const processedData = (json.rows || json).map((row) => ({
          name: row.favorite_strength
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          predicted: parseFloat(row.avg_predicted),
          actual: parseFloat(row.actual_win_rate),
          games: row.num_games,
        }));
        setData(processedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load calibration data");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading Calibration Data</div>;
  if (error) return <div className="error">{error}</div>;
  if (data.length === 0)
    return (
      <div className="chart-container">
        <h2>Favorite Calibration</h2>
        <p style={{ textAlign: "center", color: "#757575" }}>No data available</p>
      </div>
    );

  return (
    <div className="chart-container">
      <h2>Favorite Calibration Analysis</h2>
      <p style={{ color: "#757575", marginBottom: "1rem" }}>
        Comparison of predicted vs actual win rates by favorite strength
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="predicted" fill="#1a73e8" name="Predicted Probability" />
          <Bar dataKey="actual" fill="#4caf50" name="Actual Win Rate" />
        </BarChart>
      </ResponsiveContainer>

      <table style={{ marginTop: "2rem", fontSize: "0.9rem" }}>
        <thead>
          <tr>
            <th>Favorite Strength</th>
            <th>Games</th>
            <th>Predicted Prob</th>
            <th>Actual Win Rate</th>
            <th>Calibration</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const calibration = (row.actual - row.predicted).toFixed(3);
            const calibrationColor =
              Math.abs(calibration) < 0.05 ? "#4caf50" : "#ff9800";
            return (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{row.name}</td>
                <td>{row.games}</td>
                <td>{row.predicted.toFixed(3)}</td>
                <td>{row.actual.toFixed(3)}</td>
                <td
                  style={{
                    color: calibrationColor,
                    fontWeight: 600,
                  }}
                >
                  {calibration > 0 ? "+" : ""}{calibration}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FavoriteCalibrationChart;
