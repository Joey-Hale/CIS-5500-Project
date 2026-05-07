const { Pool, types } = require("pg");
const config = require("./config.json");

// Simple in-memory cache for expensive queries
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// Override the default parsing for BIGINT (PostgreSQL type ID 20) so no need to manually parse
types.setTypeParser(20, (val) => parseInt(val, 10));

const connection = new Pool({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db,
  ssl: {
    rejectUnauthorized: false,
  },
});
connection.connect((err) => err && console.log(err));

// Route 1: GET /teams/market-bias
const getTeamMarketBias = async function (req, res) {
  const minGames = parseInt(req.query.min_games ?? 5);
  connection.query(
    `
        SELECT
            pp.target_team,
            COUNT(*) AS num_games,
            ROUND(AVG(pp.kalshi_close)::numeric, 3) AS avg_market_prob,
            ROUND(
                AVG(
                    CASE
                        WHEN gr.winner = pp.target_team THEN 1.0
                        ELSE 0.0
                    END
                )::numeric,
                3
            ) AS actual_win_rate,
            ROUND(
                AVG(
                    pp.kalshi_close
                    - CASE
                        WHEN gr.winner = pp.target_team THEN 1.0
                        ELSE 0.0
                    END
                )::numeric,
                3
            ) AS avg_signed_error
        FROM pregame_prices pp
        JOIN game_results gr
            ON pp.game_id = gr.game_id
        WHERE
            pp.rn = 1
            AND gr.winner IS NOT NULL
        GROUP BY
            pp.target_team
        HAVING COUNT(*) >= $1
        ORDER BY avg_signed_error DESC
    `,
    [minGames],
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data.rows);
      }
    },
  );
};

// Route 2: GET /games/market-swings

const getLargestMarketSwings = async function (req, res) {
  const limit = parseInt(req.query.limit ?? 20);

  connection.query(
    `
        WITH in_game_prices AS (
            SELECT
                km.game_id,
                km.market_ticker,
                km.target_team,
                kp.kalshi_close
            FROM Kalshi_Markets km
            JOIN Games g
                ON km.game_id = g.game_id
            JOIN Kalshi_Prices kp
                ON km.market_ticker = kp.market_ticker
            WHERE kp.datetime_utc >= g.game_date::timestamp
              AND kp.kalshi_close > 0
        ),
        market_swings AS (
            SELECT
                game_id,
                market_ticker,
                target_team,
                MIN(kalshi_close) AS min_price,
                MAX(kalshi_close) AS max_price,
                MAX(kalshi_close) - MIN(kalshi_close) AS price_swing
            FROM in_game_prices
            GROUP BY
                game_id,
                market_ticker,
                target_team
        )
        SELECT
            ms.game_id,
            g.home_team,
            g.away_team,
            ms.target_team,
            ROUND(ms.min_price::numeric, 3) AS min_price,
            ROUND(ms.max_price::numeric, 3) AS max_price,
            ROUND(ms.price_swing::numeric, 3) AS price_swing
        FROM market_swings ms
        JOIN Games g
            ON ms.game_id = g.game_id
        ORDER BY ms.price_swing DESC
        LIMIT $1
    `,
    [limit],
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data.rows);
      }
    },
  );
};

// Route 3: GET /favorites/adversity-performance

const getFavoriteAdversityPerformance = async function (req, res) {
  const favoriteThreshold = parseFloat(req.query.favorite_threshold ?? 0.65);
  const adversityDrop = parseFloat(req.query.adversity_drop ?? 0.25);
  const cacheKey = `adversity-${favoriteThreshold}-${adversityDrop}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  connection.query(
    `
        WITH favorites AS (
            SELECT game_id, target_team AS favorite_team, kalshi_close AS pregame_prob
            FROM pregame_prices
            WHERE rn = 1 AND kalshi_close >= $1
        ),
        first_play AS (
            SELECT DISTINCT ON (p.game_id)
                p.game_id,
                p.vegas_wp
            FROM Plays p
            WHERE p.vegas_wp IS NOT NULL
            ORDER BY p.game_id, p.qtr ASC, p.quarter_seconds_remaining DESC, p.play_id ASC
        ),
        game_min_wp AS (
            SELECT
                f.game_id,
                f.favorite_team,
                f.pregame_prob,
                CASE WHEN f.favorite_team = g.home_team THEN fp.vegas_wp
                     ELSE 1.0::float - fp.vegas_wp
                END AS starting_fav_wp,
                MIN(CASE WHEN f.favorite_team = g.home_team THEN p.vegas_wp
                         ELSE 1.0::float - p.vegas_wp
                    END) AS min_fav_wp
            FROM favorites f
            JOIN Games g ON g.game_id = f.game_id
            JOIN first_play fp ON fp.game_id = f.game_id
            JOIN Plays p ON p.game_id = f.game_id
            WHERE p.vegas_wp IS NOT NULL
              AND NOT (p.qtr = 4 AND p.quarter_seconds_remaining < 120)
            GROUP BY f.game_id, f.favorite_team, f.pregame_prob, g.home_team, fp.vegas_wp
        ),
        game_summary AS (
            SELECT
                game_id, favorite_team, pregame_prob,
                CASE WHEN min_fav_wp <= starting_fav_wp - $2::float THEN 1 ELSE 0 END AS had_adversity
            FROM game_min_wp
        )
        SELECT
            gs.had_adversity AS experienced_major_adversity,
            COUNT(*) AS num_games,
            ROUND(AVG(gs.pregame_prob)::numeric, 3) AS avg_pregame_prob,
            ROUND(AVG(CASE WHEN gr.winner = gs.favorite_team THEN 1.0 ELSE 0.0 END)::numeric, 3) AS favorite_win_rate
        FROM game_summary gs
        JOIN game_results gr ON gr.game_id = gs.game_id
        WHERE gr.winner IS NOT NULL
        GROUP BY gs.had_adversity
        ORDER BY gs.had_adversity
    `,
    [favoriteThreshold, adversityDrop],
    (err, data) => {
      if (err) {
        console.error("Adversity query error:", err.message);
        res.json({ queryError: err.message });
      } else {
        if (data.rows.length > 0) setCached(cacheKey, data.rows);
        res.json(data.rows);
      }
    },
  );
};

// Route 4: GET /market/accuracy-by-week

const getMarketAccuracyByWeek = async function (req, res) {
  const cacheKey = "accuracy-by-week";
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  connection.query(
    `
        WITH game_level AS (
            SELECT
                g.week,
                pp.game_id,
                pp.kalshi_close,
                CASE
                    WHEN gr.winner = pp.target_team THEN 1.0
                    ELSE 0.0
                END AS win
            FROM pregame_prices pp
            JOIN game_results gr
                ON pp.game_id = gr.game_id
            JOIN Games g
                ON g.game_id = pp.game_id
            WHERE pp.rn = 1 AND g.week BETWEEN 1 AND 18
        )
        SELECT
            week,
            COUNT(*) AS numberoffgames,
            ROUND(AVG(kalshi_close)::numeric, 2) AS avg_predicted,
            ROUND(AVG(win)::numeric, 2) AS actual,
            ROUND(AVG(ABS(kalshi_close - win))::numeric, 2) AS error
        FROM game_level
        GROUP BY week
        ORDER BY week
    `,
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        setCached(cacheKey, data.rows);
        res.json(data.rows);
      }
    },
  );
};

// Route 5: GET /market/volatility-comparison

const getVolatilityComparison = async function (req, res) {
  const volatilityThreshold = parseFloat(req.query.volatility_threshold ?? 0.5);

  connection.query(
    `
      WITH game_volatility AS (
        SELECT
          km.game_id,
          MAX(kp.kalshi_close) - MIN(kp.kalshi_close) AS price_swing
        FROM kalshi_markets km
        JOIN kalshi_prices kp
          ON km.market_ticker = kp.market_ticker
        GROUP BY km.game_id
      ),
      game_level AS (
        SELECT
          gv.game_id,
          gv.price_swing,
          pp.target_team,
          pp.kalshi_close,
          CASE
            WHEN gr.winner = pp.target_team THEN 1.0
            ELSE 0.0
          END AS win
        FROM game_volatility gv
        JOIN pregame_prices pp
          ON gv.game_id = pp.game_id
        JOIN game_results gr
          ON gv.game_id = gr.game_id
        WHERE pp.rn = 1
      )
      SELECT
        CASE
          WHEN price_swing >= $1 THEN 'high_volatility'
          ELSE 'low_volatility'
        END AS volatility_group,
        COUNT(*) AS numberofgames,
        ROUND(AVG(kalshi_close)::numeric, 3) AS avg_predicted_prob,
        ROUND(AVG(win)::numeric, 3) AS actual_win_rate,
        ROUND(AVG(ABS(kalshi_close - win))::numeric, 3) AS avg_error
      FROM game_level
      GROUP BY volatility_group;
    `,
    [volatilityThreshold],
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data.rows);
      }
    },
  );
};

// Route 6: GET /underdogs/win-rate

const getUnderdogWinRate = async function (req, res) {
  const maxProb = parseFloat(req.query.max_prob ?? 0.4);

  connection.query(
    `
        WITH game_volatility AS (
            SELECT
                km.game_id,
                MAX(kp.kalshi_close) - MIN(kp.kalshi_close) AS price_swing
            FROM Kalshi_Markets km
            JOIN Kalshi_Prices kp ON km.market_ticker = kp.market_ticker
            GROUP BY km.game_id
        ),
        underdogs AS (
            SELECT
                gv.game_id,
                pp.target_team,
                pp.kalshi_close,
                CASE
                    WHEN gr.winner = pp.target_team THEN 1.0
                    ELSE 0.0
                END AS win
            FROM game_volatility gv
            JOIN pregame_prices pp
                ON gv.game_id = pp.game_id
            JOIN game_results gr
                ON gv.game_id = gr.game_id
            WHERE
                pp.rn = 1
                AND pp.kalshi_close <= $1
        )
        SELECT
            COUNT(*) AS total_underdog_games,
            SUM(win) AS underdog_wins,
            ROUND(AVG(win)::numeric, 3) AS underdog_win_rate
        FROM underdogs
    `,
    [maxProb],
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data.rows);
      }
    },
  );
};

// Route 7: GET /favorites/win-rate

const getFavoriteWinRate = async function (req, res) {
  const minProb = parseFloat(req.query.min_prob ?? 0.5);

  connection.query(
    `
      WITH favorite_summary AS (
        SELECT
          pp.game_id,
          pp.target_team AS favorite_team,
          pp.kalshi_close AS favorite_prob,
          CASE
            WHEN gr.winner = pp.target_team THEN 1.0
            ELSE 0.0
          END AS favorite_won
        FROM pregame_prices pp
        JOIN game_results gr
          ON pp.game_id = gr.game_id
        WHERE pp.rn = 1
          AND pp.kalshi_close >= $1
      )
      SELECT
        COUNT(*) AS total_games,
        COALESCE(SUM(favorite_won), 0) AS favorite_wins,
        ROUND(COALESCE(AVG(favorite_won), 0)::numeric, 3) AS favorite_win_rate
      FROM favorite_summary;
    `,
    [minProb],
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data.rows);
      }
    },
  );
};

// Route 8: GET /favorites/calibration

const getFavoriteCalibration = async function (req, res) {
  connection.query(
    `
        WITH favorite_summary AS (
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
            WHERE pp.rn = 1
              AND pp.kalshi_close >= 0.5
        )
        SELECT
            CASE
                WHEN favorite_prob >= 0.8 THEN 'strong_favorite'
                WHEN favorite_prob >= 0.6 THEN 'moderate_favorite'
                ELSE 'slight_favorite'
            END AS favorite_strength,
            COUNT(*) AS num_games,
            ROUND(AVG(favorite_prob)::numeric, 2) AS avg_predicted,
            ROUND(AVG(favorite_won)::numeric, 2) AS actual_win_rate
        FROM favorite_summary
        GROUP BY favorite_strength
        ORDER BY favorite_strength
    `,
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data.rows);
      }
    },
  );
};

// Route 9: GET /markets/:team

const getMarketHistoryByTeam = async function (req, res) {
  const team = req.params.team.toUpperCase();

  connection.query(
    `
        SELECT
            km.market_ticker,
            km.target_team,
            kp.datetime_utc,
            kp.kalshi_open,
            kp.kalshi_high,
            kp.kalshi_low,
            kp.kalshi_close,
            kp.kalshi_volume
        FROM Kalshi_Prices kp
        JOIN Kalshi_Markets km
            ON kp.market_ticker = km.market_ticker
        WHERE km.target_team = $1
        ORDER BY kp.datetime_utc DESC
        LIMIT 500
    `,
    [team],
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        res.json(data.rows);
      }
    },
  );
};

// Route 10: GET /markets/early-hype-fade

const getEarlyHypeFadeMarkets = async function (req, res) {
  const minEarlyVolumeShare = parseFloat(req.query.min_early_volume_share ?? 0.3);
  const windowSize = parseInt(req.query.window_size ?? 5);
  const cacheKey = `hype-fade-${minEarlyVolumeShare}-${windowSize}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  connection.query(
    `
        WITH ranked AS (
            SELECT
                market_ticker,
                kalshi_close,
                kalshi_volume,
                ROW_NUMBER() OVER (PARTITION BY market_ticker ORDER BY datetime_utc ASC) AS rn,
                COUNT(*) OVER (PARTITION BY market_ticker) AS total_rows
            FROM Kalshi_Prices
            WHERE kalshi_close > 0
        ),
        per_market AS (
            SELECT
                market_ticker,
                SUM(CASE WHEN rn <= $2 THEN kalshi_volume ELSE 0 END) AS first_window_volume,
                SUM(kalshi_volume) AS total_volume,
                AVG(CASE WHEN rn <= $2 THEN kalshi_close END) AS early_price,
                AVG(CASE WHEN rn > total_rows - $2 THEN kalshi_close END) AS late_price,
                MAX(total_rows) AS num_candles
            FROM ranked
            GROUP BY market_ticker
            HAVING MAX(total_rows) >= $2 * 2
        )
        SELECT
            pm.market_ticker,
            km.target_team,
            pm.first_window_volume,
            pm.total_volume,
            ROUND((1.0 * pm.first_window_volume / NULLIF(pm.total_volume, 0))::numeric, 3) AS early_volume_share,
            ROUND(pm.early_price::numeric, 3) AS early_price,
            ROUND(pm.late_price::numeric, 3) AS late_price,
            ROUND((pm.late_price - pm.early_price)::numeric, 3) AS price_change,
            pm.num_candles
        FROM per_market pm
        JOIN Kalshi_Markets km ON pm.market_ticker = km.market_ticker
        WHERE
            pm.early_price IS NOT NULL
            AND pm.late_price IS NOT NULL
            AND pm.early_price - pm.late_price >= $1
        ORDER BY
            price_change ASC,
            early_price DESC
    `,
    [minEarlyVolumeShare, windowSize],
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        setCached(cacheKey, data.rows);
        res.json(data.rows);
      }
    },
  );
};

// Route 11: GET /games/coverage (EXISTS / NOT EXISTS)

const getGameCoverage = async function (req, res) {
  const cacheKey = "game-coverage";
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  connection.query(
    `
        SELECT
            COUNT(*) AS total_games,
            COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM Kalshi_Markets km WHERE km.game_id = g.game_id
            ) THEN 1 END) AS games_with_kalshi,
            COUNT(CASE WHEN NOT EXISTS (
                SELECT 1 FROM Kalshi_Markets km WHERE km.game_id = g.game_id
            ) THEN 1 END) AS games_without_kalshi,
            COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM Plays p WHERE p.game_id = g.game_id
            ) THEN 1 END) AS games_with_plays,
            COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM Kalshi_Markets km WHERE km.game_id = g.game_id
            ) AND EXISTS (
                SELECT 1 FROM Plays p WHERE p.game_id = g.game_id
            ) THEN 1 END) AS games_with_complete_data
        FROM Games g
    `,
    (err, data) => {
      if (err) {
        console.log(err);
        res.json({});
      } else {
        setCached(cacheKey, data.rows[0]);
        res.json(data.rows[0]);
      }
    },
  );
};

// Route 12: GET /market/vegas-vs-kalshi

const getVegasVsKalshi = async function (req, res) {
  const cacheKey = "vegas-vs-kalshi";
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  connection.query(
    `
        WITH first_play AS MATERIALIZED (
            SELECT DISTINCT ON (p.game_id)
                p.game_id,
                p.vegas_wp AS home_vegas_wp
            FROM Plays p
            WHERE p.vegas_wp IS NOT NULL
            ORDER BY p.game_id, p.qtr ASC, p.quarter_seconds_remaining DESC, p.play_id ASC
        ),
        game_comparison AS (
            SELECT
                g.week,
                pp.game_id,
                pp.kalshi_close AS kalshi_prob,
                CASE
                    WHEN pp.target_team = g.home_team THEN fp.home_vegas_wp
                    WHEN pp.target_team = g.away_team THEN 1.0::float - fp.home_vegas_wp
                END AS vegas_pregame_wp
            FROM pregame_prices pp
            JOIN Games g ON g.game_id = pp.game_id
            JOIN first_play fp ON fp.game_id = pp.game_id
            WHERE pp.rn = 1
              AND g.week BETWEEN 1 AND 18
        )
        SELECT
            week,
            COUNT(*) AS num_games,
            ROUND(AVG(kalshi_prob)::numeric, 3) AS avg_kalshi_prob,
            ROUND(AVG(vegas_pregame_wp)::numeric, 3) AS avg_vegas_wp,
            ROUND(AVG(kalshi_prob - vegas_pregame_wp)::numeric, 3) AS avg_diff
        FROM game_comparison
        WHERE vegas_pregame_wp IS NOT NULL
        GROUP BY week
        ORDER BY week
    `,
    (err, data) => {
      if (err) {
        console.log(err);
        res.json([]);
      } else {
        setCached(cacheKey, data.rows);
        res.json(data.rows);
      }
    },
  );
};

// Route 13a: GET /debug/timestamps — diagnose timestamp overlap between Plays and Kalshi_Prices
const getTimestampDebug = async function (req, res) {
  connection.query(
    `
        SELECT
            (SELECT COUNT(*) FROM Plays WHERE timestamp_utc IS NOT NULL) AS plays_with_ts,
            (SELECT COUNT(*) FROM Plays)                                  AS plays_total,
            (SELECT MIN(timestamp_utc) FROM Plays WHERE timestamp_utc IS NOT NULL) AS plays_ts_min,
            (SELECT MAX(timestamp_utc) FROM Plays WHERE timestamp_utc IS NOT NULL) AS plays_ts_max,
            (SELECT MIN(datetime_utc) FROM Kalshi_Prices)                 AS kalshi_ts_min,
            (SELECT MAX(datetime_utc) FROM Kalshi_Prices)                 AS kalshi_ts_max,
            (SELECT COUNT(DISTINCT p.game_id)
               FROM Plays p
               JOIN Kalshi_Markets km ON km.game_id = p.game_id
               JOIN Kalshi_Prices kp ON kp.market_ticker = km.market_ticker
                 AND (kp.datetime_utc AT TIME ZONE 'America/New_York')
                     BETWEEN p.timestamp_utc - INTERVAL '10 minutes'
                         AND p.timestamp_utc + INTERVAL '10 minutes'
               WHERE p.timestamp_utc IS NOT NULL
            ) AS games_with_ts_overlap
    `,
    (err, data) => {
      if (err) res.json({ error: err.message });
      else res.json(data.rows[0]);
    },
  );
};

// Route 13: GET /market/score-vs-market
// 4-table timestamp join: Plays + Games + Kalshi_Markets + Kalshi_Prices
// For each in-game score differential, find the concurrent Kalshi price
const getScoreVsMarket = async function (req, res) {
  const cacheKey = "score-vs-market";
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  connection.query(
    `
        SELECT
            (p.total_home_score - p.total_away_score) AS score_diff,
            COUNT(*)                                   AS num_observations,
            ROUND(AVG(kp.kalshi_close)::numeric, 3)   AS avg_kalshi_home_price,
            ROUND(AVG(p.vegas_wp)::numeric, 3)         AS avg_vegas_wp
        FROM Plays p
        JOIN Games g ON g.game_id = p.game_id
        JOIN Kalshi_Markets km
            ON km.game_id = p.game_id
           AND km.target_team = g.home_team
        JOIN LATERAL (
            SELECT kalshi_close
            FROM Kalshi_Prices kp
            WHERE kp.market_ticker = km.market_ticker
              AND kp.datetime_utc
                  BETWEEN ((p.timestamp_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York') - INTERVAL '2 minutes'
                      AND  ((p.timestamp_utc AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York')
            ORDER BY kp.datetime_utc DESC
            LIMIT 1
        ) kp ON true
        WHERE p.timestamp_utc IS NOT NULL
          AND p.vegas_wp      IS NOT NULL
          AND p.qtr BETWEEN 1 AND 4
        GROUP BY score_diff
        HAVING COUNT(*) >= 100
        ORDER BY score_diff
    `,
    (err, data) => {
      if (err) {
        console.error("Score vs market error:", err.message);
        res.json({ queryError: err.message });
      } else {
        if (data.rows.length > 0) setCached(cacheKey, data.rows);
        res.json(data.rows);
      }
    },
  );
};

module.exports = {
  getTeamMarketBias,
  getLargestMarketSwings,
  getFavoriteAdversityPerformance,
  getMarketAccuracyByWeek,
  getVolatilityComparison,
  getUnderdogWinRate,
  getFavoriteWinRate,
  getFavoriteCalibration,
  getMarketHistoryByTeam,
  getEarlyHypeFadeMarkets,
  getGameCoverage,
  getVegasVsKalshi,
  getScoreVsMarket,
  getTimestampDebug,
};
