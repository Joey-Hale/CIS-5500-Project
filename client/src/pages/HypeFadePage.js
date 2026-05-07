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

const HypeFadePage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [minPriceDrop, setMinPriceDrop] = useState(0.05);
  const [windowSize, setWindowSize] = useState(5);
  const [sortBy, setSortBy] = useState("price_change");
  const [sortOrder, setSortOrder] = useState("asc");

  const fetchData = (drop, window) => {
    setLoading(true);
    fetch(
      `${config.api_base_url}/markets/early-hype-fade?min_early_volume_share=${drop}&window_size=${window}`
    )
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load early hype fade data");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(minPriceDrop, windowSize);
  }, []);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const getSortedData = () =>
    [...data].sort((a, b) => {
      let aVal =
        typeof a[sortBy] === "string"
          ? a[sortBy].toLowerCase()
          : parseFloat(a[sortBy]) || 0;
      let bVal =
        typeof b[sortBy] === "string"
          ? b[sortBy].toLowerCase()
          : parseFloat(b[sortBy]) || 0;
      if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const SortIndicator = ({ column }) => {
    if (sortBy !== column) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  // Top 20 worst drops for the bar chart
  const chartData = [...data]
    .sort((a, b) => parseFloat(a.price_change) - parseFloat(b.price_change))
    .slice(0, 20)
    .map((row) => ({
      label: row.target_team,
      drop: Math.abs(parseFloat(row.price_change)),
      early: parseFloat(row.early_price),
      late: parseFloat(row.late_price),
      ticker: row.market_ticker,
    }));

  if (loading) return <div className="loading">Loading Market Price Fades...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard-container">
      <h1>Market Price Fade Analysis</h1>
      <p style={{ color: "#757575", marginBottom: "1.5rem" }}>
        Markets where the opening price (first {windowSize} candles) was significantly higher
        than the closing price (last {windowSize} candles). A large drop means the market
        started optimistic about a team winning, but prices fell as the game progressed —
        revealing how crowd sentiment shifted in real time.
      </p>

      <div className="filters-panel">
        <h2>Parameters</h2>
        <div className="filter-group">
          <div className="filter-item">
            <label>Min Price Drop (opening avg − closing avg ≥)</label>
            <input
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              value={minPriceDrop}
              onChange={(e) => setMinPriceDrop(parseFloat(e.target.value))}
              onKeyDown={(e) =>
                e.key === "Enter" && fetchData(minPriceDrop, windowSize)
              }
            />
          </div>
          <div className="filter-item">
            <label>Window Size (candles to average for open/close)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={windowSize}
              onChange={(e) => setWindowSize(parseInt(e.target.value))}
              onKeyDown={(e) =>
                e.key === "Enter" && fetchData(minPriceDrop, windowSize)
              }
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              className="filter-button"
              onClick={() => fetchData(minPriceDrop, windowSize)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <>
          <div className="chart-container">
            <h2>Biggest Price Drops (Top 20 Markets)</h2>
            <p style={{ color: "#757575", marginBottom: "1rem" }}>
              Opening price vs. closing price for the 20 markets with the largest fade.
              A team at 0.8 early that ends at 0.2 had a strong reversal.
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(v, name) => `${(v * 100).toFixed(1)}%`}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.ticker || label
                  }
                />
                <Legend />
                <Bar
                  dataKey="early"
                  name="Opening Price"
                  fill="#1a73e8"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="late"
                  name="Closing Price"
                  fill="#f44336"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="table-container">
            <h2>All Fading Markets</h2>
            <p style={{ color: "#757575", marginBottom: "1rem" }}>
              {data.length} markets where price dropped ≥ {minPriceDrop} from open to close
            </p>
            <table>
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("market_ticker")}
                    style={{ cursor: "pointer" }}
                  >
                    Market <SortIndicator column="market_ticker" />
                  </th>
                  <th
                    onClick={() => handleSort("target_team")}
                    style={{ cursor: "pointer" }}
                  >
                    Team <SortIndicator column="target_team" />
                  </th>
                  <th
                    onClick={() => handleSort("num_candles")}
                    style={{ cursor: "pointer" }}
                  >
                    Candles <SortIndicator column="num_candles" />
                  </th>
                  <th
                    onClick={() => handleSort("early_price")}
                    style={{ cursor: "pointer" }}
                  >
                    Opening Price <SortIndicator column="early_price" />
                  </th>
                  <th
                    onClick={() => handleSort("late_price")}
                    style={{ cursor: "pointer" }}
                  >
                    Closing Price <SortIndicator column="late_price" />
                  </th>
                  <th
                    onClick={() => handleSort("price_change")}
                    style={{ cursor: "pointer" }}
                  >
                    Price Drop <SortIndicator column="price_change" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedData().map((row, idx) => {
                  const drop = Math.abs(parseFloat(row.price_change));
                  const dropColor =
                    drop > 0.3 ? "#f44336" : drop > 0.15 ? "#ff9800" : "#757575";
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {row.market_ticker}
                      </td>
                      <td style={{ fontWeight: 600, color: "#1a73e8" }}>
                        {row.target_team}
                      </td>
                      <td>{row.num_candles}</td>
                      <td>{parseFloat(row.early_price).toFixed(3)}</td>
                      <td>{parseFloat(row.late_price).toFixed(3)}</td>
                      <td style={{ fontWeight: 600, color: dropColor }}>
                        −{drop.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.length === 0 && !loading && (
        <p style={{ color: "#757575", marginTop: "2rem" }}>
          No markets matched. Try lowering the minimum price drop threshold.
        </p>
      )}
    </div>
  );
};

export default HypeFadePage;
