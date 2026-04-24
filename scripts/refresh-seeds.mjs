#!/usr/bin/env node
/**
 * Refresh packages/mcp-server/src/seeds_generated.ts from the live HL public
 * leaderboard. Run with:   node scripts/refresh-seeds.mjs
 *
 * Must be run AFTER `pnpm build` so packages/core/dist exists.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const coreDist = path.join(__dirname, "../packages/core/dist/index.js");

const { HLClient } = await import(url.pathToFileURL(coreDist).href);

const client = new HLClient({ timeoutMs: 60_000 });
console.log("fetching HL leaderboard …");
const rows = await client.getLeaderboard();
console.log("got", rows.length, "rows");

function pick(window) {
  return rows
    .map((r) => ({
      addr: r.ethAddress.toLowerCase(),
      pnl: Number(r.windowPerformances.find(([w]) => w === window)?.[1]?.pnl ?? 0),
      av: Number(r.accountValue),
      name: r.displayName,
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

const seen = new Map();
const push = (list, tag, n) => {
  for (const r of list.slice(0, n)) {
    if (seen.has(r.addr)) continue;
    seen.set(r.addr, { ...r, tag });
  }
};
push(pick("allTime"), "top30-allTime-pnl", 30);
push(pick("month"), "top20-month-pnl", 20);
push(pick("week"), "top20-week-pnl", 20);

const items = [...seen.values()]
  .map((r) => {
    const label = r.name ?? "Anonymous HL top trader";
    return `  { address: "${r.addr}", label: ${JSON.stringify(label)}, tag: "${r.tag}", pnl_usd: ${Math.round(r.pnl)}, account_value_usd: ${Math.round(r.av)} },`;
  })
  .join("\n");

const out = `/**
 * Auto-generated from HL public leaderboard (stats-data.hyperliquid.xyz/Mainnet/leaderboard)
 * at ${new Date().toISOString()}.
 *
 * Each entry is a real address that ranked in the top-30 all-time PnL, top-20
 * month PnL, or top-20 week PnL on Hyperliquid. displayName is preserved where
 * the trader set one publicly.
 *
 * Regenerate with:   node scripts/refresh-seeds.mjs
 */
export interface GeneratedSeed {
  address: string;
  label: string;
  tag: string;
  pnl_usd: number;
  account_value_usd: number;
}

export const HL_GENERATED_SEEDS: GeneratedSeed[] = [
${items}
];

export function generatedSeedAddresses(): string[] {
  return HL_GENERATED_SEEDS.map((s) => s.address);
}
`;

const dest = path.join(__dirname, "../packages/mcp-server/src/seeds_generated.ts");
fs.writeFileSync(dest, out);
console.log("wrote", dest, `(${seen.size} unique addresses)`);
