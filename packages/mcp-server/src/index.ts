#!/usr/bin/env node
import { runServer } from "./server.js";

runServer().catch((err) => {
  // Use stderr so we don't pollute the MCP stdout channel.
  process.stderr.write(`hyperliquid-radar fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
