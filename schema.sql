CREATE TABLE Teams (
    team_abbr VARCHAR(5) PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL
);

CREATE TABLE Games (
    game_id VARCHAR(50) PRIMARY KEY,
    season INT,
    week INT,
    game_date DATE,
    home_team VARCHAR(5) REFERENCES Teams(team_abbr),
    away_team VARCHAR(5) REFERENCES Teams(team_abbr)
);

CREATE TABLE Plays (
    game_id VARCHAR(50) REFERENCES Games(game_id),
    play_id INT,
    qtr INT,
    quarter_seconds_remaining FLOAT,
    down INT,
    ydstogo INT,
    play_type VARCHAR(50),
    description TEXT,
    total_home_score INT,
    total_away_score INT,
    wp FLOAT,
    vegas_wp FLOAT,
    interception INT,
    fumble INT,
    touchdown INT,
    timestamp_utc TIMESTAMP,
    PRIMARY KEY (game_id, play_id)
);

CREATE TABLE Kalshi_Markets (
    market_ticker VARCHAR(100) PRIMARY KEY,
    game_id VARCHAR(50) REFERENCES Games(game_id),
    target_team VARCHAR(5) REFERENCES Teams(team_abbr),
    market_title TEXT
);

CREATE TABLE Kalshi_Prices (
    market_ticker VARCHAR(100) REFERENCES Kalshi_Markets(market_ticker),
    datetime_utc TIMESTAMP,
    kalshi_open FLOAT,
    kalshi_high FLOAT,
    kalshi_low FLOAT,
    kalshi_close FLOAT,
    kalshi_volume INT,
    PRIMARY KEY (market_ticker, datetime_utc)
);

-- Earliest Kalshi price per market (approximates kickoff-time probability)
CREATE OR REPLACE VIEW pregame_prices AS
SELECT
    km.market_ticker,
    km.game_id,
    km.target_team,
    kp.kalshi_close,
    ROW_NUMBER() OVER (
        PARTITION BY km.market_ticker
        ORDER BY kp.datetime_utc ASC
    ) AS rn
FROM Kalshi_Markets km
JOIN Kalshi_Prices kp ON km.market_ticker = kp.market_ticker
WHERE kp.kalshi_close > 0;

-- Final score winner derived from the last play of each game
CREATE OR REPLACE VIEW game_results AS
SELECT DISTINCT ON (p.game_id)
    p.game_id,
    CASE
        WHEN p.total_home_score > p.total_away_score THEN g.home_team
        WHEN p.total_away_score > p.total_home_score THEN g.away_team
    END AS winner
FROM Plays p
JOIN Games g ON p.game_id = g.game_id
ORDER BY
    p.game_id,
    p.qtr DESC,
    p.quarter_seconds_remaining ASC,
    p.play_id DESC;

-- Total price swing (max - min) across all candlesticks per game
CREATE OR REPLACE VIEW game_volatility AS
SELECT
    km.game_id,
    MAX(kp.kalshi_close) - MIN(kp.kalshi_close) AS price_swing
FROM Kalshi_Markets km
JOIN Kalshi_Prices kp ON km.market_ticker = kp.market_ticker
GROUP BY km.game_id;

-- All teams' kickoff-time market probability and outcome per game (no threshold filter)
CREATE OR REPLACE VIEW favorite_summary AS
SELECT
    pp.game_id,
    pp.target_team AS favorite_team,
    pp.kalshi_close AS favorite_prob,
    CASE
        WHEN gr.winner = pp.target_team THEN 1.0
        ELSE 0.0
    END AS favorite_won
FROM pregame_prices pp
JOIN game_results gr ON pp.game_id = gr.game_id
WHERE pp.rn = 1;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_plays_game ON Plays(game_id, qtr, quarter_seconds_remaining);
CREATE INDEX IF NOT EXISTS idx_kalshi_prices_ticker_time ON Kalshi_Prices(market_ticker, datetime_utc);
CREATE INDEX IF NOT EXISTS idx_kalshi_markets_team ON Kalshi_Markets(target_team);
CREATE INDEX IF NOT EXISTS idx_plays_wp ON Plays(game_id, wp) WHERE wp IS NOT NULL;
