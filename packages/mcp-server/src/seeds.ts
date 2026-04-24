import { HL_GENERATED_SEEDS, generatedSeedAddresses } from "./seeds_generated.js";

/**
 * Seed addresses for HL tools that fall back when the user doesn't supply an
 * explicit `addresses` array.
 *
 * Two tiers:
 *
 * 1. HL_MANUAL_SEEDS — hand-curated, each entry has a public self-attribution
 *    (e.g. the owner posted it on X). Conservative list, high confidence.
 *
 * 2. HL_GENERATED_SEEDS — imported from seeds_generated.ts, which is
 *    auto-produced from the live HL public leaderboard. 59 addresses spanning
 *    top-30 all-time PnL + top-20 month + top-20 week (deduped). These are
 *    officially broadcast by HL's own endpoints; we are just caching a snapshot.
 *
 * seedAddressStrings() returns manual + generated concatenated and deduped.
 *
 * When tools need a small-and-cheap fallback they use this. When they need
 * freshest and largest, they call whale_pnl_leaderboard directly.
 */
export interface SeedAddress {
  address: string;
  label: string;
  note?: string;
  source?: string;
}

export const HL_MANUAL_SEEDS: SeedAddress[] = [
  {
    address: "0x5078c2fbea2b2ad61bc840bc023e35fce56bedb6",
    label: "James Wynn",
    note: "Well-known HL degen. Multiple public self-attributions on X.",
    source: "https://x.com/JamesWynnReal",
  },
];

export function seedAddressStrings(): string[] {
  const manual = HL_MANUAL_SEEDS.map((s) => s.address.toLowerCase());
  const generated = generatedSeedAddresses().map((a) => a.toLowerCase());
  const set = new Set<string>([...manual, ...generated]);
  return [...set];
}

export function seedAddressesInfo(): SeedAddress[] {
  const manualSet = new Set(HL_MANUAL_SEEDS.map((s) => s.address.toLowerCase()));
  const fromGenerated = HL_GENERATED_SEEDS.filter(
    (g) => !manualSet.has(g.address.toLowerCase()),
  ).map((g) => ({
    address: g.address,
    label: g.label,
    note: `HL leaderboard: ${g.tag}, PnL $${(g.pnl_usd / 1_000_000).toFixed(1)}M`,
    source: "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard",
  }));
  return [...HL_MANUAL_SEEDS, ...fromGenerated];
}
