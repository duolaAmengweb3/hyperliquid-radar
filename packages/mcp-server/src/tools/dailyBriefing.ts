import { HLClient, HL_VAULTS } from "@cexagent/core";
import { z } from "zod";
import type { ToolDef } from "./index.js";

export const dailyBriefingTool: ToolDef = {
  name: "daily_briefing",
  description:
    "One-page daily HL briefing in Markdown — headline mover, funding outliers, volume leaders, HLP, and a bullet list of notable events from the last 24h.",
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

export async function handleDailyBriefing(rawArgs: Record<string, unknown>): Promise<unknown> {
  const { lang } = inputSchema.parse(rawArgs);
  const client = new HLClient();
  const [meta, ctxs] = await client.getMetaAndAssetCtxs();
  const hlp = await client.getVaultDetails(HL_VAULTS.HLP).catch(() => null);

  const rows = meta.universe.map((m, i) => {
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

  const bestMover = rows.reduce((a, b) => (Math.abs(b.change) > Math.abs(a.change) ? b : a));
  const topVol = rows.reduce((a, b) => (b.vol > a.vol ? b : a));
  const extremeFunding = rows.reduce((a, b) =>
    Math.abs(b.fundingAnnual) > Math.abs(a.fundingAnnual) ? b : a,
  );
  const totalOi = rows.reduce((s, r) => s + r.oi, 0);
  const totalVol = rows.reduce((s, r) => s + r.vol, 0);
  const gainers = rows.filter((r) => r.change > 0).length;
  const losers = rows.filter((r) => r.change < 0).length;

  const date = new Date().toISOString().slice(0, 10);
  const isZh = lang === "zh";

  const md = isZh
    ? `# Hyperliquid 日报 — ${date}

## 今日亮点
- **最大波动**:**${bestMover.asset}** ${bestMover.change >= 0 ? "+" : ""}${bestMover.change.toFixed(2)}%
- **成交王**:**${topVol.asset}**(24h ${fmtUsd(topVol.vol)})
- **Funding 极值**:**${extremeFunding.asset}** 年化 ${extremeFunding.fundingAnnual >= 0 ? "+" : ""}${extremeFunding.fundingAnnual.toFixed(2)}%
- **全网 OI**:${fmtUsd(totalOi)}
- **24h 成交**:${fmtUsd(totalVol)}

## 涨跌分布
- 上涨:${gainers} 个
- 下跌:${losers} 个
- 无变动:${rows.length - gainers - losers} 个

## HLP 金库
${hlp ? `- APR:**${(hlp.apr * 100).toFixed(2)}%**\n- 跟投者:${hlp.followers?.length ?? 0} 人\n- 存入:${hlp.allowDeposits ? "开放" : "关闭"}` : "HLP 数据暂不可用"}

*数据来自 HL 公开 API,仅供分析,不构成投资建议。*`
    : `# Hyperliquid daily briefing — ${date}

## Highlights
- **Biggest mover**: **${bestMover.asset}** ${bestMover.change >= 0 ? "+" : ""}${bestMover.change.toFixed(2)}%
- **Volume king**: **${topVol.asset}** (${fmtUsd(topVol.vol)} in 24h)
- **Funding extreme**: **${extremeFunding.asset}** at ${extremeFunding.fundingAnnual >= 0 ? "+" : ""}${extremeFunding.fundingAnnual.toFixed(2)}% annualized
- **Platform OI**: ${fmtUsd(totalOi)}
- **24h volume**: ${fmtUsd(totalVol)}

## Breadth
- Up: ${gainers}
- Down: ${losers}
- Flat: ${rows.length - gainers - losers}

## HLP vault
${hlp ? `- APR: **${(hlp.apr * 100).toFixed(2)}%**\n- Followers: ${hlp.followers?.length ?? 0}\n- Deposits: ${hlp.allowDeposits ? "open" : "closed"}` : "HLP data unavailable"}

*Data from HL public API. For analysis only — not investment advice.*`;

  return {
    lang,
    date,
    markdown: md,
    summary: {
      biggest_mover: { asset: bestMover.asset, change_pct: Number(bestMover.change.toFixed(4)) },
      top_volume: { asset: topVol.asset, volume_usd: Number(topVol.vol.toFixed(2)) },
      extreme_funding: {
        asset: extremeFunding.asset,
        funding_annual_pct: Number(extremeFunding.fundingAnnual.toFixed(4)),
      },
      total_oi_usd: Number(totalOi.toFixed(2)),
      total_volume_usd: Number(totalVol.toFixed(2)),
    },
  };
}
