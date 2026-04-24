import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const detectAnomaliesTool: ToolDef = {
  name: "detect_anomalies",
  description:
    "One-call HL-wide anomaly scan. Flags assets with extreme funding (|annual| > threshold), large 24h price moves, unusual volume vs trailing mean, and outsized OI. Returns a categorized list. Best used by an agent that's asked 'what's weird on HL right now' — saves the user 20 minutes of manual dashboard scrolling.",
  inputSchema: {
    type: "object",
    properties: {
      funding_abs_annual_pct_threshold: {
        type: "number",
        default: 50,
        description: "Flag if |funding annual%| >= this value. Default 50%/yr.",
      },
      change_24h_abs_pct_threshold: {
        type: "number",
        default: 10,
        description: "Flag if |24h change| >= this %. Default 10%.",
      },
      volume_ratio_threshold: {
        type: "number",
        default: 3,
        description:
          "Flag if 24h volume is at least this multiple of the median asset's volume. Default 3x.",
      },
      min_oi_usd: {
        type: "number",
        default: 1_000_000,
        description: "Ignore assets with OI below this (filters noise).",
      },
    },
  },
};

const inputSchema = z.object({
  funding_abs_annual_pct_threshold: z.number().min(0).max(10_000).default(50),
  change_24h_abs_pct_threshold: z.number().min(0).max(100).default(10),
  volume_ratio_threshold: z.number().min(1).max(100).default(3),
  min_oi_usd: z.number().nonnegative().default(1_000_000),
});

export async function handleDetectAnomalies(rawArgs: Record<string, unknown>): Promise<unknown> {
  const opts = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [meta, ctxs] = await client.getMetaAndAssetCtxs();

  const rows = meta.universe.map((m, i) => {
    const c = ctxs[i];
    const mark = Number(c.markPx);
    const prev = Number(c.prevDayPx);
    const change = prev === 0 ? 0 : ((mark - prev) / prev) * 100;
    return {
      asset: m.name,
      mark,
      change_24h_pct: Number(change.toFixed(4)),
      funding_annual_pct: Number((Number(c.funding) * 24 * 365 * 100).toFixed(4)),
      oi_usd: Number((Number(c.openInterest) * mark).toFixed(2)),
      volume_24h_usd: Number(c.dayNtlVlm),
      max_leverage: m.maxLeverage,
    };
  });

  const qualified = rows.filter((r) => r.oi_usd >= opts.min_oi_usd);

  // Use median volume as baseline for "unusual volume".
  const sortedVols = qualified.map((r) => r.volume_24h_usd).sort((a, b) => a - b);
  const medianVol = sortedVols.length === 0 ? 0 : sortedVols[Math.floor(sortedVols.length / 2)];

  const extremeFunding = qualified.filter(
    (r) => Math.abs(r.funding_annual_pct) >= opts.funding_abs_annual_pct_threshold,
  );
  extremeFunding.sort((a, b) => Math.abs(b.funding_annual_pct) - Math.abs(a.funding_annual_pct));

  const bigMovers = qualified.filter(
    (r) => Math.abs(r.change_24h_pct) >= opts.change_24h_abs_pct_threshold,
  );
  bigMovers.sort((a, b) => Math.abs(b.change_24h_pct) - Math.abs(a.change_24h_pct));

  const volumeSpikes = qualified.filter(
    (r) => medianVol > 0 && r.volume_24h_usd >= medianVol * opts.volume_ratio_threshold,
  );
  volumeSpikes.sort((a, b) => b.volume_24h_usd - a.volume_24h_usd);

  // Top OI assets (absolute, not "anomaly" strictly but useful context).
  const topOi = [...qualified].sort((a, b) => b.oi_usd - a.oi_usd).slice(0, 10);

  // Summarize totals.
  const total_oi_usd = qualified.reduce((s, r) => s + r.oi_usd, 0);
  const total_volume_usd = qualified.reduce((s, r) => s + r.volume_24h_usd, 0);

  const headlines: string[] = [];
  if (extremeFunding[0]) {
    const r = extremeFunding[0];
    headlines.push(
      `${r.asset} funding at ${r.funding_annual_pct >= 0 ? "+" : ""}${r.funding_annual_pct.toFixed(1)}%/yr`,
    );
  }
  if (bigMovers[0]) {
    const r = bigMovers[0];
    headlines.push(
      `${r.asset} ${r.change_24h_pct >= 0 ? "+" : ""}${r.change_24h_pct.toFixed(2)}% in 24h`,
    );
  }
  if (volumeSpikes[0]) {
    const r = volumeSpikes[0];
    const mult = medianVol > 0 ? (r.volume_24h_usd / medianVol).toFixed(1) : "?";
    headlines.push(`${r.asset} volume ${mult}× the HL median`);
  }

  return {
    scanned_assets: qualified.length,
    filtered_out_low_oi: rows.length - qualified.length,
    total_oi_usd: Number(total_oi_usd.toFixed(2)),
    total_volume_24h_usd: Number(total_volume_usd.toFixed(2)),
    median_volume_24h_usd: Number(medianVol.toFixed(2)),
    thresholds: opts,
    anomalies: {
      extreme_funding: extremeFunding.slice(0, 20),
      big_24h_movers: bigMovers.slice(0, 20),
      volume_spikes: volumeSpikes.slice(0, 20),
      top_oi: topOi,
    },
    headline_summary:
      headlines.length === 0
        ? "No notable anomalies above thresholds. HL looks quiet."
        : headlines.join(" · "),
  };
}
