export type Side = "long" | "short";

export interface Position {
  address: string;
  asset: string;
  side: Side;
  sizeUsd: number;
  leverage: number;
  entryPrice: number;
  liqPrice: number | null;
  currentPrice: number;
  unrealizedPnlUsd: number;
  openedAt?: string;
}

export interface LiqRisk extends Omit<Position, "liqPrice"> {
  liqPrice: number;
  distanceToLiqPct: number;
}

export interface FundingRate {
  exchange: "hyperliquid" | "binance" | "bybit" | "okx";
  symbol: string;
  rate: number;
  nextFundingTime?: number;
}
