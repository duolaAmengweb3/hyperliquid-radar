/**
 * Curated seed list of publicly-known Hyperliquid addresses.
 *
 * These are addresses whose handles / owners are widely documented in crypto
 * Twitter and public HL leaderboard screenshots. When a tool doesn't receive
 * explicit `addresses`, it falls back to this list so the UX works out of the box.
 *
 * To expand the list, send a PR with a source URL showing the address is
 * publicly associated with the named identity. We intentionally keep the list
 * small and well-sourced rather than dumping leaderboard scrapes — those go stale.
 */
export interface SeedAddress {
  address: string;
  /** Public handle / nickname, if known. */
  label: string;
  /** Short note on why this address is notable. */
  note?: string;
}

export const HL_SEED_ADDRESSES: SeedAddress[] = [
  {
    address: "0x5078C2FBEA2B2Ad61bC840Bc023E35FcE56bedB6",
    label: "James Wynn",
    note: "Well-known HL degen; often posts entries on X.",
  },
  // Additional seeds will be added as addresses are publicly confirmed. PRs welcome.
];

export function seedAddressStrings(): string[] {
  return HL_SEED_ADDRESSES.map((s) => s.address);
}
