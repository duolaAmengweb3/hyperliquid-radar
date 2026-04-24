import { HLClient, HL_VAULTS } from "hyperliquid-radar-core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const explainMarketStructureTool: ToolDef = {
  name: "explain_market_structure",
  description:
    "Expert-analyst Markdown narrative of Hyperliquid right now — goes beyond raw numbers to interpret whether moves are healthy (price + OI + funding aligned) vs fragile (squeezes, cascading risk). Covers top movers, funding extremes, structural regime (contango/backwardation), HLP health. Use when the user asks 'what's happening on HL' and wants a trader's read, not a table.",
  inputSchema: {
    type: "object",
    properties: {
      lang: { type: "string", enum: ["en", "zh"], default: "en" },
    },
  },
};

const inputSchema = z.object({ lang: z.enum(["en", "zh"]).default("en") });

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

interface Row {
  asset: string;
  mark: number;
  change: number;
  fundingAnnual: number;
  oi: number;
  vol: number;
}

function classifyRegime(
  r: Row,
): "healthy-up" | "healthy-down" | "short-squeeze" | "long-squeeze" | "bleed" | "coil" {
  const absMove = Math.abs(r.change);
  if (absMove < 2 && Math.abs(r.fundingAnnual) >= 30) return "bleed";
  if (absMove < 1) return "coil";
  if (r.change >= 3 && r.fundingAnnual >= 30) return "short-squeeze";
  if (r.change >= 3) return "healthy-up";
  if (r.change <= -3 && r.fundingAnnual <= -20) return "long-squeeze";
  return r.change >= 0 ? "healthy-up" : "healthy-down";
}

const regimeLabelEn: Record<ReturnType<typeof classifyRegime>, string> = {
  "healthy-up": "organic rally",
  "healthy-down": "organic selloff",
  "short-squeeze": "short squeeze (longs paying premium)",
  "long-squeeze": "long squeeze (shorts collecting funding)",
  bleed: "funding bleed (carry stacking)",
  coil: "coiling",
};
const regimeLabelZh: Record<ReturnType<typeof classifyRegime>, string> = {
  "healthy-up": "自然上涨",
  "healthy-down": "自然下跌",
  "short-squeeze": "空头挤压(多头付溢价)",
  "long-squeeze": "多头挤压(空头在收 funding)",
  bleed: "funding 放血(单向堆积)",
  coil: "盘整",
};

export async function handleExplainMarketStructure(
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const { lang } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [[meta, ctxs], hlp] = await Promise.all([
    client.getMetaAndAssetCtxs(),
    client.getVaultDetails(HL_VAULTS.HLP).catch(() => null),
  ]);

  const rows: Row[] = meta.universe.map((m, i) => {
    const c = ctxs[i];
    const mark = Number(c.markPx);
    const prev = Number(c.prevDayPx);
    const change = prev === 0 ? 0 : ((mark - prev) / prev) * 100;
    return {
      asset: m.name,
      mark,
      change,
      fundingAnnual: Number(c.funding) * 24 * 365 * 100,
      oi: Number(c.openInterest) * mark,
      vol: Number(c.dayNtlVlm),
    };
  });

  const totalOi = rows.reduce((s, r) => s + r.oi, 0);
  const totalVol = rows.reduce((s, r) => s + r.vol, 0);
  const gainers = rows.filter((r) => r.change > 0).length;
  const losers = rows.filter((r) => r.change < 0).length;
  const breadth = gainers / Math.max(1, gainers + losers);
  const posFunding = rows.filter((r) => r.fundingAnnual > 0);
  const negFunding = rows.filter((r) => r.fundingAnnual < 0);
  const avgFundingWeighted =
    rows.reduce((s, r) => s + r.fundingAnnual * r.oi, 0) / Math.max(1, totalOi);

  const movers = [...rows].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
  const hotFunding = [...rows]
    .sort((a, b) => Math.abs(b.fundingAnnual) - Math.abs(a.fundingAnnual))
    .slice(0, 5);
  const topVol = [...rows].sort((a, b) => b.vol - a.vol).slice(0, 5);
  const topOi = [...rows].sort((a, b) => b.oi - a.oi).slice(0, 3);

  const headline = movers[0];
  const headlineRegime = headline ? classifyRegime(headline) : undefined;

  const isZh = lang === "zh";
  const sections: string[] = [];

  if (headline && headlineRegime) {
    const label = (isZh ? regimeLabelZh : regimeLabelEn)[headlineRegime];
    sections.push(
      isZh
        ? `**头条**:${headline.asset} ${headline.change >= 0 ? "+" : ""}${headline.change.toFixed(2)}% · funding ${headline.fundingAnnual >= 0 ? "+" : ""}${headline.fundingAnnual.toFixed(1)}%/年 → 判为 **${label}**。`
        : `**Headline**: ${headline.asset} ${headline.change >= 0 ? "+" : ""}${headline.change.toFixed(2)}% · funding ${headline.fundingAnnual >= 0 ? "+" : ""}${headline.fundingAnnual.toFixed(1)}%/yr → reads as **${label}**.`,
    );
  }

  sections.push(
    isZh
      ? `**全市场**:OI ${fmtUsd(totalOi)},24h 成交 ${fmtUsd(totalVol)},${rows.length} 个 perp。涨跌广度 ${(breadth * 100).toFixed(0)}% (涨 ${gainers} vs 跌 ${losers})。OI 加权 funding ${avgFundingWeighted >= 0 ? "+" : ""}${avgFundingWeighted.toFixed(2)}%/年 → ${avgFundingWeighted > 10 ? "整体多头付费,市场偏多" : avgFundingWeighted < -10 ? "整体空头付费,市场偏空" : "整体中性"}。`
      : `**Platform**: OI ${fmtUsd(totalOi)}, 24h volume ${fmtUsd(totalVol)} across ${rows.length} perps. Breadth ${(breadth * 100).toFixed(0)}% (${gainers} up vs ${losers} down). OI-weighted funding ${avgFundingWeighted >= 0 ? "+" : ""}${avgFundingWeighted.toFixed(2)}%/yr → ${avgFundingWeighted > 10 ? "longs pay, market leans bullish" : avgFundingWeighted < -10 ? "shorts pay, market leans bearish" : "net neutral"}.`,
  );

  sections.push(
    isZh
      ? `**24h 最大波动**:${movers.map((m) => `${m.asset} ${m.change >= 0 ? "+" : ""}${m.change.toFixed(2)}%`).join(" · ")}`
      : `**Top movers 24h**: ${movers.map((m) => `${m.asset} ${m.change >= 0 ? "+" : ""}${m.change.toFixed(2)}%`).join(" · ")}`,
  );

  const posCount = posFunding.length;
  const negCount = negFunding.length;
  sections.push(
    isZh
      ? `**Funding 极值**:${hotFunding.map((r) => `${r.asset} ${r.fundingAnnual >= 0 ? "+" : ""}${r.fundingAnnual.toFixed(1)}%/年`).join(" · ")}。全平台 ${posCount} 个正 / ${negCount} 个负,${posCount > negCount * 2 ? "拥挤多头" : negCount > posCount * 2 ? "拥挤空头" : "方向相对平衡"}。`
      : `**Funding extremes**: ${hotFunding.map((r) => `${r.asset} ${r.fundingAnnual >= 0 ? "+" : ""}${r.fundingAnnual.toFixed(1)}%/yr`).join(" · ")}. ${posCount} positive / ${negCount} negative across the board — ${posCount > negCount * 2 ? "crowded longs" : negCount > posCount * 2 ? "crowded shorts" : "relatively balanced directionally"}.`,
  );

  sections.push(
    isZh
      ? `**成交王**:${topVol.map((r) => `${r.asset} ${fmtUsd(r.vol)}`).join(" · ")}。**OI 王**:${topOi.map((r) => `${r.asset} ${fmtUsd(r.oi)}`).join(" · ")}。`
      : `**Volume**: ${topVol.map((r) => `${r.asset} ${fmtUsd(r.vol)}`).join(" · ")}. **OI leaders**: ${topOi.map((r) => `${r.asset} ${fmtUsd(r.oi)}`).join(" · ")}.`,
  );

  if (hlp) {
    const aprPct = hlp.apr * 100;
    const healthWord =
      aprPct > 20
        ? isZh
          ? "强势"
          : "strong"
        : aprPct > 0
          ? isZh
            ? "稳定"
            : "stable"
          : isZh
            ? "亏损"
            : "drawdown";
    sections.push(
      isZh
        ? `**HLP 金库**:APR ${aprPct.toFixed(2)}%(${healthWord}),跟投者 ${hlp.followers?.length ?? 0} 人,${hlp.allowDeposits ? "开放存入" : "暂停存入"}。HLP 是 taker flow 的对手盘,APR 低 = 做市亏,通常意味着波动大或方向明显。`
        : `**HLP vault**: APR ${aprPct.toFixed(2)}% (${healthWord}), ${hlp.followers?.length ?? 0} followers, deposits ${hlp.allowDeposits ? "open" : "closed"}. HLP is the counterparty to taker flow — low APR means market-making is losing money, usually because volatility is high or direction is lopsided.`,
    );
  }

  return {
    lang,
    markdown: sections.join("\n\n"),
    structured: {
      total_oi_usd: Number(totalOi.toFixed(2)),
      total_volume_usd: Number(totalVol.toFixed(2)),
      perp_count: rows.length,
      breadth_pct: Number((breadth * 100).toFixed(2)),
      oi_weighted_funding_annual_pct: Number(avgFundingWeighted.toFixed(4)),
      positive_funding_count: posFunding.length,
      negative_funding_count: negFunding.length,
      top_movers: movers.map((m) => ({
        asset: m.asset,
        change_24h_pct: Number(m.change.toFixed(4)),
      })),
      hot_funding: hotFunding.map((r) => ({
        asset: r.asset,
        funding_annual_pct: Number(r.fundingAnnual.toFixed(4)),
      })),
      top_volume: topVol.map((r) => ({ asset: r.asset, volume_usd: Number(r.vol.toFixed(2)) })),
      top_oi: topOi.map((r) => ({ asset: r.asset, oi_usd: Number(r.oi.toFixed(2)) })),
      hlp: hlp ? { apr: hlp.apr, followers: hlp.followers?.length ?? 0 } : null,
      headline_regime: headlineRegime ?? null,
    },
  };
}
