const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');

const app = express();
app.use(cors({
    origin: '*',
}));

app.get('/teams/market-bias', routes.getTeamMarketBias);
app.get('/games/market-swings', routes.getLargestMarketSwings);
app.get('/games/coverage', routes.getGameCoverage);
app.get('/favorites/adversity-performance', routes.getFavoriteAdversityPerformance);
app.get('/market/accuracy-by-week', routes.getMarketAccuracyByWeek);
app.get('/market/volatility-comparison', routes.getVolatilityComparison);
app.get('/market/vegas-vs-kalshi', routes.getVegasVsKalshi);
app.get('/underdogs/win-rate', routes.getUnderdogWinRate);
app.get('/favorites/win-rate', routes.getFavoriteWinRate);
app.get('/favorites/calibration', routes.getFavoriteCalibration);
app.get('/markets/early-hype-fade', routes.getEarlyHypeFadeMarkets);
app.get('/markets/:team', routes.getMarketHistoryByTeam);
app.get('/market/score-vs-market', routes.getScoreVsMarket);
app.get('/debug/timestamps', routes.getTimestampDebug);

const port = process.env.PORT || config.server_port;
app.listen(port, () => {
    console.log(`Server running at http://${config.server_host}:${port}/`)
});

module.exports = app;