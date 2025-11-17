const { WebSocketServer } = require("ws");
const yahooFinance = require("yahoo-finance2").default;
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
require('dotenv').config();

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

 
  const wss = new WebSocketServer({ server });

  let cachedFinalData = [];
  let cachedErrors = [];
  let lastFetchTime = 0;
  const CACHE_DURATION = 15000;

  const GOOGLE_CACHE_DURATION = 5 * 60 * 1000;
  let googleCache = [];
  let lastGoogleFetch = 0;

  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, auth);

  async function loadGoogleSheetData() {
    const now = Date.now();

    if (now - lastGoogleFetch < GOOGLE_CACHE_DURATION && googleCache.length > 0) {
      return googleCache;
    }

    try {
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      await sheet.loadCells();
      const rowCount = sheet.rowCount;
      const data = []
  
      for (let i = 1; i < rowCount; i++) {
        const company = sheet.getCell(i, 0).value;
        const sector = sheet.getCell(i, 1).value;
        const ticker = sheet.getCell(i, 2).value;
        const pe = sheet.getCell(i, 3).value;
        const eps = sheet.getCell(i, 4).value;
  
        if (!company) continue;
    
        data.push({
            company,
            sector,
            ticker,
            pe,
            eps,
          });
      }

      googleCache = data;
      lastGoogleFetch = now;

      return data;
    } catch (err) {
      console.error("Google Sheets Error:", err);
      return [];
    }
  }
  
  wss.on("connection", (ws) => {
    console.log("WS client connected");

    const interval = async () => {
      try {

        const now = Date.now();

        if (now - lastFetchTime < CACHE_DURATION && cachedFinalData.length > 0) {
          ws.send(JSON.stringify({
            data: cachedFinalData,
            errors: cachedErrors
          }));
          return;
        }

        lastFetchTime = now;
        let errors = []
        let data = {};
        let googleJson = [];

        const yf = new yahooFinance();
        try{
          data = await yf.quote(tickers);
        }
        catch(err){
          console.error("Error fetching Yahoo data:", err);
          errors.push({
            source : "Yahoo Finance",
            message : err.message
          })
          data = {};
        }

        try {
           googleJson = await loadGoogleSheetData();
        } catch (err) {
           console.error("Error fetching Google data:", err);
           errors.push({
            source : "Google Sheets",
            message : err.message
          })
          googleJson = [];
        }
        
        const arr = Object.values(data).map((res) => ({
            ticker: res.symbol,
            price: res.regularMarketPrice,
            name: res.shortName,
            previousClose : res.regularMarketPreviousClose,
        }));

        const tickerAlias = {
          "BLS" : "BLSE"
        }
        const normalize = (ticker) =>{
        if (!ticker) return "";
        const t = ticker.split(".")[0].trim().toUpperCase();
        return tickerAlias[t] || t;
        }

        const finalData =arr.map(item => {
          const sheetItem = googleJson.find(
            (sheetRes) => normalize(sheetRes.ticker) === normalize(item.ticker))
            return sheetItem
                    ? { ...item, pe: sheetItem.pe , eps: sheetItem.eps}
                    : item;
        });

        cachedFinalData = finalData;
        cachedErrors = errors;

        ws.send( JSON.stringify({
          data: finalData,
          error: errors
        }));
      } catch (err) {
        console.error("Error fetching Yahoo and Google data:", err);
      }
    };

    const intervalId = setInterval(interval, 15000);

    ws.on("close", () => clearInterval(intervalId));
  });

};
