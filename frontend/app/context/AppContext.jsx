"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [portfolio, setPortfolio] = useState([]);
  const [marketData, setMarketData] = useState({});

  const errorShownRef = useRef(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const getData = async () => {
      try {
        let dbData = [];

        try {
          const res = await fetch(
            process.env.NEXT_PUBLIC_STOCK_DATA,
            { cache: "force-cache" }
          );

          if (!res.ok) {
            throw new Error("Failed to fetch stocks");
          }

          dbData = await res.json();
        } catch (err) {
          console.error("Initial fetch error:", err);

          if (!errorShownRef.current) {
            alert("⚠ Failed to fetch initial stock data.");
            errorShownRef.current = true;
          }

          dbData = [];
        }

        setPortfolio(dbData);
        console.log("Fetched portfolio data:", dbData);

        const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_DATA);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connection established");
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);

          const updates = msg.data || [];
          const errors = msg.errors || [];

          if (errors.length > 0 && !errorShownRef.current) {
            alert("⚠ Some live market data failed. Showing partial results.");
            errorShownRef.current = true;
          }

          errors.forEach((err) => {
            console.warn(`⚠ Backend error (${err.source}): ${err.message}`);
          });

          console.log("Received updates:", updates);

          // Update marketData store (ticker → data)
          setMarketData((prev) => {
            const updated = { ...prev };

            for (const u of updates) {
              updated[u.ticker] = {
                price: u.price,
                previousClose: u.previousClose,
                pe: u.pe,
                eps: u.eps,
              };
            }

            return updated;
          });
        };

        ws.onerror = (err) => {
          console.error("WebSocket error:", err);
        };
      } catch (err) {
        console.error("Error fetching stocks data:", err);
      }
    };

    getData();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        console.log("WebSocket connection closed");
      }
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        portfolio,
        marketData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
}

