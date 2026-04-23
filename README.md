# hyperliquid-radar

**Website**: https://hyperliquid-radar.vercel.app

The agent-native intelligence terminal for Hyperliquid.

Ask Claude / Cursor / Eliza anything about HL — liquidation risks, whale flows,
funding divergence, market narrative, wallet alerts. No more tab-switching to
Hyperdash.

**Status**: 5/23 tools implemented. See [PRD.md](./PRD.md) for the full spec.

**Ready now**:
- `get_top_liquidation_risks` — scan a list of HL wallet addresses, rank by proximity to liq
- `get_funding_divergence` — HL vs Binance / Bybit / OKX funding for any asset
- `asset_snapshot` — one-call overview: price, funding, OI, 24h volume, impact prices
- `get_all_asset_ctxs` — full perp universe, sortable by volume / funding / OI / 24h change
- `hlp_metrics` — HLP vault APR, TVL, follower count, deposit status

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
