const { Pool, types } = require("pg");
const config = require("./config.json");

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
  const favoriteThreshold = parseFloat(req.query.favorite_threshold ?? 0.75);
  const adversityDrop = parseFloat(req.query.adversity_drop ?? 0.15);

  connection.query(
    `
        WITH favorites AS (
            SELECT
                pp.game_id,
                pp.target_team AS favorite_team,
                pp.kalshi_close AS pregame_prob
            FROM pregame_prices pp
            WHERE
                pp.rn = 1
                AND pp.kalshi_close >= $1
        ),
        favorite_wp_changes AS (
            SELECT
                f.game_id,
                f.favorite_team,
                f.pregame_prob,
                p.play_id,
                CASE
                    WHEN f.favorite_team = g.home_team THEN p.wp
                    WHEN f.favorite_team = g.away_team THEN 1.0 - p.wp
                END AS favorite_wp,
                CASE
                    WHEN f.favorite_team = g.home_team THEN prev_p.wp
                    WHEN f.favorite_team = g.away_team THEN 1.0 - prev_p.wp
                END AS prev_favorite_wp
            FROM favorites f
            JOIN Games g
                ON g.game_id = f.game_id
            JOIN Plays p
                ON p.game_id = f.game_id
            LEFT JOIN Plays prev_p
                ON prev_p.game_id = p.game_id
                AND (
                    prev_p.qtr,
                    prev_p.quarter_seconds_remaining,
                    prev_p.play_id
                ) = (
                    SELECT
                        p2.qtr,
                        p2.quarter_seconds_remaining,
                        p2.play_id
                    FROM Plays p2
                    WHERE
                        p2.game_id = p.game_id
                        AND (
                            p2.qtr < p.qtr
                            OR (
                                p2.qtr = p.qtr
                                AND p2.quarter_seconds_remaining > p.quarter_seconds_remaining
                            )
                            OR (
                                p2.qtr = p.qtr
                                AND p2.quarter_seconds_remaining = p.quarter_seconds_remaining
                                AND p2.play_id < p.play_id
                            )
                        )
                    ORDER BY
                        p2.qtr DESC,
                        p2.quarter_seconds_remaining ASC,
                        p2.play_id DESC
                    LIMIT 1
                )
            WHERE p.wp IS NOT NULL
        ),
        favorite_adversity AS (
            SELECT
                game_id,
                favorite_team,
                pregame_prob,
                CASE
                    WHEN MIN(favorite_wp - prev_favorite_wp) <= -$2 THEN 1
                    ELSE 0
                END AS experienced_major_adversity
            FROM favorite_wp_changes
            GROUP BY
                game_id,
                favorite_team,
                pregame_prob
        ),
        favorite_results AS (
            SELECT
                fa.game_id,
                fa.favorite_team,
                fa.pregame_prob,
                fa.experienced_major_adversity,
                gr.winner,
                CASE
                    WHEN gr.winner = fa.favorite_team THEN 1
                    ELSE 0
                END AS favorite_won
            FROM favorite_adversity fa
            JOIN game_results gr
                ON gr.game_id = fa.game_id
            WHERE gr.winner IS NOT NULL
        )
        SELECT
            experienced_major_adversity,
            COUNT(*) AS num_games,
            ROUND(AVG(pregame_prob)::numeric, 3) AS avg_pregame_prob,
            ROUND(AVG(favorite_won)::numeric, 3) AS favorite_win_rate
        FROM favorite_results
        GROUP BY experienced_major_adversity
        ORDER BY experienced_major_adversity
    `,
    [favoriteThreshold, adversityDrop],
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

// Route 4: GET /market/accuracy-by-week

const getMarketAccuracyByWeek = async function (req, res) {
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
  const minEarlyVolumeShare = req.query.min_early_volume_share ?? 0.3;
  const windowSize = req.query.window_size ?? 5;

  connection.query(
    `
        WITH ranked AS (
            SELECT
                market_ticker,
                datetime_utc,
                kalshi_close,
                kalshi_volume,
                ROW_NUMBER() OVER (
                    PARTITION BY market_ticker
                    ORDER BY datetime_utc
                ) AS rn,
                COUNT(*) OVER (
                    PARTITION BY market_ticker
                ) AS total_rows
            FROM Kalshi_Prices
        ),
        per_market AS (
            SELECT
                market_ticker,
                SUM(CASE WHEN rn <= ${windowSize} THEN kalshi_volume ELSE 0 END) AS first_5m_volume,
                SUM(kalshi_volume) AS total_volume,
                AVG(CASE WHEN rn <= ${windowSize} THEN kalshi_close END) AS early_price,
                AVG(CASE WHEN rn > total_rows - ${windowSize} THEN kalshi_close END) AS late_price
            FROM ranked
            GROUP BY market_ticker
        )
        SELECT
            market_ticker,
            first_5m_volume,
            total_volume,
            1.0 * first_5m_volume / NULLIF(total_volume, 0) AS early_volume_share,
            early_price,
            late_price,
            late_price - early_price AS price_change
        FROM per_market
        WHERE
            1.0 * first_5m_volume / NULLIF(total_volume, 0) >= ${minEarlyVolumeShare}
            AND late_price < early_price
        ORDER BY
            early_volume_share DESC,
            price_change ASC        
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
};
