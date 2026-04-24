# hyperliquid-radar

**Website**: https://hyperliquid-radar.vercel.app

The agent-native intelligence terminal for Hyperliquid.

Ask Claude / Cursor / Eliza anything about HL — liquidation risks, whale flows,
funding divergence, market narrative, wallet alerts. No more tab-switching to
Hyperdash.

**Status**: 22/26 tools implemented (+ alert-api + alert-daemon self-host stack). See [PRD.md](./PRD.md) for the full spec.

**Modules**:
- **A Liquidation Risk** (4/5): `get_top_liquidation_risks`, `liquidation_heatmap`, `simulate_cascade`, `my_position_risk` · pending: `historical_cascade_replay` (needs position snapshot DB)
- **B Whales & Flow** (3/5): `get_whale_flows`, `address_position_history`, `smart_money_flow` · pending: `new_whale_entries` (needs fill indexing), `whale_pnl_leaderboard` (no public HL leaderboard endpoint)
- **C Market Structure** (5/6): `get_funding_divergence`, `asset_snapshot`, `get_all_asset_ctxs`, `hlp_metrics`, `orderbook_imbalance` · pending: `insurance_fund_status` (HL API endpoint TBD)
- **D Narrative** (3/3): `explain_market_structure`, `asset_snapshot_narrative`, `daily_briefing`
- **E Alert Subscriptions** (7/7): 5 subscribe flavours + cancel + extend — all POST to `alert-api`

## Self-host the alert backend (optional)

`apps/landing` runs on Vercel. The alert service is Docker-composed on your own VPS:

```bash
cd deploy
TG_BOT_TOKEN=xxx docker compose up -d
```

This brings up `alert-api` (port 3200) + `alert-daemon` (polls HL every 60s) sharing a SQLite volume.

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
apps/             # (TBD) landing + docs (Next.js + Docusaurus on Vercel)
```

## Privacy

**We store zero user identity.** Subscription records (when alert module ships)
will only contain the push destination (TG chat_id / webhook URL) and criteria.
No accounts. No tokens. 30-day auto-expiry.

## License

MIT. See [LICENSE](./LICENSE).
