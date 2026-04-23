import { request } from "undici";
import type { FundingRate } from "../types.js";

/**
 * Fetch the current funding rate from Binance USDT-M perp.
 * No auth. Limit: 1200 req/min per IP.
 */
export async function getBinanceFunding(symbol: string): Promise<FundingRate> {
  const res = await request(
    `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
  );
  if (res.statusCode !== 200) {
    throw new Error(`Binance premiumIndex ${res.statusCode}`);
  }
  const data = (await res.body.json()) as {
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

/**
 * Fetch the current funding rate from Bybit linear perp.
 */
export async function getBybitFunding(symbol: string): Promise<FundingRate> {
  const res = await request(
    `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`,
  );
  if (res.statusCode !== 200) {
    throw new Error(`Bybit tickers ${res.statusCode}`);
  }
  const data = (await res.body.json()) as {
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

/**
 * Fetch the current funding rate from OKX perp swap.
 * OKX uses inst-id like `BTC-USDT-SWAP`.
 */
export async function getOkxFunding(instId: string): Promise<FundingRate> {
  const res = await request(
    `https://www.okx.com/api/v5/public/funding-rate?instId=${encodeURIComponent(instId)}`,
  );
  if (res.statusCode !== 200) {
    throw new Error(`OKX funding-rate ${res.statusCode}`);
  }
  const data = (await res.body.json()) as {
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
