# CIS 5500: NFL Play-by-Play & Prediction Market Analytics

## Motivation & Description
This application allows users to see how market prices react to play-by-play events within NFL games. By combining granular play-by-play data with frequent, minute-by-minute prediction market data, we are creating a powerful analytics tool.

The main feature is an analytics dashboard where users can view trends such as market accuracy over time, the biggest market upsets, and how often a heavily favored team wins. Users can filter data based on specific game conditions (e.g., changes in the 4th quarter, after interceptions) to explore exactly how prediction markets shift in real-time.

## Technologies & Data Sources
* **Tech Stack:** PostgreSQL (AWS RDS), Python (Polars), React, Node.js.
* **Data Sources:** NFLverse (~50k rows of play-by-play data) and Kalshi API (~100k rows of prediction market data).

---

## Project Scaffold

```text
CIS-5500-Project/
│
├── .env.example            # Template for required environment variables
├── .gitignore              # Ignored files (e.g., CSVs, keys, virtual environments)
├── README.md               # Project documentation
├── requirements.txt        # Python dependencies for the data pipeline
├── schema.sql              # PostgreSQL table creation and foreign key constraints
│
├── csvs/                   # Target directory for generated CSV data files
│
├── data_pipeline/          # Data extraction and cleaning scripts
│   └── generate_csv.py     # Fetches, cleans, and exports Kalshi/NFLverse data
│
├── sql/                    # Directory for additional SQL queries and scripts
│
├── server/                 # Node.js backend for database routing and API
│
└── client/                 # React frontend for the analytics dashboard
```
## Setup Instructions
To run locally, clone and set up your Python environment:
```text
git clone https://github.com/Joey-Hale/CIS-5500-Project.git
cd CIS-5500-Project
```

Create and activate a virtual environment
```text
python -m venv venv
```
On Windows: 
```text
venv\Scripts\activate
```
On Mac/Linux: 
```text
source venv/bin/activate
```

Install required dependencies
```text
pip install -r requirements.txt
```

Open two terminal windows.

In the first terminal, start the server:

```text
cd server
npm install
npm start
```

In the second terminal, start the client:
```text
cd client
npm install
npm start
```


