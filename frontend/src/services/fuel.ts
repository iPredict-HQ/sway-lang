import { Provider, type Account, type BN } from "fuels";
import { NETWORK, MARKET_CONTRACT_ID, TOKEN_CONTRACT_ID, REFERRAL_CONTRACT_ID, LEADERBOARD_CONTRACT_ID } from "@/config/network";
import { PredictionMarket, IpredictToken, ReferralRegistry, Leaderboard } from "@/sway-api";
import { AppErrorType } from "@/types";
import type { AppError, TransactionResult } from "@/types";

// ── Provider singleton ────────────────────────────────────────────────────────

let _provider: Provider | null = null;

/**
 * Get a Provider instance connected to the Fuel testnet.
 * Lazily instantiated singleton.
 */
export async function getProvider(): Promise<Provider> {
  if (!_provider) {
    _provider = new Provider(NETWORK.providerUrl);
  }
  return _provider;
}

// ── Base asset ID ─────────────────────────────────────────────────────────────

/**
 * Get the base asset ID (ETH) for the connected network.
 */
export async function getBaseAssetId(): Promise<string> {
  const provider = await getProvider();
  return provider.getBaseAssetId();
}

// ── Native ETH balance ───────────────────────────────────────────────────────

/**
 * Fetch native ETH balance for an account.
 * Returns balance in ETH (human-readable units, e.g. 1.5).
 */
export async function getEthBalance(address: string): Promise<number> {
  try {
    const provider = await getProvider();
    const baseAssetId = await provider.getBaseAssetId();
    const balance = await provider.getBalance(address, baseAssetId);
    return balance.toNumber() / 1e9; // 9 decimals
  } catch {
    return 0;
  }
}

// ── Typed contract getters ────────────────────────────────────────────────────

/**
 * Get a typed PredictionMarket contract instance.
 * If wallet (Account) is provided, write transactions can be executed.
 * If not, only read-only (dry-run) calls are possible.
 */
export async function getMarketContract(wallet?: Account): Promise<PredictionMarket> {
  if (!MARKET_CONTRACT_ID) throw createAppError(AppErrorType.CONTRACT, "Market contract ID not configured");
  const accountOrProvider = wallet ?? await getProvider();
  return new PredictionMarket(MARKET_CONTRACT_ID, accountOrProvider);
}

/**
 * Get a typed IpredictToken contract instance.
 */
export async function getTokenContract(wallet?: Account): Promise<IpredictToken> {
  if (!TOKEN_CONTRACT_ID) throw createAppError(AppErrorType.CONTRACT, "Token contract ID not configured");
  const accountOrProvider = wallet ?? await getProvider();
  return new IpredictToken(TOKEN_CONTRACT_ID, accountOrProvider);
}

/**
 * Get a typed ReferralRegistry contract instance.
 */
export async function getReferralContract(wallet?: Account): Promise<ReferralRegistry> {
  if (!REFERRAL_CONTRACT_ID) throw createAppError(AppErrorType.CONTRACT, "Referral contract ID not configured");
  const accountOrProvider = wallet ?? await getProvider();
  return new ReferralRegistry(REFERRAL_CONTRACT_ID, accountOrProvider);
}

/**
 * Get a typed Leaderboard contract instance.
 */
export async function getLeaderboardContract(wallet?: Account): Promise<Leaderboard> {
  if (!LEADERBOARD_CONTRACT_ID) throw createAppError(AppErrorType.CONTRACT, "Leaderboard contract ID not configured");
  const accountOrProvider = wallet ?? await getProvider();
  return new Leaderboard(LEADERBOARD_CONTRACT_ID, accountOrProvider);
}

// ── BN helpers ────────────────────────────────────────────────────────────────

/**
 * Convert a Fuel BN to a regular JS number.
 * Safe for values that fit in Number range.
 */
export function bnToNumber(bn: BN): number {
  return bn.toNumber();
}

// TAI64 epoch offset — Fuel's timestamp() returns TAI64 format
const TAI64_EPOCH = BigInt("4611686018427387904");

/**
 * Safely convert a Fuel BN to a JS number.
 * Handles TAI64 timestamps (> 53 bits) by converting to Unix seconds.
 */
export function safeBnToNumber(bn: BN): number {
  try {
    return bn.toNumber();
  } catch {
    // Value exceeds 53 bits — likely a TAI64 timestamp
    const big = BigInt(bn.toString());
    if (big > TAI64_EPOCH) {
      return Number(big - TAI64_EPOCH);
    }
    // Fallback: return as-is (may lose precision)
    return Number(big);
  }
}

/**
 * Convert a Fuel BN (base units, 9 decimals) to human-readable ETH.
 */
export function bnToEth(bn: BN): number {
  return bn.toNumber() / 1e9;
}

/**
 * Convert human-readable ETH to base units (9 decimals).
 */
export function ethToBaseUnits(eth: number): number {
  return Math.round(eth * 1e9);
}

// ── Identity helpers ──────────────────────────────────────────────────────────

/**
 * Build an Identity::Address input for contract calls.
 * Fuel addresses are 0x-prefixed 64-char hex strings.
 */
export function addressIdentity(address: string): { Address: { bits: string } } {
  return { Address: { bits: address } };
}

/**
 * Extract the address string from an Identity output.
 * Returns the raw address string (0x-prefixed hex).
 */
export function extractAddress(identity: { Address?: { bits: string }; ContractId?: { bits: string } }): string {
  if (identity.Address) return identity.Address.bits;
  if (identity.ContractId) return identity.ContractId.bits;
  return "";
}

// ── Error classification ──────────────────────────────────────────────────────

/**
 * Classify a Fuel SDK error into an AppError for consistent frontend handling.
 */
export function classifyError(err: unknown): AppError {
  const message = extractErrorMessage(err);
  const lower = message.toLowerCase();

  // Network errors
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("aborted") ||
    lower.includes("provider")
  ) {
    return createAppError(AppErrorType.NETWORK, "Network request failed — check your connection", message);
  }

  // Wallet / signing errors
  if (
    lower.includes("rejected") ||
    lower.includes("denied") ||
    lower.includes("cancelled") ||
    lower.includes("wallet") ||
    lower.includes("sign") ||
    lower.includes("user rejected")
  ) {
    return createAppError(AppErrorType.WALLET, "Wallet operation cancelled", message);
  }

  // Contract revert errors
  if (
    lower.includes("revert") ||
    lower.includes("panic") ||
    lower.includes("require") ||
    lower.includes("contract") ||
    lower.includes("script")
  ) {
    return createAppError(AppErrorType.CONTRACT, "Contract call failed — the contract may have rejected this action", message);
  }

  // Insufficient funds
  if (
    lower.includes("insufficient") ||
    lower.includes("not enough") ||
    lower.includes("balance")
  ) {
    return createAppError(AppErrorType.VALIDATION, "Insufficient funds for this transaction", message);
  }

  // Default
  return createAppError(AppErrorType.NETWORK, message || "Transaction failed", message);
}

/**
 * Extract a useful error message from various error types.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      const msg = (err as { message: string }).message;
      const details = "details" in err ? (err as { details: string }).details : "";
      return details ? `${msg}: ${details}` : msg;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export function createAppError(type: AppErrorType, message: string, details?: string): AppError {
  return { type, message, details };
}

export function isAppError(err: unknown): err is AppError {
  return typeof err === "object" && err !== null && "type" in err && "message" in err;
}

/**
 * Wrap a Fuel contract .call() into a TransactionResult.
 * Handles error classification automatically.
 */
export async function executeContractCall(
  callFn: () => Promise<{ transactionId: string }>
): Promise<TransactionResult> {
  try {
    const result = await callFn();
    return { success: true, hash: result.transactionId };
  } catch (err) {
    console.error("[iPredict] Contract call error:", err);
    const appErr = classifyError(err);
    return { success: false, error: appErr.message };
  }
}
