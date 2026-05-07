import React, { useEffect, useState } from "react";
const config = require("../config.json");

const SummaryCards = ({ filters = {} }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const minProb = filters.favorite_threshold || 0.5;
      const volatilityThreshold = filters.volatility_threshold || 0.5;

      try {
        const [
          favoriteWinRateRes,
          underdogWinRateRes,
          volatilityRes,
          accuracyRes,
        ] = await Promise.all([
          fetch(
            `${config.api_base_url}/favorites/win-rate?min_prob=${minProb}`
          ),
          fetch(
            `${config.api_base_url}/underdogs/win-rate?max_prob=${(1 - minProb).toFixed(2)}`
          ),
          fetch(
            `${config.api_base_url}/market/volatility-comparison?volatility_threshold=${volatilityThreshold}`
          ),
          fetch(
            `${config.api_base_url}/market/accuracy-by-week`
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
  }, [filters]);

  if (loading) return <div className="loading">Loading summary cards</div>;

  const minProb = filters.favorite_threshold || 0.5;
  const volThreshold = filters.volatility_threshold || 0.5;

  return (
    <div>
    <p style={{ fontSize: "0.85rem", color: "#757575", marginBottom: "0.5rem" }}>
      Favorites: win probability ≥ {minProb} &nbsp;·&nbsp; Underdogs: win probability ≤ {(1 - minProb).toFixed(2)} &nbsp;·&nbsp; Volatility threshold: {volThreshold}
    </p>
    <div className="summary-cards">
      {cards.map((card, idx) => (
        <div key={idx} className={`card ${card.type}`}>
          <h3>{card.title}</h3>
          <div className="value">{card.value}</div>
          <div className="subtext">{card.subtext}</div>
        </div>
      ))}
    </div>
    </div>
  );
};

export default SummaryCards;
