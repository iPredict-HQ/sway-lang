// ── Network Configuration ─────────────────────────────────────────────────────

export const NETWORK = {
  name: "fuel-testnet",
  /** Fuel provider URL (GraphQL endpoint) */
  providerUrl:
    process.env.NEXT_PUBLIC_FUEL_PROVIDER_URL ||
    "https://testnet.fuel.network/v1/graphql",
  /** Fuel testnet chain ID */
  chainId: 0,
  /** Fuel block explorer base URL */
  explorerUrl: "https://app.fuel.network",
} as const;

// ── Contract IDs ──────────────────────────────────────────────────────────────
// Set via environment variables after deployment. Empty string = not deployed.

export const MARKET_CONTRACT_ID =
  process.env.NEXT_PUBLIC_MARKET_CONTRACT_ID || "";

export const TOKEN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID || "";

export const REFERRAL_CONTRACT_ID =
  process.env.NEXT_PUBLIC_REFERRAL_CONTRACT_ID || "";

export const LEADERBOARD_CONTRACT_ID =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_ID || "";

// ── Admin ─────────────────────────────────────────────────────────────────────

export const ADMIN_ADDRESS =
  process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "";

// ── Fee Model (basis points — BPS) ───────────────────────────────────────────
// 2% total fee deducted at bet time, split: 1.5% platform + 0.5% referrer

/** Total fee: 200 BPS = 2% */
export const TOTAL_FEE_BPS = 200;

/** Platform fee: 150 BPS = 1.5% — kept in AccumulatedFees */
export const PLATFORM_FEE_BPS = 150;

/** Referral fee: 50 BPS = 0.5% — sent to referrer if user has one */
export const REFERRAL_FEE_BPS = 50;

// ── Reward Constants ──────────────────────────────────────────────────────────

/** Bonus points a referrer earns per referred bet */
export const REFERRAL_BET_POINTS = 3;

/** Points awarded to a winning bettor */
export const WIN_POINTS = 30;

/** Points awarded to a losing bettor */
export const LOSE_POINTS = 10;

/** IPREDICT tokens awarded to a winning bettor (human-readable, 9 decimal) */
export const WIN_TOKENS = 10;

/** IPREDICT tokens awarded to a losing bettor (human-readable, 9 decimal) */
export const LOSE_TOKENS = 2;

/** Bonus points for registering via referral */
export const REGISTER_BONUS_POINTS = 5;

/** Bonus IPREDICT tokens for registering */
export const REGISTER_BONUS_TOKENS = 1;

// ── Token Decimals ────────────────────────────────────────────────────────────

/** Fuel native asset (ETH) uses 9 decimal places */
export const ETH_DECIMALS = 9;

/** IPREDICT token uses 9 decimal places */
export const TOKEN_DECIMALS = 9;

/** 1 ETH in base units */
export const ONE_ETH = 1_000_000_000;

