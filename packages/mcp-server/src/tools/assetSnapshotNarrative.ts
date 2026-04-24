import { HLClient } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const assetSnapshotNarrativeTool: ToolDef = {
  name: "asset_snapshot_narrative",
  description:
    "Prose summary (Markdown) of a single asset — combines asset_snapshot data with a narrative interpretation. Use when the user asks 'tell me about BTC right now' and wants a paragraph, not a table.",
  inputSchema: {
    type: "object",
    properties: {
      asset: { type: "string" },
      lang: { type: "string", enum: ["en", "zh"], default: "en" },
    },
    required: ["asset"],
  },
};

const inputSchema = z.object({
  asset: z.string().min(1),
  lang: z.enum(["en", "zh"]).default("en"),
});

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export async function handleAssetSnapshotNarrative(
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const { asset, lang } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [meta, ctxs] = await client.getMetaAndAssetCtxs();
  const idx = meta.universe.findIndex((u) => u.name === asset);
  if (idx === -1) throw new Error(`Asset '${asset}' not listed on HL`);
  const m = meta.universe[idx];
  const c = ctxs[idx];

  const mark = Number(c.markPx);
  const prev = Number(c.prevDayPx);
  const change = prev === 0 ? 0 : ((mark - prev) / prev) * 100;
  const fundingHour = Number(c.funding);
  const fundingAnnual = fundingHour * 24 * 365 * 100;
  const oiUsd = Number(c.openInterest) * mark;
  const volUsd = Number(c.dayNtlVlm);

  const narrative =
    lang === "zh"
      ? [
          `**${asset}** 当前价 $${mark.toLocaleString()},24 小时${change >= 0 ? "上涨" : "下跌"} ${Math.abs(change).toFixed(2)}%。`,
          `持仓量 ${fmtUsd(oiUsd)},24h 成交 ${fmtUsd(volUsd)}。`,
          `Funding 年化 **${fundingAnnual.toFixed(2)}%**(每小时 ${(fundingHour * 100).toFixed(4)}%)—— ${
            fundingAnnual > 20
              ? "多头在付高额 funding,警惕 long squeeze。"
              : fundingAnnual < -20
                ? "空头在付 funding,警惕 short squeeze。"
                : "funding 正常区间,无明显方向偏置。"
          }`,
          `最高 ${m.maxLeverage}x 杠杆。`,
        ].join("\n\n")
      : [
          `**${asset}** marks at $${mark.toLocaleString()}, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}% in 24h.`,
          `Open interest ${fmtUsd(oiUsd)}, 24h volume ${fmtUsd(volUsd)}.`,
          `Funding runs **${fundingAnnual.toFixed(2)}% annualized** (${(fundingHour * 100).toFixed(4)}%/hr) — ${
            fundingAnnual > 20
              ? "longs are paying up; watch for a long squeeze."
              : fundingAnnual < -20
                ? "shorts are paying; watch for a short squeeze."
                : "funding is in a normal range, no clear directional bias."
          }`,
          `Max leverage ${m.maxLeverage}x.`,
        ].join("\n\n");

  return {
    asset,
    lang,
    markdown: narrative,
    structured: {
      mark_price: mark,
      change_24h_pct: Number(change.toFixed(4)),
      funding_annual_pct: Number(fundingAnnual.toFixed(4)),
      open_interest_usd: Number(oiUsd.toFixed(2)),
      day_volume_usd: Number(volUsd.toFixed(2)),
      max_leverage: m.maxLeverage,
    },
  };
}
