import type { Account } from "fuels";
import { getReferralContract, addressIdentity, extractAddress, bnToNumber, executeContractCall } from "@/services/fuel";
import * as cache from "@/services/cache";
import type { TransactionResult } from "@/types";

// ── Cache keys & TTLs ────────────────────────────────────────────────────────

const CACHE_REFERRER = (addr: string) => `ref_referrer_${addr}`;
const CACHE_DISPLAY_NAME = (addr: string) => `ref_name_${addr}`;
const CACHE_REF_COUNT = (addr: string) => `ref_count_${addr}`;
const CACHE_EARNINGS = (addr: string) => `ref_earnings_${addr}`;
const CACHE_HAS_REF = (addr: string) => `ref_has_${addr}`;
const CACHE_REGISTERED = (addr: string) => `ref_reg_${addr}`;

const REF_TTL = 60_000; // 60s — referral data changes infrequently

// ── Write functions ───────────────────────────────────────────────────────────

/** Register referral for a user */
export async function registerReferral(
  displayName: string,
  referrer: string | null,
  wallet: Account
): Promise<TransactionResult> {
  const contract = await getReferralContract(wallet);

  // Fuel SDK handles Option type: pass undefined for None, value for Some
  const referrerInput = referrer ? addressIdentity(referrer) : undefined;

  const result = await executeContractCall(() =>
    contract.functions
      .register_referral(displayName, referrerInput)
      .call()
  );

  if (result.success) {
    const userAddress = wallet.address.toB256();
    // Invalidate all referral-related caches for this user
    cache.invalidate(CACHE_REGISTERED(userAddress));
    cache.invalidate(CACHE_DISPLAY_NAME(userAddress));
    cache.invalidate(CACHE_HAS_REF(userAddress));
    cache.invalidate(CACHE_REFERRER(userAddress));
    if (referrer) {
      cache.invalidate(CACHE_REF_COUNT(referrer));
    }
  }
  return result;
}

// ── Read functions ────────────────────────────────────────────────────────────

/** Get the referrer address for a user (or null if none) */
export async function getReferrer(
  userAddress: string
): Promise<string | null> {
  const cacheKey = CACHE_REFERRER(userAddress);
  const cached = cache.get<string | null>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const contract = await getReferralContract();
    const { value } = await contract.functions
      .get_referrer(addressIdentity(userAddress))
      .get();
    // Option<Identity> — undefined means None
    if (!value) {
      cache.set(cacheKey, null, REF_TTL);
      return null;
    }
    const address = extractAddress(value);
    cache.set(cacheKey, address, REF_TTL);
    return address;
  } catch {
    return null;
  }
}

/** Get display name for a user (empty string if not registered) */
export async function getDisplayName(
  userAddress: string
): Promise<string> {
  const cacheKey = CACHE_DISPLAY_NAME(userAddress);
  const cached = cache.get<string>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getReferralContract();
    const { value } = await contract.functions
      .get_display_name(addressIdentity(userAddress))
      .get();
    const name = value || "";
    cache.set(cacheKey, name, REF_TTL);
    return name;
  } catch {
    return "";
  }
}

/** Get referral count for a user */
export async function getReferralCount(
  userAddress: string
): Promise<number> {
  const cacheKey = CACHE_REF_COUNT(userAddress);
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getReferralContract();
    const { value } = await contract.functions
      .get_referral_count(addressIdentity(userAddress))
      .get();
    cache.set(cacheKey, value, REF_TTL);
    return value;
  } catch {
    return 0;
  }
}

/** Get total referral earnings for a user (in base units) */
export async function getEarnings(userAddress: string): Promise<number> {
  const cacheKey = CACHE_EARNINGS(userAddress);
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getReferralContract();
    const { value } = await contract.functions
      .get_earnings(addressIdentity(userAddress))
      .get();
    const earnings = bnToNumber(value);
    cache.set(cacheKey, earnings, REF_TTL);
    return earnings;
  } catch {
    return 0;
  }
}

/** Check if user has a custom referrer */
export async function hasReferrer(userAddress: string): Promise<boolean> {
  const cacheKey = CACHE_HAS_REF(userAddress);
  const cached = cache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getReferralContract();
    const { value } = await contract.functions
      .has_referrer(addressIdentity(userAddress))
      .get();
    cache.set(cacheKey, value, REF_TTL);
    return value;
  } catch {
    return false;
  }
}

/** Check if user is registered */
export async function isRegistered(userAddress: string): Promise<boolean> {
  const cacheKey = CACHE_REGISTERED(userAddress);
  const cached = cache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getReferralContract();
    const { value } = await contract.functions
      .is_registered(addressIdentity(userAddress))
      .get();
    cache.set(cacheKey, value, REF_TTL);
    return value;
  } catch {
    return false;
  }
}

// ── Name-to-Address resolution ────────────────────────────────────────────────

/**
 * Resolve a display name to a Fuel address by scanning all known bettors.
 * Returns the matching address or null if not found.
 * Case-insensitive, exact match.
 */
export async function resolveAddressByName(
  name: string
): Promise<string | null> {
  const cacheKey = `ref_name_resolve_${name.toLowerCase()}`;
  const cached = cache.get<string | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    // Import dynamically to avoid circular dependency
    const { getMarkets } = await import("@/services/market");
    const markets = await getMarkets();
    if (markets.length === 0) return null;

    // Collect unique bettor addresses from market creators
    const addressSet = new Set<string>();
    for (const m of markets) {
      if (m.creator) addressSet.add(m.creator);
    }

    // Check each address's display name
    const needle = name.toLowerCase().trim();
    for (const addr of addressSet) {
      try {
        const dName = await getDisplayName(addr);
        if (dName && dName.toLowerCase().trim() === needle) {
          cache.set(cacheKey, addr, REF_TTL);
          return addr;
        }
      } catch {
        // skip
      }
    }

    return null;
  } catch {
    return null;
  }
}
