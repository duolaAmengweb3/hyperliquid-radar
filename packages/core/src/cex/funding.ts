import type { FundingRate } from "../types.js";

export async function getBinanceFunding(symbol: string): Promise<FundingRate> {
  const res = await fetch(
    `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
  );
  if (!res.ok) throw new Error(`Binance premiumIndex ${res.status}`);
  const data = (await res.json()) as {
    lastFundingRate: string;
    nextFundingTime: number;
  };
  return {
    exchange: "binance",
    symbol,
    rate: Number(data.lastFundingRate),
    nextFundingTime: data.nextFundingTime,
  };
}

export async function getBybitFunding(symbol: string): Promise<FundingRate> {
  const res = await fetch(
    `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`,
  );
  if (!res.ok) throw new Error(`Bybit tickers ${res.status}`);
  const data = (await res.json()) as {
    result: { list: Array<{ fundingRate: string; nextFundingTime: string }> };
  };
  const row = data.result?.list?.[0];
  if (!row) throw new Error(`Bybit: no data for ${symbol}`);
  return {
    exchange: "bybit",
    symbol,
    rate: Number(row.fundingRate),
    nextFundingTime: Number(row.nextFundingTime),
  };
}

export async function getOkxFunding(instId: string): Promise<FundingRate> {
  const res = await fetch(
    `https://www.okx.com/api/v5/public/funding-rate?instId=${encodeURIComponent(instId)}`,
  );
  if (!res.ok) throw new Error(`OKX funding-rate ${res.status}`);
  const data = (await res.json()) as {
    data: Array<{ fundingRate: string; nextFundingTime: string }>;
  };
  const row = data.data?.[0];
  if (!row) throw new Error(`OKX: no data for ${instId}`);
  return {
    exchange: "okx",
    symbol: instId,
    rate: Number(row.fundingRate),
    nextFundingTime: Number(row.nextFundingTime),
  };
}
