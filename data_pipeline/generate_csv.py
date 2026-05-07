import polars as pl
import time
import base64
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Authentication
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(dotenv_path=env_path)

KALSHI_KEY_ID = os.getenv("KALSHI_KEY_ID")

# Read the private key
key_file_path = os.path.join(script_dir, 'kalshi.key')
try:
    with open(key_file_path, 'r') as file:
        KALSHI_PRIVATE_KEY = file.read()
except FileNotFoundError:
    raise ValueError("🚨 kalshi.key file not found! Please create it in the data_pipeline folder.")

if not KALSHI_KEY_ID or not KALSHI_PRIVATE_KEY:
    raise ValueError("🚨 API Keys missing!")

# Kalshi API helper function
def kalshi_get(path, params=None):
    base_url = "https://api.elections.kalshi.com"
    timestamp = str(int(time.time() * 1000))
    msg_string = timestamp + "GET" + path
    clean_lines = [line.strip() for line in KALSHI_PRIVATE_KEY.split('\n') if line.strip()]
    clean_key_string = '\n'.join(clean_lines).encode('utf-8')
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.serialization import load_pem_private_key
    private_key = load_pem_private_key(clean_key_string, password=None)
    signature = private_key.sign(msg_string.encode('utf-8'), padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), hashes.SHA256())
    headers = {"Kalshi-Access-Key": KALSHI_KEY_ID, "Kalshi-Access-Signature": base64.b64encode(signature).decode('utf-8'), "Kalshi-Access-Timestamp": timestamp}
    return requests.get(base_url + path, headers=headers, params=params)

def build_final_database():
    print("Starting Data Pipeline\n")

    output_dir = os.path.join(script_dir, 'csvs')
    os.makedirs(output_dir, exist_ok=True) # Create directory if it doesn't exist

    # Define the final paths
    games_path = os.path.join(output_dir, "games.csv")
    plays_path = os.path.join(output_dir, "plays.csv")
    teams_path = os.path.join(output_dir, "teams.csv")

    # If all three files already exist, skip downloading
    if os.path.exists(games_path) and os.path.exists(plays_path) and os.path.exists(teams_path):
        print("   Final NFLverse CSVs found; skipping download and processing.")
        # We only need to load games.csv into memory because the Kalshi loop needs the Game IDs
        games_df = pl.read_csv(games_path).unique(subset=["game_id"])
    
    else:
        print("  Downloading play-by-play data for 25-26 season.")
        url = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.parquet"
        raw_pbp = pl.read_parquet(url)
        print("  Download complete! Processing data and generating CSVs.")

        # Games table
        games_df = raw_pbp.select(["game_id", "season", "week", "home_team", "away_team", "game_date"]).unique(subset=["game_id"])
        games_df.write_csv(os.path.join(output_dir, "games.csv"))
        
        # Plays table
        play_cols = [
            "game_id", "play_id", "qtr", "quarter_seconds_remaining", "down", "ydstogo", 
            "play_type", "desc", "total_home_score", "total_away_score", "wp", "vegas_wp",
            "interception", "fumble", "touchdown"
        ]
        plays_df = raw_pbp.select(play_cols + ["time_of_day"]).filter(pl.col("time_of_day").is_not_null())
        plays_df = plays_df.with_columns(pl.col("time_of_day").str.replace(r"Z$", "").alias("timestamp_utc")).drop("time_of_day")

        int_cols = ["play_id", "qtr", "down", "ydstogo", "total_home_score", "total_away_score", "interception", "fumble", "touchdown"]
        plays_df = plays_df.with_columns([
            pl.col(c).cast(pl.Int32) for c in int_cols if c in plays_df.columns
        ])
        
        plays_df.write_csv(os.path.join(output_dir, "plays.csv"))

        # Generate teams table
        print("Generating teams.csv")
        unique_abbrs = pl.concat([
            games_df.select(pl.col("home_team").alias("team_abbr")),
            games_df.select(pl.col("away_team").alias("team_abbr"))
        ]).unique()

        # Set up mapping for team names to abbreviations
        team_names = {
            "ARI": "Arizona Cardinals", "NO": "New Orleans Saints", "KC": "Kansas City Chiefs",
            "BAL": "Baltimore Ravens", "PHI": "Philadelphia Eagles", "GB": "Green Bay Packers",
            "CHI": "Chicago Bears", "DET": "Detroit Lions", "MIN": "Minnesota Vikings",
            "DAL": "Dallas Cowboys", "NYG": "New York Giants", "WAS": "Washington Commanders",
            "BUF": "Buffalo Bills", "MIA": "Miami Dolphins", "NE": "New England Patriots",
            "NYJ": "New York Jets", "CIN": "Cincinnati Bengals", "CLE": "Cleveland Browns",
            "PIT": "Pittsburgh Steelers", "HOU": "Houston Texans", "IND": "Indianapolis Colts",
            "JAX": "Jacksonville Jaguars", "TEN": "Tennessee Titans", "DEN": "Denver Broncos",
            "LV": "Las Vegas Raiders", "LAC": "Los Angeles Chargers", "SEA": "Seattle Seahawks",
            "SF": "San Francisco 49ers", "LA": "Los Angeles Rams", "ATL": "Atlanta Falcons",
            "CAR": "Carolina Panthers", "TB": "Tampa Bay Buccaneers"
        }
        
        teams_df = unique_abbrs.with_columns(
            pl.col("team_abbr").replace(team_names).alias("team_name")
        )
        teams_df.write_csv(os.path.join(output_dir, "teams.csv"))

    

    # Obtain all games from 25-26 season from Kalshi
    print("\nFetching Kalshi Market Data")
    months = {9: "SEP", 10: "OCT", 11: "NOV", 12: "DEC", 1: "JAN", 2: "FEB"}

    # Handle abbreviation mismatches
    team_overrides = {"JAX": "JAC"}

    # Load existing data if it exists to avoid duplicates and save API calls
    markets_file = os.path.join(output_dir, "kalshi_markets.csv")
    prices_file = os.path.join(output_dir, "kalshi_prices.csv")
    processed_gids = set()

    # If the files already exist, load them up so we don't overwrite them
    if os.path.exists(markets_file) and os.path.exists(prices_file):
        existing_markets = pl.read_csv(markets_file)
        existing_prices = pl.read_csv(prices_file)

        all_markets = existing_markets.to_dicts()
        all_prices = existing_prices.to_dicts()

        # Create a fast lookup set of game IDs we already have
        processed_gids = set(existing_markets["game_id"].to_list())
        print(f"   Found existing data! Skipping {len(processed_gids)} games we already downloaded.")
    else:
        all_markets, all_prices = [], []

    # Manual event ticker overrides — add entries here when auto-detection fails.
    ticker_overrides = {
        "2025_22_SEA_NE": "KXSB-26",
        "2025_21_NE_DEN":  "KXNFLAFCCHAMP-25"
    }

    # Add game IDs here to force re-download even if already in processed_gids.
    force_refetch = {}

    failed_games = []
    seen_failures = set()

    # Loop through each game, construct Kalshi ticker, and fetch market + price data
    for game in games_df.to_dicts():
        gid, home, away = game['game_id'], game['home_team'], game['away_team']

        if gid in processed_gids and gid not in force_refetch:
            print(f"   Skipping game {gid} ({away} @ {home}) - already retrieved.")
            continue

        dt = datetime.strptime(game['game_date'], "%Y-%m-%d")
        date_str = f"{dt.strftime('%y')}{months[dt.month]}{dt.strftime('%d')}"

        if gid in ticker_overrides:
            event_ticker = ticker_overrides[gid]
            print(f"   Override ticker for {gid}: fetching {away} @ {home} as {event_ticker}")
            m_res = kalshi_get("/trade-api/v2/historical/markets", params={"event_ticker": event_ticker})
        else:
            # Build all ticker candidates to try, in order:
            #   1. Standard codes, given date
            #   2. Kalshi codes, given date          (abbreviation mismatches)
            #   3. Standard codes, +1 day            (because of UTC time)
            #   4. Kalshi codes, +1 day
            k_away = team_overrides.get(away, away)
            k_home = team_overrides.get(home, home)
            dt_p1 = dt + timedelta(days=1)
            ds_p1 = f"{dt_p1.strftime('%y')}{months[dt_p1.month]}{dt_p1.strftime('%d')}"

            seen_t: set = set()
            candidates = []
            for t in [
                f"KXNFLGAME-{date_str}{away}{home}",
                f"KXNFLGAME-{date_str}{k_away}{k_home}",
                f"KXNFLGAME-{ds_p1}{away}{home}",
                f"KXNFLGAME-{ds_p1}{k_away}{k_home}",
            ]:
                if t not in seen_t:
                    seen_t.add(t)
                    candidates.append(t)

            m_res = None
            event_ticker = None
            for i, ticker in enumerate(candidates):
                if i > 0:
                    print(f"      {candidates[i-1]} failed; trying {ticker}.")
                attempt = kalshi_get("/trade-api/v2/historical/markets", params={"event_ticker": ticker})
                if attempt.status_code == 200 and attempt.json().get('markets'):
                    m_res = attempt
                    event_ticker = ticker
                    break

            if m_res is None:
                if gid not in seen_failures:
                    seen_failures.add(gid)
                    print(f"   FAILED {gid} ({away}@{home}): no markets after all attempts.")
                    print(f"      -> Tried: {', '.join(candidates)}")
                    print(f"      -> Add a manual override to ticker_overrides for this game.")
                    failed_games.append(f"{gid} ({away}@{home}): tried {len(candidates)} variants")
                continue

        if not (m_res.status_code == 200 and m_res.json().get('markets')):
            if gid not in seen_failures:
                seen_failures.add(gid)
                print(f"   FAILED {gid} ({away}@{home}): no markets returned (status={m_res.status_code}, ticker={event_ticker})")
                print(f"      -> Add a manual override to ticker_overrides for this game.")
                failed_games.append(f"{gid} ({away}@{home}): tried {event_ticker}")
            continue

        print(f"   Retrieving: {away} @ {home}.")
        markets = m_res.json()['markets']

        # Build the set of known abbreviations for this game to match against market tickers
        known_codes = {away, home} | {v for k, v in team_overrides.items() if k in {away, home}}

        # Grab valid Winner market to prevent Primary Key duplicates
        try:
            m = next(market for market in markets if
                     ("win" in market['title'].lower() and "spread" not in market['title'].lower()) and
                     any(code in market['ticker'] for code in known_codes))

            print(f"   Saving: {away} @ {home} (Ticker: {m['ticker']})")
        except StopIteration:
            print(f"   FAILED {gid} ({away}@{home}): markets found but no winner market matched. Titles: {[mk['title'] for mk in markets[:5]]}")
            failed_games.append(f"{gid} ({away}@{home}): winner market not found in {event_ticker}")
            continue

        # Double check we haven't already added this ticker
        if any(existing['market_ticker'] == m['ticker'] for existing in all_markets):
            continue

        kalshi_to_nfl = {"JAC": "JAX"}
        raw_target = m['ticker'].split("-")[-1]
        clean_target = kalshi_to_nfl.get(raw_target, raw_target)
        
        # Save market, accounting for abbreviation mismatches
        all_markets.append({
            "market_ticker": m['ticker'], 
            "game_id": gid, 
            "target_team": clean_target, 
            "market_title": m['title']
        })

        close_ts = int(datetime.fromisoformat(m.get('close_time').replace('Z', '+00:00')).timestamp())
        candles_res = kalshi_get(f"/trade-api/v2/historical/markets/{m['ticker']}/candlesticks",
                                 params={"period_interval": 1, "start_ts": close_ts - 14400, "end_ts": close_ts})

        # Process candlestick data to extract open, high, low, close prices and volume
        if candles_res.status_code == 200:
            for c in candles_res.json().get('candlesticks', []):
                p_data = c.get('price', {})
                open_p  = float(p_data.get('open') or 0)
                high_p  = float(p_data.get('high') or 0)
                low_p   = float(p_data.get('low') or 0)
                close_p = float(p_data.get('close') or 0)

                all_prices.append({
                    "market_ticker": m['ticker'],
                    "datetime_utc": datetime.fromtimestamp(c.get('end_period_ts')).strftime("%Y-%m-%dT%H:%M:%S.%f"),
                    "kalshi_open":   open_p,
                    "kalshi_high":   high_p,
                    "kalshi_low":    low_p,
                    "kalshi_close":  close_p,
                    "kalshi_volume": int(float(c.get('volume', '0')))
                })
        time.sleep(0.5)

    pl.DataFrame(all_markets).write_csv(os.path.join(output_dir, "kalshi_markets.csv"))
    pl.DataFrame(all_prices).write_csv(os.path.join(output_dir, "kalshi_prices.csv"))

    if failed_games:
        print(f"\n   {len(failed_games)} game(s) could not be retrieved:")
        for fg in failed_games:
            print(f"      - {fg}")
        print("   Look up the correct Kalshi event ticker and add it to ticker_overrides.")

    print("\n Pipeline Complete; CSVs ready for ingestion.")

if __name__ == "__main__":
    build_final_database()