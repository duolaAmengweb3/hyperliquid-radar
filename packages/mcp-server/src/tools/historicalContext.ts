import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const historicalContextTool: ToolDef = {
  name: "historical_context",
  description:
    "Give current mark price + funding context for an HL asset vs its last 7-day / 30-day baselines. Returns 'price is X% above its 30d mean', 'funding is Y bps above 7d avg', 'volatility rank', 'percentile position in range'. Use this right after asset_snapshot to turn raw numbers into 'is this extreme or normal'.",
  inputSchema: {
    type: "object",
    properties: {
      asset: { type: "string", description: "Coin symbol (e.g. 'BTC')." },
    },
    required: ["asset"],
  },
};

const inputSchema = z.object({ asset: z.string().min(1) });

function percentile(values: number[], v: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return (lo / sorted.length) * 100;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

export async function handleHistoricalContext(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { asset } = inputSchema.parse(rawArgs);
  const client = new HLClient();

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const start30 = now - 30 * day;

  // Pull current + 30d of 1h candles in one shot (≤ 720 rows).
  const [candles1h, mids, [meta, ctxs]] = await Promise.all([
    client.getCandles(asset, "1h", start30, now),
    client.getAllMids(),
    client.getMetaAndAssetCtxs(),
  ]);

  const currentPrice = Number(mids[asset] ?? 0);
  if (!currentPrice) throw new Error(`No mid price for ${asset}`);

  const idx = meta.universe.findIndex((u) => u.name === asset);
  if (idx === -1) throw new Error(`Asset '${asset}' not listed`);
  const ctx = ctxs[idx];
  const currentFundingHourly = Number(ctx.funding);
  const currentFundingAnnualPct = currentFundingHourly * 24 * 365 * 100;

  // 7d vs 30d slices of hourly close prices.
  const start7 = now - 7 * day;
  const all = candles1h.map((c) => ({ t: c.t, close: Number(c.c), vol: Number(c.v) }));
  const last7 = all.filter((c) => c.t >= start7);
  const last30 = all;

  const closes7 = last7.map((c) => c.close);
  const closes30 = last30.map((c) => c.close);
  const vols7 = last7.map((c) => c.vol);

  const mean7 = mean(closes7);
  const mean30 = mean(closes30);
  const high30 = closes30.length ? Math.max(...closes30) : currentPrice;
  const low30 = closes30.length ? Math.min(...closes30) : currentPrice;
  const stdev7 = stddev(closes7);
  const volPercentile = percentile(closes30, currentPrice);
  const rangePosition = high30 === low30 ? 50 : ((currentPrice - low30) / (high30 - low30)) * 100;

  // Log returns for a 7d realized vol annualized estimate.
  const logRets: number[] = [];
  for (let i = 1; i < closes7.length; i += 1) {
    if (closes7[i - 1] > 0 && closes7[i] > 0) {
      logRets.push(Math.log(closes7[i] / closes7[i - 1]));
    }
  }
  const realizedVol7dAnnualPct = logRets.length ? stddev(logRets) * Math.sqrt(24 * 365) * 100 : 0;

  const pctAbove7d = mean7 > 0 ? ((currentPrice - mean7) / mean7) * 100 : 0;
  const pctAbove30d = mean30 > 0 ? ((currentPrice - mean30) / mean30) * 100 : 0;

  // Interpretation strings.
  const priceNotes: string[] = [];
  if (rangePosition >= 90) priceNotes.push("near 30d high");
  else if (rangePosition <= 10) priceNotes.push("near 30d low");
  if (Math.abs(pctAbove7d) >= 5)
    priceNotes.push(`${pctAbove7d >= 0 ? "+" : ""}${pctAbove7d.toFixed(2)}% vs 7d mean`);
  if (Math.abs(pctAbove30d) >= 10)
    priceNotes.push(`${pctAbove30d >= 0 ? "+" : ""}${pctAbove30d.toFixed(2)}% vs 30d mean`);

  const fundingNotes: string[] = [];
  if (Math.abs(currentFundingAnnualPct) > 50) {
    fundingNotes.push(
      `funding is extreme at ${currentFundingAnnualPct >= 0 ? "+" : ""}${currentFundingAnnualPct.toFixed(1)}%/yr`,
    );
  } else if (Math.abs(currentFundingAnnualPct) > 20) {
    fundingNotes.push(
      `funding is elevated at ${currentFundingAnnualPct >= 0 ? "+" : ""}${currentFundingAnnualPct.toFixed(1)}%/yr`,
    );
  } else {
    fundingNotes.push(
      `funding is in a normal range (${currentFundingAnnualPct >= 0 ? "+" : ""}${currentFundingAnnualPct.toFixed(2)}%/yr)`,
    );
  }

  return {
    asset,
    current: {
      mark_price: currentPrice,
      funding_annual_pct: Number(currentFundingAnnualPct.toFixed(4)),
    },
    price_context: {
      mean_7d: Number(mean7.toFixed(4)),
      mean_30d: Number(mean30.toFixed(4)),
      high_30d: Number(high30.toFixed(4)),
      low_30d: Number(low30.toFixed(4)),
      pct_above_mean_7d: Number(pctAbove7d.toFixed(4)),
      pct_above_mean_30d: Number(pctAbove30d.toFixed(4)),
      range_position_30d_pct: Number(rangePosition.toFixed(2)),
      percentile_30d: Number(volPercentile.toFixed(2)),
      stddev_7d: Number(stdev7.toFixed(4)),
      realized_vol_7d_annual_pct: Number(realizedVol7dAnnualPct.toFixed(2)),
      avg_hourly_volume_7d: Number(mean(vols7).toFixed(2)),
    },
    interpretation: {
      price: priceNotes.join("; ") || "price is close to recent average",
      funding: fundingNotes.join("; "),
    },
  };
}
