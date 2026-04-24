import { HLClient, HL_VAULTS } from "@cexagent/core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const explainMarketStructureTool: ToolDef = {
  name: "explain_market_structure",
  description:
    "High-level Markdown narrative of the current Hyperliquid market — top movers, extreme funding outliers, total OI, HLP status. Use this when the user asks 'what's happening on HL right now' and wants a paragraph.",
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

export async function handleExplainMarketStructure(
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const { lang } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [meta, ctxs] = await client.getMetaAndAssetCtxs();
  const hlp = await client.getVaultDetails(HL_VAULTS.HLP).catch(() => null);

  type Row = {
    asset: string;
    mark: number;
    change: number;
    fundingAnnual: number;
    oi: number;
    vol: number;
  };
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
  const movers = [...rows].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
  const hotFunding = [...rows]
    .sort((a, b) => Math.abs(b.fundingAnnual) - Math.abs(a.fundingAnnual))
    .slice(0, 5);
  const topVol = [...rows].sort((a, b) => b.vol - a.vol).slice(0, 5);

  const isZh = lang === "zh";
  const sections: string[] = [];
  sections.push(
    isZh
      ? `**HL 概况**:全平台 OI ${fmtUsd(totalOi)},24h 成交 ${fmtUsd(totalVol)},共 ${rows.length} 个 perp。`
      : `**HL overview**: platform OI ${fmtUsd(totalOi)}, 24h volume ${fmtUsd(totalVol)} across ${rows.length} perps.`,
  );

  sections.push(
    isZh
      ? `**24h 最大波动**:${movers.map((m) => `${m.asset} ${m.change >= 0 ? "+" : ""}${m.change.toFixed(2)}%`).join(" · ")}`
      : `**Top movers 24h**: ${movers.map((m) => `${m.asset} ${m.change >= 0 ? "+" : ""}${m.change.toFixed(2)}%`).join(" · ")}`,
  );

  sections.push(
    isZh
      ? `**Funding 极值**:${hotFunding
          .map(
            (r) => `${r.asset} ${r.fundingAnnual >= 0 ? "+" : ""}${r.fundingAnnual.toFixed(1)}%/年`,
          )
          .join(" · ")}。正 = 多头付费,负 = 空头付费。`
      : `**Funding extremes**: ${hotFunding
          .map(
            (r) => `${r.asset} ${r.fundingAnnual >= 0 ? "+" : ""}${r.fundingAnnual.toFixed(1)}%/yr`,
          )
          .join(" · ")}. Positive = longs pay.`,
  );

  sections.push(
    isZh
      ? `**成交量最高**:${topVol.map((r) => `${r.asset} ${fmtUsd(r.vol)}`).join(" · ")}`
      : `**Top volume**: ${topVol.map((r) => `${r.asset} ${fmtUsd(r.vol)}`).join(" · ")}`,
  );

  if (hlp) {
    sections.push(
      isZh
        ? `**HLP 金库**:APR ${(hlp.apr * 100).toFixed(2)}%,跟投者 ${hlp.followers?.length ?? 0} 人,${hlp.allowDeposits ? "当前开放存入" : "暂停存入"}。`
        : `**HLP vault**: APR ${(hlp.apr * 100).toFixed(2)}%, ${hlp.followers?.length ?? 0} followers, deposits ${hlp.allowDeposits ? "open" : "closed"}.`,
    );
  }

  return {
    lang,
    markdown: sections.join("\n\n"),
    structured: {
      total_oi_usd: Number(totalOi.toFixed(2)),
      total_volume_usd: Number(totalVol.toFixed(2)),
      perp_count: rows.length,
      top_movers: movers.map((m) => ({
        asset: m.asset,
        change_24h_pct: Number(m.change.toFixed(4)),
      })),
      hot_funding: hotFunding.map((r) => ({
        asset: r.asset,
        funding_annual_pct: Number(r.fundingAnnual.toFixed(4)),
      })),
      top_volume: topVol.map((r) => ({ asset: r.asset, volume_usd: Number(r.vol.toFixed(2)) })),
      hlp: hlp ? { apr: hlp.apr, followers: hlp.followers?.length ?? 0 } : null,
    },
  };
}
