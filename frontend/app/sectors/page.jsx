"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useApp } from "../context/AppContext";

const formatCurrency = (x) =>
  x.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function Sectors() {
  const { portfolio, marketData } = useApp();
  const [sector, setSector] = useState("");

  const sectorMap = useMemo(() => {
    const map = new Map();

    for (const stock of portfolio) {
      if (!map.has(stock.sector)) {
        map.set(stock.sector, []);
      }

      map.get(stock.sector).push(stock);
    }

    return map;
  }, [portfolio]);

  const sectors = useMemo(() => Array.from(sectorMap.keys()), [sectorMap]);

  useEffect(() => {
    if (!sector && sectors.length > 0) {
      setSector(sectors[0]);
    }
  }, [sector, sectors]);

  const {
    sectorArr,
    rawTotalInv,
    rawPresentVal,
    gainLoss,
    totalInv,
    presentVal,
    rawPresentValClass,
    gainLossClass,
  } = useMemo(() => {
    const sectorArr = sectorMap.get(sector) || [];

    const { rawTotalInv, rawPresentVal } = sectorArr.reduce(
      (acc, stock) => {
        let liveData = marketData[stock.ticker];
        const price =
          liveData?.price > 0 ? liveData.price : (liveData?.previousClose ?? 0);

        const qty = stock.quantity || 0;
        const buy = stock.purchasePrice || 0;

        acc.rawTotalInv += qty * buy;
        acc.rawPresentVal += qty * price;

        return acc;
      },
      { rawTotalInv: 0, rawPresentVal: 0 },
    );

    const gainLoss =
      rawTotalInv > 0 && rawPresentVal > 0
        ? ((rawPresentVal - rawTotalInv) / rawTotalInv) * 100
        : 0;

    const totalInv = formatCurrency(rawTotalInv);
    const presentVal = formatCurrency(rawPresentVal);

    const rawPresentValClass =
      rawPresentVal - rawTotalInv > 0 ? "text-green-600" : "text-red-600";

    const gainLossClass = gainLoss > 0 ? "text-green-600" : "text-red-600";

    return {
      sectorArr,
      rawTotalInv,
      rawPresentVal,
      gainLoss,
      totalInv,
      presentVal,
      rawPresentValClass,
      gainLossClass,
    };
  }, [sector, sectors ,marketData]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Sector wise investments
          </h1>
          <p className="text-gray-600 mt-2">
            Overview of your investments by sector.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSector(sec)}
              className={`bg-white text-2xl rounded-xl font-semibold shadow p-5 text-center transition
                ${
                  sec === sector
                    ? "text-indigo-600 border border-indigo-600"
                    : "text-gray-700 hover:text-indigo-600"
                }`}
            >
              {sec}
            </button>
          ))}
        </div>

        <div className="mb-4 mt-14">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">{sector}</h3>
          <h3 className="text-gray-700 mt-8 text-2xl font-semibold">Stocks</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 rounded-xl gap-4 mb-8 shadow">
          {sectorArr.map((item) => (
            <div
              key={item.name}
              className="bg-white p-4 m-2 shadow-lg rounded-xl text-center"
            >
              {item.name}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-gray-700 mb-6 text-2xl font-semibold">
            Investment Details
          </h3>

          <h5 className="text-xl text-gray-400">
            Total Investment : ₹
            <span className="text-xl ml-1 text-blue-600">{totalInv}</span>
          </h5>

          <h5 className="text-xl mt-4 text-gray-400">
            Present Value : ₹
            <span className={`text-xl ml-1 ${rawPresentValClass}`}>
              {presentVal}
            </span>
          </h5>

          <h5 className="text-xl mt-4 text-gray-400">
            Gain / Loss :
            <span className={`text-xl ml-1 ${gainLossClass}`}>
              {gainLoss.toFixed(2)}%
            </span>
          </h5>
        </div>
      </div>
    </main>
  );
};

export default Sectors;

