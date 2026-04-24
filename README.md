# hyperliquid-radar

**Website**: https://hyperliquid-radar.vercel.app

The agent-native intelligence terminal for Hyperliquid.

Ask Claude / Cursor / Eliza anything about HL — liquidation risks, whale flows,
funding divergence, market narrative. No more tab-switching to Hyperdash.

**Status**: 15/19 tools implemented across 4 modules. See [PRD.md](./PRD.md) for the full spec.

## Modules

- **A Liquidation Risk** (4/5): `get_top_liquidation_risks`, `liquidation_heatmap`, `simulate_cascade`, `my_position_risk` · pending: `historical_cascade_replay` (needs position snapshot DB)
- **B Whales & Flow** (3/5): `get_whale_flows`, `address_position_history`, `smart_money_flow` · pending: `new_whale_entries`, `whale_pnl_leaderboard` (both need continuous fill indexing / no public HL leaderboard)
- **C Market Structure** (5/6): `get_funding_divergence`, `asset_snapshot`, `get_all_asset_ctxs`, `hlp_metrics`, `orderbook_imbalance` · pending: `insurance_fund_status` (HL endpoint TBD)
- **D Narrative** (3/3): `explain_market_structure`, `asset_snapshot_narrative`, `daily_briefing` — bilingual Markdown

## Install

### Claude Desktop (stdio)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hyperliquid-radar": {
      "command": "npx",
      "args": ["@cexagent/hyperliquid-radar"]
    }
  }
}
```

### Cursor

```bash
mcp add @cexagent/hyperliquid-radar
```

## Development

Requires Node 20+ and pnpm 10+.

```bash
pnpm install
pnpm build
pnpm test

# Run the MCP server locally (stdio)
node packages/mcp-server/dist/index.js
```

## Project structure

```
packages/
  core/           # shared HL / CEX data clients, cache, types
  mcp-server/     # @cexagent/hyperliquid-radar npm package (stdio MCP server)
apps/
  landing/        # hyperliquid-radar.vercel.app (Next.js 15, bilingual)
```

## Privacy

**Zero data collection.** The MCP server runs as a subprocess of your agent. Every
tool call goes directly from your machine to Hyperliquid's public API. We run no
backend. No accounts, no login, no telemetry. MIT license.

## License

MIT. See [LICENSE](./LICENSE).
