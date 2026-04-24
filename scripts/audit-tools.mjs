import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { HLClient } from "../packages/core/dist/index.js";
import { tools, toolHandlers } from "../packages/mcp-server/dist/tools/index.js";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const outJson = resolve(repoRoot, "tool-audit-results.json");
const outMd = resolve(repoRoot, "tool-audit-report.md");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

HLClient.prototype.timeoutMs = 45000;

HLClient.prototype.info = async function patchedInfo(body) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45000);
    try {
      const res = await fetch(`${this.baseUrl}/info`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        throw new Error(`HL API ${res.status}: ${await res.text()}`);
      }
      return await res.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(500 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
};

HLClient.prototype.getLeaderboard = async function patchedLeaderboard() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45000);
    try {
      const res = await fetch("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard", {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://app.hyperliquid.xyz/",
          Origin: "https://app.hyperliquid.xyz",
          Accept: "application/json",
        },
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HL leaderboard ${res.status}`);
      const data = await res.json();
      return data.leaderboardRows ?? [];
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(500 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
};

function topKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).slice(0, 12)
    : [];
}

function brief(value) {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return "null";
  if (typeof value === "object") return `object{${topKeys(value).join(", ")}}`;
  return `${typeof value}:${String(value).slice(0, 80)}`;
}

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function evaluate(toolName, result, ctx) {
  const keys = topKeys(result);
  const shapeNotes = keys.length ? `top-level keys: ${keys.join(", ")}` : `result: ${brief(result)}`;
  let realismNotes = "Looks plausible.";
  let confusing = "";
  let pass = true;

  switch (toolName) {
    case "whale_pnl_leaderboard": {
      const row = result?.top_traders?.[0];
      pass = Array.isArray(result?.top_traders) && !!row && typeof row.address === "string";
      realismNotes = row
        ? `Top row ${row.address.slice(0, 8)}… account $${row.account_value_usd}, pnl $${row.pnl_usd}.`
        : "No traders returned.";
      break;
    }
    case "my_position_risk": {
      pass = Array.isArray(result?.positions) && isFiniteNumber(result?.account_value_usd);
      realismNotes = `Address has ${result?.position_count ?? 0} open positions; ${result?.at_risk_count ?? 0} flagged near liq.`;
      break;
    }
    case "simulate_my_liq_price": {
      pass =
        result?.status === "no_existing_position" ||
        isFiniteNumber(result?.current_mark_price) ||
        isFiniteNumber(result?.projected_size_usd);
      realismNotes =
        result?.status === "no_existing_position"
          ? "Graceful no-position response."
          : `Projected liq ${result?.projected_liq_price}, leverage ${result?.projected_leverage}.`;
      break;
    }
    case "get_funding_divergence": {
      pass = Array.isArray(result?.exchanges) && result.exchanges.length >= 1;
      realismNotes = `Compared ${result?.exchanges?.map((x) => x.exchange).join(", ") || "no venues"}.`;
      break;
    }
    case "asset_snapshot":
    case "historical_context":
    case "asset_snapshot_narrative":
    case "orderbook_imbalance": {
      pass = !!result && typeof result === "object";
      realismNotes = `Asset ${result?.asset ?? ctx.asset}.`;
      break;
    }
    case "get_all_asset_ctxs": {
      pass = Array.isArray(result?.assets) && result.assets.length > 0;
      realismNotes = `Returned ${result?.returned}/${result?.total} assets sorted by ${result?.sorted_by}.`;
      break;
    }
    case "compare_perps": {
      pass = Array.isArray(result?.table) && result.table.length >= 2;
      realismNotes = `Compared ${result?.table?.map((r) => r.asset).join(", ")}.`;
      break;
    }
    case "hlp_metrics": {
      pass = typeof result?.name === "string" && typeof result?.allow_deposits === "boolean";
      realismNotes = `HLP ${result?.name}, APR ${result?.apr}, followers ${result?.follower_count}.`;
      break;
    }
    case "detect_anomalies": {
      pass = !!result?.anomalies && Array.isArray(result?.anomalies?.top_oi);
      realismNotes = `${result?.headline_summary}`;
      break;
    }
    case "daily_briefing":
    case "explain_market_structure": {
      pass = typeof result?.markdown === "string" && result.markdown.length > 50;
      realismNotes = `Markdown length ${result?.markdown?.length ?? 0}.`;
      break;
    }
    case "get_top_liquidation_risks": {
      pass = Array.isArray(result?.positions);
      realismNotes = `Scanned ${result?.successful_queries}/${result?.queried_addresses}; found ${result?.total_positions_found} positions.`;
      break;
    }
    case "liquidation_heatmap": {
      pass = Array.isArray(result?.buckets);
      realismNotes = `Scanned ${result?.addresses_scanned} addresses, ${result?.buckets?.length ?? 0} buckets.`;
      break;
    }
    case "simulate_cascade": {
      pass = Array.isArray(result?.waves) && isFiniteNumber(result?.total_liq_usd);
      realismNotes = `Trigger ${result?.trigger_price}, final ${result?.final_price_estimate}, liq $${result?.total_liq_usd}.`;
      break;
    }
    case "get_recent_liquidations": {
      pass = Array.isArray(result?.liquidations);
      realismNotes = `Found ${result?.total_liquidations} liquidations in ${result?.hours}h scan.`;
      break;
    }
    case "get_whale_flows": {
      pass = Array.isArray(result?.flows);
      realismNotes = `Found ${result?.total_flows} flows over $${result?.min_size_usd}.`;
      break;
    }
    case "address_position_history": {
      pass = Array.isArray(result?.by_asset) && Array.isArray(result?.recent_fills);
      realismNotes = `${result?.total_fills} fills over ${result?.days}d, pnl $${result?.total_realized_pnl_usd}.`;
      break;
    }
    case "smart_money_flow": {
      pass = Array.isArray(result?.top_longs) && Array.isArray(result?.top_shorts);
      realismNotes = `Net bias ${result?.net_bias}, long/short ratio ${result?.long_short_ratio}.`;
      confusing =
        "Output note says addresses must be provided explicitly, but the tool actually defaults to seed addresses.";
      break;
    }
    case "get_funding_pnl": {
      pass = Array.isArray(result?.by_asset);
      realismNotes = `Funding pnl over ${result?.days}d: $${result?.net_funding_usd}.`;
      break;
    }
    default: {
      pass = !!result;
    }
  }

  if (toolName === "simulate_my_liq_price" && result?.current_distance_to_liq_pct === 0) {
    confusing = "Uses `distance && ...` so exact zero distances would become falsy/nullish.";
  }

  return { pass, shapeNotes, realismNotes, confusing };
}

async function callToolWithRetry(toolName, args) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await toolHandlers[toolName](args);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429") || attempt === 4) throw error;
      await sleep(3000 * attempt);
    }
  }
  throw lastError;
}

async function main() {
  const client = new HLClient();
  const [meta, mids] = await Promise.all([client.getMetaAndAssetCtxs(), client.getAllMids()]);
  const universe = meta[0].universe;
  const activeAssets = universe
    .map((u, i) => {
      const ctx = meta[1][i];
      const mark = Number(ctx.markPx);
      return {
        asset: u.name,
        oiUsd: Number(ctx.openInterest) * mark,
        volume: Number(ctx.dayNtlVlm),
      };
    })
    .sort((a, b) => b.oiUsd - a.oiUsd);

  const compareAssets = activeAssets.slice(0, 3).map((x) => x.asset);
  const defaultAsset = compareAssets[0] ?? "BTC";

  const whale = await toolHandlers.whale_pnl_leaderboard({
    window: "week",
    sort_by: "pnl",
    limit: 20,
    min_account_value_usd: 10000,
  });

  const leaderboardAddresses = whale.top_traders.map((r) => r.address);
  let chosenAddress = leaderboardAddresses[0] ?? "0x5078c2fbea2b2ad61bc840bc023e35fce56bedb6";
  let chosenAsset = defaultAsset;

  for (const address of leaderboardAddresses.slice(0, 10)) {
    try {
      const state = await client.getClearinghouseState(address);
      const positions = state.assetPositions
        .map((ap) => ap.position)
        .filter((p) => Number(p.szi) !== 0)
        .sort((a, b) => Math.abs(Number(b.positionValue)) - Math.abs(Number(a.positionValue)));
      if (positions[0]) {
        chosenAddress = address;
        chosenAsset = positions[0].coin;
        break;
      }
    } catch {}
  }

  const assetWithMid = mids[chosenAsset] ? chosenAsset : defaultAsset;
  const auditPlan = [
    ["get_top_liquidation_risks", { n: 10, asset: assetWithMid }],
    ["liquidation_heatmap", { asset: assetWithMid, bucket_pct: 0.5, range_pct: 15 }],
    ["simulate_cascade", { asset: assetWithMid, stress_pct: -5 }],
    ["my_position_risk", { address: chosenAddress }],
    ["simulate_my_liq_price", { address: chosenAddress, asset: assetWithMid, delta_size_usd: 10000 }],
    ["get_recent_liquidations", { hours: 24, min_size_usd: 10000 }],
    ["whale_pnl_leaderboard", { window: "week", sort_by: "pnl", limit: 10 }],
    ["get_whale_flows", { hours: 24, min_size_usd: 250000 }],
    ["address_position_history", { address: chosenAddress, days: 7 }],
    ["smart_money_flow", { asset: assetWithMid }],
    ["get_funding_pnl", { address: chosenAddress, days: 7 }],
    ["get_funding_divergence", { asset: assetWithMid }],
    ["asset_snapshot", { asset: assetWithMid }],
    ["get_all_asset_ctxs", { sort_by: "volume", limit: 20 }],
    ["hlp_metrics", {}],
    ["orderbook_imbalance", { asset: assetWithMid, depth_pct: 1 }],
    ["compare_perps", { assets: compareAssets }],
    ["historical_context", { asset: assetWithMid }],
    ["detect_anomalies", {}],
    ["explain_market_structure", { lang: "en" }],
    ["asset_snapshot_narrative", { asset: assetWithMid, lang: "en" }],
    ["daily_briefing", { lang: "en" }],
  ];

  const ctx = { address: chosenAddress, asset: assetWithMid, compareAssets };
  const results = [];

  for (const [toolName, args] of auditPlan) {
    const startedAt = Date.now();
    try {
      const result = await callToolWithRetry(toolName, args);
      const assessment = evaluate(toolName, result, ctx);
      results.push({
        tool: toolName,
        pass: assessment.pass,
        args,
        duration_ms: Date.now() - startedAt,
        shape_notes: assessment.shapeNotes,
        realism_notes: assessment.realismNotes,
        broken_or_confusing_behavior: assessment.confusing,
        preview: brief(result),
        result,
      });
      await sleep(1200);
    } catch (error) {
      results.push({
        tool: toolName,
        pass: false,
        args,
        duration_ms: Date.now() - startedAt,
        shape_notes: "call failed",
        realism_notes: "No result",
        broken_or_confusing_behavior: error instanceof Error ? error.message : String(error),
      });
      await sleep(2500);
    }
  }

  const payload = {
    context: {
      chosen_address: chosenAddress,
      chosen_asset: assetWithMid,
      compare_assets: compareAssets,
      audited_at: new Date().toISOString(),
    },
    results,
  };

  const lines = [
    "# Hyperliquid Radar Tool Audit",
    "",
    `Context: address \`${chosenAddress}\`, asset \`${assetWithMid}\`, compare assets \`${compareAssets.join(", ")}\``,
    "",
    "| Tool | Pass/Fail | Shape Notes | Realism Notes | Broken/Confusing Behavior |",
    "| --- | --- | --- | --- | --- |",
    ...results.map((r) => {
      const cells = [
        r.tool,
        r.pass ? "PASS" : "FAIL",
        r.shape_notes,
        r.realism_notes,
        r.broken_or_confusing_behavior || "",
      ].map((s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, "<br>"));
      return `| ${cells.join(" | ")} |`;
    }),
  ];

  writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(outMd, `${lines.join("\n")}\n`);
  console.log(JSON.stringify({ outJson, outMd, context: payload.context }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
