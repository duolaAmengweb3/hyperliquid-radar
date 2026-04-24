import { HLClient, getBinanceFunding, getBybitFunding, getOkxFunding } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const getFundingDivergenceTool: ToolDef = {
  name: "get_funding_divergence",
  description:
    "Compare Hyperliquid funding rate against Binance / Bybit / OKX for a given asset. " +
    "Returns each exchange's current rate (normalized to annual %), the spread vs HL, and a naive 8h carry estimate for delta-neutral trades. " +
    "HL funding is hourly; CEX funding is 8-hourly — all values normalized to annual % for comparison.",
  inputSchema: {
    type: "object",
    properties: {
      asset: {
        type: "string",
        description: "Coin symbol (e.g. 'BTC', 'ETH', 'HYPE'). Case-sensitive on HL.",
      },
    },
    required: ["asset"],
  },
};

const inputSchema = z.object({
  asset: z.string().min(1),
});

interface ExchangeFunding {
  exchange: string;
  rate_per_hour_pct: number;
  rate_annual_pct: number;
  divergence_vs_hl_annual_pct: number;
}

export async function handleGetFundingDivergence(rawArgs: Record<string, unknown>): Promise<{
  asset: string;
  hl_funding_annual_pct: number;
  hl_mark_price: number;
  exchanges: ExchangeFunding[];
  best_arb: { long_at: string; short_at: string; annual_pct: number } | null;
  disclaimer: string;
}> {
  const { asset } = inputSchema.parse(rawArgs);

  const client = new HLClient();
  const [_meta, ctxs] = await client.getMetaAndAssetCtxs();
  const { universe } = _meta;
  const idx = universe.findIndex((u) => u.name === asset);
  if (idx === -1) {
    throw new Error(`Asset '${asset}' not listed on Hyperliquid`);
  }
  const hlCtx = ctxs[idx];
  // HL funding is per-hour. Multiply by 24*365 for annual.
  const hlHourly = Number(hlCtx.funding);
  const hlAnnualPct = hlHourly * 24 * 365 * 100;

  // CEX side — each exchange uses different symbol conventions.
  const binanceSym = `${asset}USDT`;
  const bybitSym = `${asset}USDT`;
  const okxInst = `${asset}-USDT-SWAP`;

  const [bin, byb, okx] = await Promise.allSettled([
    getBinanceFunding(binanceSym),
    getBybitFunding(bybitSym),
    getOkxFunding(okxInst),
  ]);

  // CEX funding is per 8h period. Multiply by 3*365 for annual.
  const toAnnual = (ratePer8h: number) => ratePer8h * 3 * 365 * 100;

  const exchanges: ExchangeFunding[] = [];

  const hlRatePerHour = hlHourly * 100;

  exchanges.push({
    exchange: "hyperliquid",
    rate_per_hour_pct: Number(hlRatePerHour.toFixed(6)),
    rate_annual_pct: Number(hlAnnualPct.toFixed(4)),
    divergence_vs_hl_annual_pct: 0,
  });

  if (bin.status === "fulfilled") {
    const annual = toAnnual(bin.value.rate);
    exchanges.push({
      exchange: "binance",
      rate_per_hour_pct: Number((bin.value.rate / 8).toFixed(6)) * 100,
      rate_annual_pct: Number(annual.toFixed(4)),
      divergence_vs_hl_annual_pct: Number((annual - hlAnnualPct).toFixed(4)),
    });
  }
  if (byb.status === "fulfilled") {
    const annual = toAnnual(byb.value.rate);
    exchanges.push({
      exchange: "bybit",
      rate_per_hour_pct: Number((byb.value.rate / 8).toFixed(6)) * 100,
      rate_annual_pct: Number(annual.toFixed(4)),
      divergence_vs_hl_annual_pct: Number((annual - hlAnnualPct).toFixed(4)),
    });
  }
  if (okx.status === "fulfilled") {
    const annual = toAnnual(okx.value.rate);
    exchanges.push({
      exchange: "okx",
      rate_per_hour_pct: Number((okx.value.rate / 8).toFixed(6)) * 100,
      rate_annual_pct: Number(annual.toFixed(4)),
      divergence_vs_hl_annual_pct: Number((annual - hlAnnualPct).toFixed(4)),
    });
  }

  // Find the widest spread — long the lower funding side, short the higher.
  let best: { long_at: string; short_at: string; annual_pct: number } | null = null;
  for (const a of exchanges) {
    for (const b of exchanges) {
      if (a.exchange === b.exchange) continue;
      const spread = b.rate_annual_pct - a.rate_annual_pct;
      if (spread > 0 && (!best || spread > best.annual_pct)) {
        best = { long_at: a.exchange, short_at: b.exchange, annual_pct: Number(spread.toFixed(4)) };
      }
    }
  }

  return {
    asset,
    hl_funding_annual_pct: Number(hlAnnualPct.toFixed(4)),
    hl_mark_price: Number(hlCtx.markPx),
    exchanges,
    best_arb: best,
    disclaimer:
      "Annualized rates assume funding stays constant (it doesn't). Fees, slippage, and margin drift not included.",
  };
}
