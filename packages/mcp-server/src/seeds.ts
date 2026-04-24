/**
 * Curated seed list of publicly-known Hyperliquid addresses.
 *
 * Sourcing rules (maintainer commitments):
 * 1. Every address MUST have a public source — a tweet the owner posted linking
 *    the address, an on-chain label from an explorer, or coverage by a known
 *    on-chain analytics publisher (Lookonchain, Arkham label, etc).
 * 2. We NEVER scrape "smart money" lists from paid platforms and re-publish.
 * 3. If an address is ambiguous, we DON'T add it. Better a small, correct list
 *    than a big, wrong one.
 *
 * If you want to expand this list, open a PR with one line per address and a
 * "source:" URL in the comment. Community PRs welcome.
 */
export interface SeedAddress {
  address: string;
  /** Public handle / known alias. */
  label: string;
  /** Short rationale + category. */
  note: string;
  /** Where the public attribution came from — must be a URL. */
  source?: string;
}

export const HL_SEED_ADDRESSES: SeedAddress[] = [
  {
    address: "0x5078c2fbea2b2ad61bc840bc023e35fce56bedb6",
    label: "James Wynn",
    note: "Well-known HL degen. Multiple public self-attributions on X.",
    source: "https://x.com/JamesWynnReal",
  },
  // More entries should be added only with a verified public source. This list
  // intentionally stays conservative. Tools that need a wider scan should use
  // `whale_pnl_leaderboard` to fetch the live top-N from HL stats-data.
];

export function seedAddressStrings(): string[] {
  return HL_SEED_ADDRESSES.map((s) => s.address);
}

export function seedAddressesInfo(): SeedAddress[] {
  return [...HL_SEED_ADDRESSES];
}
