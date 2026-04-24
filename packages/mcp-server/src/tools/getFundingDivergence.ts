import {
  HLClient,
  getBinanceFunding,
  getBybitFunding,
  getOkxFunding,
} from "hyperliquid-radar-core";
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

type VenueStatus = { ok: true; symbol: string } | { ok: false; symbol: string; error: string };

export async function handleGetFundingDivergence(rawArgs: Record<string, unknown>): Promise<{
  asset: string;
  hl_funding_annual_pct: number;
  hl_mark_price: number;
  exchanges: ExchangeFunding[];
  venue_status: Record<string, VenueStatus>;
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
  const hlHourly = Number(hlCtx.funding);
  const hlAnnualPct = hlHourly * 24 * 365 * 100;

  const binanceSym = `${asset}USDT`;
  const bybitSym = `${asset}USDT`;
  const okxInst = `${asset}-USDT-SWAP`;

  const [bin, byb, okx] = await Promise.allSettled([
    getBinanceFunding(binanceSym),
    getBybitFunding(bybitSym),
    getOkxFunding(okxInst),
  ]);

  const toAnnual = (ratePer8h: number) => ratePer8h * 3 * 365 * 100;

  const exchanges: ExchangeFunding[] = [];
  const venueStatus: Record<string, VenueStatus> = {
    hyperliquid: { ok: true, symbol: asset },
  };

  exchanges.push({
    exchange: "hyperliquid",
    rate_per_hour_pct: Number((hlHourly * 100).toFixed(6)),
    rate_annual_pct: Number(hlAnnualPct.toFixed(4)),
    divergence_vs_hl_annual_pct: 0,
  });

  const pushCex = (
    name: string,
    symbol: string,
    result: PromiseSettledResult<{ rate: number }>,
  ): void => {
    if (result.status === "fulfilled") {
      const annual = toAnnual(result.value.rate);
      exchanges.push({
        exchange: name,
        rate_per_hour_pct: Number((result.value.rate / 8).toFixed(6)) * 100,
        rate_annual_pct: Number(annual.toFixed(4)),
        divergence_vs_hl_annual_pct: Number((annual - hlAnnualPct).toFixed(4)),
      });
      venueStatus[name] = { ok: true, symbol };
    } else {
      venueStatus[name] = {
        ok: false,
        symbol,
        error: (result.reason as Error).message,
      };
    }
  };
  pushCex("binance", binanceSym, bin);
  pushCex("bybit", bybitSym, byb);
  pushCex("okx", okxInst, okx);

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

  const failedVenues = Object.entries(venueStatus)
    .filter(([, s]) => !s.ok)
    .map(([v]) => v);
  const failureNote =
    failedVenues.length === 0
      ? ""
      : ` Missing: ${failedVenues.join(", ")} (see venue_status for errors — usually symbol not listed or rate-limit).`;

  return {
    asset,
    hl_funding_annual_pct: Number(hlAnnualPct.toFixed(4)),
    hl_mark_price: Number(hlCtx.markPx),
    exchanges,
    venue_status: venueStatus,
    best_arb: best,
    disclaimer: `Annualized rates assume funding stays constant (it doesn't). Fees, slippage, and margin drift not included.${failureNote}`,
  };
}
