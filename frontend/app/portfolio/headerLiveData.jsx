"use client";

import React, { useMemo } from "react";
import { useApp } from "../context/AppContext";

function HeaderLiveData() {
  const { portfolio , marketData} = useApp();


  const { currentValue, investment, gains, currentValueFormatted } = useMemo(() => {
    let currentValue = 0;
    let investment = 0;
    if(portfolio.length > 0){
      for(const stock of portfolio) {
      const market = marketData[stock.ticker];
      const cmp = !market?.price ? 0 :  market?.price > 0 ? market.price : market?.previousClose;
      
      const qty = stock.quantity || 0;

      currentValue += cmp * qty;
      investment += (stock.purchasePrice || 0) * qty;
    }
    }
    

    const gains =
      investment > 0 && currentValue > 0
        ? (((currentValue - investment) / investment) * 100)
        : null;


    const currentValueFormatted = currentValue.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return { currentValue, investment, gains, currentValueFormatted };
  }, [portfolio , marketData]);

  return (
    <>
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-sm text-gray-500">Current Value</p>
        <p className="text-2xl text-gray-500">
          ₹{" "}
          <span
            className={`text-2xl font-semibold ${
              currentValueFormatted.startsWith("-") ? "text-red-600" : "text-green-600"
            }`}
          >
            {currentValue > 0  ? currentValueFormatted : "Loading..."}
          </span>
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-sm text-gray-500">Total Gain</p>
        <p
          className={`text-2xl font-semibold ${
            gains !== null && gains < 0  ? "text-red-600" : "text-green-600"
          }`}
        >
          { gains !== null ? `${gains.toFixed(2)}%` : "Loading..."}
        </p>
      </div>
    </>
  );
};


export default HeaderLiveData;
