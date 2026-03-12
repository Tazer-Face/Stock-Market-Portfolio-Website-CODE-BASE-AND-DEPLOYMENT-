"use client";

import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import PriceData from "./PriceData";

export default function LiveData() {
    const { portfolio , marketData} = useApp();
    const data = useMemo(() => {
    return portfolio.map((value) => {
        const addData = marketData[value.ticker];

        return addData ? { ...value, ...addData } : value;
    });
    }, [portfolio, marketData]);
    return(
        <>
            {data.map((stock) => (
                <PriceData key={stock._id} stock={stock}  />
            ))}
        </>
    );
}
