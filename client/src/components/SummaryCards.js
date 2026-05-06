import React, { useEffect, useState } from "react";
const config = require("../config.json");

const SummaryCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch multiple endpoints
        const [
          favoriteWinRateRes,
          underdogWinRateRes,
          volatilityRes,
          accuracyRes,
        ] = await Promise.all([
          fetch(
            `http://${config.server_host}:${config.server_port}/favorites/win-rate`
          ),
          fetch(
            `http://${config.server_host}:${config.server_port}/underdogs/win-rate`
          ),
          fetch(
            `http://${config.server_host}:${config.server_port}/market/volatility-comparison?volatility_threshold=0.05`
          ),
          fetch(
            `http://${config.server_host}:${config.server_port}/market/accuracy-by-week`
          ),
        ]);

        const favoriteData = await favoriteWinRateRes.json();
        const underdogData = await underdogWinRateRes.json();
        const volatilityData = await volatilityRes.json();
        const accuracyData = await accuracyRes.json();

        const newCards = [
          {
            title: "Favorite Win Rate",
            value:
              favoriteData[0]?.favorite_win_rate !== undefined
                ? `${(favoriteData[0].favorite_win_rate * 100).toFixed(1)}%`
                : "N/A",
            subtext: `${favoriteData[0]?.total_games || 0} games analyzed`,
            type: "success",
          },
          {
            title: "Underdog Win Rate",
            value:
              underdogData[0]?.underdog_win_rate !== undefined
                ? `${(underdogData[0].underdog_win_rate * 100).toFixed(1)}%`
                : "N/A",
            subtext: `${underdogData[0]?.total_underdog_games || 0} games analyzed`,
            type: "info",
          },
          {
            title: "High Volatility Accuracy",
            value:
              volatilityData
                .find((d) => d.volatility_group === "high_volatility")
                ?.avg_error !== undefined
                ? `${(
                    (1 -
                      volatilityData.find(
                        (d) => d.volatility_group === "high_volatility"
                      )?.avg_error) *
                    100
                  ).toFixed(1)}%`
                : "N/A",
            subtext: "Market prediction accuracy",
            type: "warning",
          },
          {
            title: "Average Weekly Error",
            value:
              accuracyData.length > 0
                ? `${(
                    accuracyData.reduce((sum, d) => sum + parseFloat(d.error), 0) /
                    accuracyData.length
                  ).toFixed(3)}`
                : "N/A",
            subtext: "Mean absolute prediction error",
            type: "danger",
          },
        ];

        setCards(newCards);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching summary data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading summary cards</div>;

  return (
    <div className="summary-cards">
      {cards.map((card, idx) => (
        <div key={idx} className={`card ${card.type}`}>
          <h3>{card.title}</h3>
          <div className="value">{card.value}</div>
          <div className="subtext">{card.subtext}</div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
