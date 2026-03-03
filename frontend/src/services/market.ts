import type { Account } from "fuels";
import {
  getMarketContract,
  ethToBaseUnits,
  getBaseAssetId,
  executeContractCall,
} from "@/services/fuel";
import * as cache from "@/services/cache";
import type { Market, Bet, TransactionResult } from "@/types";

// Lazy import to avoid potential circular dependency issues
async function resolveDisplayName(address: string): Promise<string> {
  try {
    // Dynamic import loaded at runtime
    const mod = await import("./referral");
    return mod.getDisplayName(address);
  } catch {
    return address;
  }
}

// ── Cache keys & TTLs ────────────────────────────────────────────────────────

const CACHE_MARKETS = "markets";
const CACHE_MARKET = (id: number) => `market_${id}`;
const CACHE_BET = (mId: number, addr: string) => `bet_${mId}_${addr}`;
const CACHE_ODDS = (id: number) => `odds_${id}`;
const CACHE_BETTORS = (id: number) => `bettors_${id}`;
const CACHE_FEES = "accumulated_fees";

const MARKET_TTL = 30_000; // 30s
const BET_TTL = 15_000; // 15s — refreshes faster for active bets

// ── Concurrency limiter ───────────────────────────────────────────────────────

async function batchAll<T>(
  tasks: (() => Promise<T>)[],
  concurrency = 5
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency).map((fn) => fn());
    results.push(...(await Promise.all(batch)));
  }
  return results;
}

// ── Parse contract data into TS types ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMarket(raw: any): Market {
  // Data comes from API route as plain JSON (numbers already converted)
  return {
    id: Number(raw.id),
    question: raw.question,
    imageUrl: raw.imageUrl ?? raw.image_url ?? "",
    endTime: Number(raw.endTime ?? raw.end_time ?? 0),
    totalYes: Number(raw.totalYes ?? raw.total_yes ?? 0),
    totalNo: Number(raw.totalNo ?? raw.total_no ?? 0),
    resolved: raw.resolved ?? false,
    outcome: raw.outcome ?? false,
    cancelled: raw.cancelled ?? false,
    creator: raw.creator ?? "",
    betCount: Number(raw.betCount ?? raw.bet_count ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBet(raw: any): Bet {
  return {
    amount: Number(raw.amount ?? 0),
    isYes: raw.isYes ?? raw.is_yes ?? false,
    claimed: raw.claimed ?? false,
  };
}

// ── Read functions (via API routes — server-side contract reads) ──────────────

/** Fetch single market by ID */
export async function getMarket(marketId: number): Promise<Market | null> {
  const cached = cache.get<Market>(CACHE_MARKET(marketId));
  if (cached) return cached;

  try {
    const res = await fetch(`/api/markets?id=${marketId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    const market = parseMarket(data);
    cache.set(CACHE_MARKET(marketId), market, MARKET_TTL);
    return market;
  } catch {
    return null;
  }
}

/** Fetch all markets via API route */
export async function getMarkets(): Promise<Market[]> {
  const cached = cache.get<Market[]>(CACHE_MARKETS);
  if (cached) return cached;

  try {
    const res = await fetch("/api/markets");
    if (!res.ok) {
      console.error("[iPredict] getMarkets: API returned", res.status);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error("[iPredict] getMarkets: unexpected response", data);
      return [];
    }
    const markets = data.map(parseMarket);

    // Cache individual markets too
    for (const m of markets) {
      cache.set(CACHE_MARKET(m.id), m, MARKET_TTL);
    }
    cache.set(CACHE_MARKETS, markets, MARKET_TTL);
    return markets;
  } catch (err) {
    console.error("[iPredict] getMarkets: fetch error:", err);
    return [];
  }
}
/** Fetch a user's bet on a specific market */
export async function getBet(
  marketId: number,
  userAddress: string
): Promise<Bet | null> {
  const cacheKey = CACHE_BET(marketId, userAddress);
  const cached = cache.get<Bet>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/markets/data?action=bet&marketId=${marketId}&address=${encodeURIComponent(userAddress)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    const bet = parseBet(data);
    cache.set(cacheKey, bet, BET_TTL);
    return bet;
  } catch {
    return null;
  }
}

/** Get odds for a market (YES% / NO%) */
export async function getOdds(
  marketId: number
): Promise<{ yesPercent: number; noPercent: number }> {
  const cacheKey = CACHE_ODDS(marketId);
  const cached = cache.get<{ yesPercent: number; noPercent: number }>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/markets/data?action=odds&marketId=${marketId}`);
    if (!res.ok) return { yesPercent: 50, noPercent: 50 };
    const odds = await res.json();
    if (odds.error) return { yesPercent: 50, noPercent: 50 };
    cache.set(cacheKey, odds, MARKET_TTL);
    return odds;
  } catch {
    return { yesPercent: 50, noPercent: 50 };
  }
}

/** Get accumulated platform fees (in ETH, human-readable) */
export async function getAccumulatedFees(): Promise<number> {
  const cached = cache.get<number>(CACHE_FEES);
  if (cached !== null) return cached;

  try {
    const res = await fetch("/api/markets/data?action=fees");
    if (!res.ok) return 0;
    const data = await res.json();
    const fees = data.fees ?? 0;
    cache.set(CACHE_FEES, fees, MARKET_TTL);
    return fees;
  } catch {
    return 0;
  }
}

/**
 * Batch-resolve display names for an array of addresses.
 * Used on market detail pages to show bettor names.
 */
export async function resolveDisplayNames(
  addresses: string[]
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  const tasks = addresses.map((addr) => async () => {
    try {
      const name = await resolveDisplayName(addr);
      nameMap.set(addr, name || addr);
    } catch {
      nameMap.set(addr, addr);
    }
  });
  await batchAll(tasks, 5);
  return nameMap;
}

// ── Write functions ───────────────────────────────────────────────────────────

/** Create a new market (admin only) */
export async function createMarket(
  question: string,
  imageUrl: string,
  durationSecs: number,
  wallet: Account
): Promise<TransactionResult> {
  const contract = await getMarketContract(wallet);
  const result = await executeContractCall(() =>
    contract.functions.create_market(question, imageUrl, durationSecs).call()
  );

  if (result.success) {
    cache.invalidate(CACHE_MARKETS);
  }
  return result;
}

/** Place a bet on a market — ETH is forwarded with the call */
export async function placeBet(
  userAddress: string,
  marketId: number,
  isYes: boolean,
  amount: number,
  wallet: Account
): Promise<TransactionResult> {
  const contract = await getMarketContract(wallet);
  const baseAssetId = await getBaseAssetId();
  const baseUnits = ethToBaseUnits(amount);

  const result = await executeContractCall(() =>
    contract.functions
      .place_bet(marketId, isYes)
      .callParams({ forward: { amount: baseUnits, assetId: baseAssetId } })
      .call()
  );

  if (result.success) {
    cache.invalidate(CACHE_MARKETS);
    cache.invalidate(CACHE_MARKET(marketId));
    cache.invalidate(CACHE_BET(marketId, userAddress));
    cache.invalidate(CACHE_ODDS(marketId));
    cache.invalidate(CACHE_BETTORS(marketId));
  }
  return result;
}

/** Resolve a market (admin only) */
export async function resolveMarket(
  marketId: number,
  outcome: boolean,
  wallet: Account
): Promise<TransactionResult> {
  const contract = await getMarketContract(wallet);
  const result = await executeContractCall(() =>
    contract.functions.resolve_market(marketId, outcome).call()
  );

  if (result.success) {
    cache.invalidate(CACHE_MARKETS);
    cache.invalidate(CACHE_MARKET(marketId));
  }
  return result;
}

/** Cancel a market (admin only) */
export async function cancelMarket(
  marketId: number,
  wallet: Account
): Promise<TransactionResult> {
  const contract = await getMarketContract(wallet);
  const result = await executeContractCall(() =>
    contract.functions.cancel_market(marketId).call()
  );

  if (result.success) {
    cache.invalidate(CACHE_MARKETS);
    cache.invalidate(CACHE_MARKET(marketId));
    cache.invalidate(CACHE_BETTORS(marketId));
  }
  return result;
}

/** Claim rewards for a resolved market */
export async function claim(
  userAddress: string,
  marketId: number,
  wallet: Account
): Promise<TransactionResult> {
  const contract = await getMarketContract(wallet);
  const result = await executeContractCall(() =>
    contract.functions.claim(marketId).call()
  );

  if (result.success) {
    cache.invalidate(CACHE_BET(marketId, userAddress));
    cache.invalidate(CACHE_MARKET(marketId));
    cache.invalidate(CACHE_FEES);
  }
  return result;
}

/** Withdraw accumulated platform fees (admin only) */
export async function withdrawFees(
  wallet: Account
): Promise<TransactionResult> {
  const contract = await getMarketContract(wallet);
  const result = await executeContractCall(() =>
    contract.functions.withdraw_fees().call()
  );

  if (result.success) {
    cache.invalidate(CACHE_FEES);
  }
  return result;
}
