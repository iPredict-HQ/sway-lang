// ── Pure Utility Functions ────────────────────────────────────────────────────

const BASE_UNITS_PER_ETH = 1_000_000_000n; // 9 decimal places on Fuel

/**
 * Convert base units (bigint, 9 decimals) to human-readable ETH string.
 * Example: 1234567890n → "1.23456789 ETH"
 */
export function formatETH(baseUnits: bigint): string {
  const isNegative = baseUnits < 0n;
  const abs = isNegative ? -baseUnits : baseUnits;
  const whole = abs / BASE_UNITS_PER_ETH;
  const fractional = abs % BASE_UNITS_PER_ETH;
  const fracStr = fractional.toString().padStart(9, "0").replace(/0+$/, "");
  const sign = isNegative ? "-" : "";

  if (fracStr.length === 0) {
    return `${sign}${whole} ETH`;
  }
  return `${sign}${whole}.${fracStr} ETH`;
}

/** @deprecated Use formatETH instead */
export const formatXLM = formatETH;

/**
 * Format a number (already in ETH units) to a display string.
 * Example: 12.5 → "12.50 ETH", 0 → "0 ETH"
 */
export function displayETH(eth: number): string {
  if (eth === 0) return "0 ETH";
  // Show up to 4 decimal places, trim trailing zeros
  const formatted = eth.toFixed(4).replace(/\.?0+$/, "");
  return `${formatted} ETH`;
}

/** @deprecated Use displayETH instead */
export const displayXLM = displayETH;

/**
 * Truncate a Fuel/hex address for display.
 * Example: "0x1234abcd...ef56" → "0x1234...ef56"
 */
export function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Validate a bet amount string against constraints.
 * - Must be a valid positive number
 * - Must be >= 0.001 (ETH minimum)
 * - Must not exceed the user's balance
 */
export function isValidAmount(amount: string, balance: number): boolean {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0.001) return false;
  return parsed <= balance;
}

/**
 * Return a human-readable "time until" string from a Unix timestamp.
 * Example: timestamp 2 days from now → "2d 14h 32m"
 */
export function timeUntil(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;

  const seconds = diff;
  return `${seconds}s`;
}

/**
 * Format a Unix timestamp to a locale-aware date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate a winner's payout from a prediction market.
 *
 * payout = (userNetBet / winningSideTotal) × totalPool
 *
 * All values in ETH (not base units).
 */
export function calculatePayout(
  userNetBet: number,
  winningSideTotal: number,
  totalPool: number
): number {
  if (winningSideTotal <= 0) return 0;
  return (userNetBet / winningSideTotal) * totalPool;
}

/**
 * Calculate YES/NO odds percentages from net totals.
 * Returns { yesPercent, noPercent } — each 0-100.
 */
export function calculateOdds(
  totalYes: number,
  totalNo: number
): { yesPercent: number; noPercent: number } {
  const total = totalYes + totalNo;
  if (total <= 0) return { yesPercent: 50, noPercent: 50 };

  const yesPercent = Math.round((totalYes / total) * 100);
  return { yesPercent, noPercent: 100 - yesPercent };
}

/**
 * Convert basis points to a percentage string.
 * Example: 200 → "2%", 150 → "1.5%"
 */
export function bpsToPercent(bps: number): string {
  const pct = bps / 100;
  return pct % 1 === 0 ? `${pct}%` : `${pct}%`;
}

/**
 * Build a Fuel explorer URL.
 */
export function explorerUrl(
  type: "tx" | "account" | "contract",
  id: string
): string {
  const base = "https://app.fuel.network";
  switch (type) {
    case "tx":
      return `${base}/tx/${id}`;
    case "account":
      return `${base}/account/${id}`;
    case "contract":
      return `${base}/contract/${id}`;
    default:
      return `${base}`;
  }
}
