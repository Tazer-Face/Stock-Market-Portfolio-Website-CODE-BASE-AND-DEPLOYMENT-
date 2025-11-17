const express = require("express");
const app = express();
const stockRoutes = require("./routes/stockRoutes");
const {connectDB,disconnectDB} = require("./config/databases");
const stockData = require("./Stock data/stockData");
const cors = require('cors');
require('dotenv').config();


connectDB();

const port = process.env.PORT || 4005;

const server = app.listen(port ,() => {
  console.log("App + WebSocket running");
});


stockData(server);

app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true
}));

app.use(express.json());

app.use('/api/stocks',stockRoutes);

process.on('SIGINT',() => disconnectDB('SIGINT'));
process.on('SIGTERM',() => disconnectDB('SIGTERM'));

