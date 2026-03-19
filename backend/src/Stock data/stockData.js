const { WebSocketServer } = require("ws");
const yahooFinance = require("yahoo-finance2").default;
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
require("dotenv").config();

module.exports = function (server) {
  const tickers = [
    "HDFCBANK.NS",
    "BAJFINANCE.NS",
    "ICICIBANK.NS",
    "BAJAJHFL.NS",
    "SAVFI.BO",
    "AFFLE.NS",
    "LTIM.NS",
    "KPITTECH.NS",
    "TATATECH.NS",
    "BLSE.NS",
    "TANLA.NS",
    "DMART.NS",
    "TATACONSUM.NS",
    "PIDILITIND.NS",
    "TATAPOWER.NS",
    "KPIGREEN.NS",
    "SUZLON.NS",
    "GENSOL.NS",
    "HARIOMPIPE.NS",
    "ASTRAL.NS",
    "POLYCAB.NS",
    "CLEAN.NS",
    "DEEPAKNTR.NS",
    "FINEORG.NS",
    "GRAVITA.NS",
    "SBILIFE.NS",
  ];

  const yf = new yahooFinance();

  const wss = new WebSocketServer({ server });

  const tickerAlias = {
    BLS: "BLSE",
  };

  const clients = new Set();

  let intervalId = null;

  const normalize = (ticker) => {
    if (!ticker) return "";
    const t = ticker.split(".")[0].trim().toUpperCase();
    return tickerAlias[t] || t;
  };

  function sanitize(value) {
    return typeof value === "object" ? null : value;
  }

  let cachedFinalData = [];
  let cachedErrors = [];

  const GOOGLE_CACHE_DURATION = 5 * 60 * 1000;
  let googleCache = new Map();
  let lastGoogleFetch = 0;

  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, auth);

  async function loadGoogleSheetData() {
    const now = Date.now();

    if (now - lastGoogleFetch < GOOGLE_CACHE_DURATION && googleCache.size > 0) {
      return googleCache;
    }

    try {
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      await sheet.loadCells();
      const rowCount = sheet.rowCount;
      let sheetMap = new Map();

      for (let i = 1; i < rowCount; i++) {
        const company = sheet.getCell(i, 0).value;
        const sector = sheet.getCell(i, 1).value;
        const ticker = sheet.getCell(i, 2).value;
        const pe = sanitize(sheet.getCell(i, 3).value);
        const eps = sanitize(sheet.getCell(i, 4).value);

        if (!company) continue;

         sheetMap.set(normalize(ticker), {
          company: company,
          sector: sector,
          ticker: ticker,
          pe: pe,
          eps: eps,
        });
      }

      googleCache = sheetMap;
      lastGoogleFetch = now;

      return sheetMap;
    } catch (err) {
      console.error("Google Sheets Error:", err);
      return new Map();
    }
  }

  wss.on("connection", (ws) => {
    console.log("WS client connected");
    clients.add(ws);

    if (clients.size === 1) {
      intervalId = setInterval(fetchAndBroadcast, 15000);
    }

    if (cachedFinalData.length > 0) {
      ws.send(
        JSON.stringify({
          data: cachedFinalData,
          error: cachedErrors,
        }),
      );
    }

    ws.on("close", () => {
      clients.delete(ws);
      if (clients.size === 0) {
        clearInterval(intervalId);
        intervalId = null;
      }
    });
  });

  const fetchAndBroadcast = async () => {
    try {
      let errors = [];
      let data = {};
      let googleMap;

      try {
        data = await yf.quote(tickers);
      } catch (err) {
        console.error("Error fetching Yahoo data:", err);
        errors.push({
          source: "Yahoo Finance",
          message: err.message,
        });
        data = {};
      }

      try {
        googleMap = await loadGoogleSheetData();
      } catch (err) {
        console.error("Error fetching Google data:", err);
        errors.push({
          source: "Google Sheets",
          message: err.message,
        });
        googleMap = new Map();
      }

      let rawData = new Map();

      Object.values(data || {}).forEach((row) => {
        rawData.set(normalize(row.symbol), row);
      });

      const arr = tickers.map((value) => {
        let res = rawData.get(normalize(value));
        if (!res) {
          return {
            ticker: value,
            price: null,
            name: value,
            previousClose: null,
          };
        }

        return {
          ticker: res.symbol,
          price: res.regularMarketPrice || null,
          name: res.shortName,
          previousClose: res.regularMarketPreviousClose || null,
        };
      });

      const finalData = arr.map((item) => {
        const sheetItem = googleMap.get(normalize(item.ticker));
        console.log(sheetItem)
        return sheetItem
          ? { ...item, pe: sheetItem.pe, eps: sheetItem.eps }
          : item;
      });

      cachedFinalData = finalData;
      cachedErrors = errors;

      clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              data: finalData,
              errors,
            }),
          );
        }
      });
    } catch (err) {
      console.error("Error fetching Yahoo and Google data:", err);
    }
  };
};








