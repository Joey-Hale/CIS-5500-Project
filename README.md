# Floma — NFL Play-by-Play & Prediction Market Analytics

**Team:** Joey Hale, Shenmin Zhang, Kavya Venkatesan, Eric Qian  
**Course:** CIS 5500, University of Pennsylvania

## Description

Floma is an analytics dashboard that visualizes how Kalshi prediction market prices react to NFL play-by-play events in real time. By joining ~50k rows of granular play-by-play data (NFLverse) with ~100k rows of minute-by-minute market candlestick data (Kalshi API), the app surfaces trends such as market accuracy over time, the biggest market upsets, how heavily-favored teams perform under adversity, and how the Vegas line compares to live crowd-sourced odds.

Users can filter charts by game conditions (quarter, down-and-distance, play type, interceptions, fumbles) to explore exactly how prediction markets shift in real time.

**Live demo:** https://cis-5500-project-bice.vercel.app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL (AWS RDS) |
| Data Pipeline | Python 3.11, Polars, Kalshi REST API, NFLverse parquet |
| Backend | Node.js / Express |
| Frontend | React, Recharts, Material UI |

---

## Project Structure

```
CIS-5500-Project/
├── .env.example            # Template for required environment variables
├── README.md               # This file
├── requirements.txt        # Python dependencies
├── schema.sql              # PostgreSQL schema, views, and indexes
│
├── data_pipeline/
│   └── generate_csv.py     # Fetches, cleans, and exports all CSV data
│
├── server/
│   ├── server.js           # Express app entry point
│   ├── routes.js           # All API route handlers and SQL queries
│   ├── config.json         # Server host/port configuration
│   └── package.json        # Node.js dependencies
│
└── client/
    ├── src/
    │   ├── pages/          # React page components
    │   ├── config.json     # API base URL configuration
    │   └── index.js        # App entry point
    └── package.json        # React dependencies
```

---

## Dependencies

**Python (data pipeline)** — see `requirements.txt`:
- `polars` — fast DataFrame processing
- `requests` — HTTP calls to Kalshi API
- `cryptography` — RSA signing for Kalshi authentication
- `python-dotenv` — load `.env` credentials

**Node.js backend** — see `server/package.json`:
- `express`, `cors`, `pg`, `nodemon`

**React frontend** — see `client/package.json`:
- `react`, `react-router-dom`, `recharts`, `@mui/material`

---

## Running Locally

### Prerequisites
- PostgreSQL database (local or hosted)
- Node.js >= 16
- Python >= 3.9

### 1. Clone the repository

```bash
git clone https://github.com/Joey-Hale/CIS-5500-Project.git
cd CIS-5500-Project
```

### 2. Set up environment variables

Copy the example file and fill in your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
KALSHI_KEY_ID=your-kalshi-key-id
```

Also place your Kalshi RSA private key at `data_pipeline/kalshi.key`.

### 3. Set up the database

Run the schema against your PostgreSQL instance:

```bash
psql -h <host> -U <user> -d <dbname> -f schema.sql
```

### 4. Run the data pipeline

```bash
# Create and activate a Python virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python data_pipeline/generate_csv.py
```

This downloads NFLverse play-by-play data for the 2025 season and fetches Kalshi candlestick data for each game, writing four CSV files to `data_pipeline/csvs/`. Once generated, load them into PostgreSQL:

```bash
psql -h <host> -U <user> -d <dbname> -c "\copy Teams FROM 'data_pipeline/csvs/teams.csv' CSV HEADER"
psql -h <host> -U <user> -d <dbname> -c "\copy Games FROM 'data_pipeline/csvs/games.csv' CSV HEADER"
psql -h <host> -U <user> -d <dbname> -c "\copy Plays FROM 'data_pipeline/csvs/plays.csv' CSV HEADER"
psql -h <host> -U <user> -d <dbname> -c "\copy Kalshi_Markets FROM 'data_pipeline/csvs/kalshi_markets.csv' CSV HEADER"
psql -h <host> -U <user> -d <dbname> -c "\copy Kalshi_Prices FROM 'data_pipeline/csvs/kalshi_prices.csv' CSV HEADER"
```

### 5. Start the backend

```bash
cd server
npm install
npm start
```

The server runs on `http://localhost:8080` by default. Set `PORT` environment variable to override.

### 6. Start the frontend

In a new terminal:

```bash
cd client
npm install
npm start
```

The app opens at `http://localhost:3000`. By default it calls the deployed API at `https://cis-5500-project-4nvt.onrender.com`. To use your local backend, update `client/src/config.json`:

```json
{
    "server_host": "localhost",
    "server_port": "8080",
    "api_base_url": "http://localhost:8080"
}
```
