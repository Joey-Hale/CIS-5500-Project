import React from "react";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="home-container">
      <div className="hero">
        <h2>NFL Market Analytics</h2>
        <p>
          Explore predictive market data, analyze game outcomes, and discover
          market inefficiencies in the NFL
        </p>
        <Link to="/dashboard" className="cta-button">
          Go to Dashboard
        </Link>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <h3>Market Accuracy</h3>
          <p>
            Track how well market predictions align with actual game outcomes
            across different weeks
          </p>
        </div>

        <div className="feature-card">
          <h3>Price Swings</h3>
          <p>
            Identify the biggest market movements during games and analyze
            team-specific betting patterns
          </p>
        </div>

        <div className="feature-card">
          <h3>Volatility Analysis</h3>
          <p>
            Compare prediction accuracy between high and low volatility games
          </p>
        </div>

        <div className="feature-card">
          <h3>Favorites vs Underdogs</h3>
          <p>
            Analyze win rates and market calibration for favored and underdog
            teams
          </p>
        </div>

        <div className="feature-card">
          <h3>Adversity Performance</h3>
          <p>
            Study how favorites perform when experiencing major adversity during
            games
          </p>
        </div>

        <div className="feature-card">
          <h3>Team Market Trends</h3>
          <p>
            Explore historical market data and betting patterns for individual
            NFL teams
          </p>
        </div>

        <div className="feature-card">
          <h3>Overvalued vs Undervalued</h3>
          <p>Find which teams are overvalued or undervalued by the market</p>
        </div>

        <div className="feature-card">
          <h3>Market Calibration</h3>
          <p>
            Measure how well market predictions align with actual outcomes,
            identifying systemic biases
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
