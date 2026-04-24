# hyperliquid-radar

**Website**: https://hyperliquid-radar.vercel.app

The agent-native intelligence terminal for Hyperliquid.

Ask Claude / Cursor / Eliza anything about HL — liquidation risks, whale flows,
funding divergence, historical context, anomaly scans, market narrative. No more
tab-switching to Hyperdash.

**v0.3.0 · 22 tools across 4 modules.** See [PRD.md](./PRD.md) for the full spec.

## What's new in v0.3.0

- **`whale_pnl_leaderboard`** — live HL public leaderboard (top PnL / volume traders by day/week/month/allTime). Provides addresses you can feed into whale flow / smart money tools
- **`get_funding_pnl(address, days)`** — sum every funding payment received or paid on an address, broken down by asset. Critical for funding-arb accounting
- **`historical_context(asset)`** — current price + funding vs 7d / 30d baselines; realized vol; range position. Turns "BTC funding is +12%/yr" into "BTC funding is extreme relative to the past month"
- **`detect_anomalies`** — one-call HL-wide scan for extreme funding, big movers, volume spikes, top OI. Saves 20 minutes of manual dashboard scrolling
- Expert-level `explain_market_structure` — now classifies regime (organic rally / short squeeze / funding bleed / coiling) per asset and computes OI-weighted platform funding

## Modules

- **A Liquidation Risk** (6): `get_top_liquidation_risks`, `liquidation_heatmap`, `simulate_cascade`, `my_position_risk`, `simulate_my_liq_price`, `get_recent_liquidations`
- **B Whales & Flow** (5): `whale_pnl_leaderboard` 🆕, `get_whale_flows`, `address_position_history`, `smart_money_flow`, `get_funding_pnl` 🆕
- **C Market Structure** (8): `get_funding_divergence`, `asset_snapshot`, `get_all_asset_ctxs`, `hlp_metrics`, `orderbook_imbalance`, `compare_perps`, `historical_context` 🆕, `detect_anomalies` 🆕
- **D Narrative** (3): `explain_market_structure`, `asset_snapshot_narrative`, `daily_briefing` — bilingual Markdown

## Install

### Claude Desktop (stdio)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hyperliquid-radar": {
      "command": "npx",
      "args": ["-y", "hyperliquid-radar"]
    }
  }
}
```

### Cursor

```bash
mcp add hyperliquid-radar
```

## Example prompts

- "HL 上现在最危险的 10 个仓位"
- "现在 HL 上最大的 3 个异常"
- "machi 过去 7 天收了多少 funding"
- "HL top 20 trader by PnL this week"
- "BTC 当前 funding 和过去 30 天比算不算极端"
- "给我一段 HL 当前市场结构的分析"

## Development

Requires Node 20+ and pnpm 10+.

```bash
pnpm install
pnpm build
pnpm test
```

## Privacy

**Zero data collection.** The MCP server runs as a subprocess of your agent.
Every tool call goes directly from your machine to Hyperliquid's public API. We
run no backend. No accounts, no login, no telemetry. MIT license.

## License

MIT. See [LICENSE](./LICENSE).
