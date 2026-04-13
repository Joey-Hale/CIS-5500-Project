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
