import React, { useEffect, useState } from "react";
const config = require("../config.json");

const MarketSwingsTable = ({ filters = {} }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("price_swing");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const limit = filters.limit || 50;
    fetch(
      `http://${config.server_host}:${config.server_port}/games/market-swings?limit=${limit}`
    )
      .then((res) => res.json())
      .then((json) => {
        setData(json.rows || json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load market swings data");
        setLoading(false);
      });
  }, [filters]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const getSortedData = () => {
    const sorted = [...data].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      } else {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  };

  const SortIndicator = ({ column }) => {
    if (sortBy !== column) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  if (loading) return <div className="loading">Loading Market Swings</div>;
  if (error) return <div className="error">{error}</div>;

  const sortedData = getSortedData();

  return (
    <div className="table-container">
      <h2>Biggest Market Swings</h2>
      <p style={{ color: "#757575", marginBottom: "1rem" }}>
        Top {sortedData.length} games with largest price movements during play
        {filters.limit ? ` (limit: ${filters.limit})` : ""}
      </p>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("game_id")} style={{ cursor: "pointer" }}>
              Game ID <SortIndicator column="game_id" />
            </th>
            <th onClick={() => handleSort("home_team")} style={{ cursor: "pointer" }}>
              Home Team <SortIndicator column="home_team" />
            </th>
            <th onClick={() => handleSort("away_team")} style={{ cursor: "pointer" }}>
              Away Team <SortIndicator column="away_team" />
            </th>
            <th onClick={() => handleSort("target_team")} style={{ cursor: "pointer" }}>
              Target Team <SortIndicator column="target_team" />
            </th>
            <th onClick={() => handleSort("min_price")} style={{ cursor: "pointer" }}>
              Min Price <SortIndicator column="min_price" />
            </th>
            <th onClick={() => handleSort("max_price")} style={{ cursor: "pointer" }}>
              Max Price <SortIndicator column="max_price" />
            </th>
            <th onClick={() => handleSort("price_swing")} style={{ cursor: "pointer" }}>
              Price Swing <SortIndicator column="price_swing" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => {
            const swing = parseFloat(row.price_swing);
            const swingColor = swing > 0.2 ? "#f44336" : swing > 0.1 ? "#ff9800" : "#4caf50";

            return (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{row.game_id}</td>
                <td>{row.home_team}</td>
                <td>{row.away_team}</td>
                <td style={{ fontWeight: 600, color: "#1a73e8" }}>
                  {row.target_team}
                </td>
                <td>{parseFloat(row.min_price).toFixed(3)}</td>
                <td>{parseFloat(row.max_price).toFixed(3)}</td>
                <td
                  style={{
                    fontWeight: 600,
                    color: swingColor,
                    backgroundColor:
                      swingColor === "#f44336"
                        ? "#ffebee"
                        : swingColor === "#ff9800"
                        ? "#fff3e0"
                        : "#e8f5e9",
                    padding: "0.75rem",
                    borderRadius: "4px",
                  }}
                >
                  {parseFloat(row.price_swing).toFixed(3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MarketSwingsTable;
