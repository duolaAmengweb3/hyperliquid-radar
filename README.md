# hyperliquid-radar

The agent-native intelligence terminal for Hyperliquid.

Ask Claude / Cursor / Eliza anything about HL — liquidation risks, whale flows,
funding divergence, market narrative, wallet alerts. No more tab-switching to
Hyperdash.

**Status**: scaffolding stage. 1/23 tools implemented. See [PRD.md](./PRD.md) for the full spec.

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
