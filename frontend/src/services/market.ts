import type { Account } from "fuels";
import { MARKET_CONTRACT_ID } from "@/config/network";
import {
  getMarketContract,
  addressIdentity,
  extractAddress,
  bnToNumber,
  bnToEth,
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
  return {
    id: typeof raw.id === "object" && raw.id.toNumber ? raw.id.toNumber() : Number(raw.id),
    question: raw.question,
    imageUrl: raw.image_url,
    endTime: typeof raw.end_time === "object" && raw.end_time.toNumber ? raw.end_time.toNumber() : Number(raw.end_time),
    totalYes: (typeof raw.total_yes === "object" && raw.total_yes.toNumber ? raw.total_yes.toNumber() : Number(raw.total_yes)) / 1e9,
    totalNo: (typeof raw.total_no === "object" && raw.total_no.toNumber ? raw.total_no.toNumber() : Number(raw.total_no)) / 1e9,
    resolved: raw.resolved,
    outcome: raw.outcome,
    cancelled: raw.cancelled,
    creator: extractAddress(raw.creator),
    betCount: typeof raw.bet_count === "object" && raw.bet_count.toNumber ? raw.bet_count.toNumber() : Number(raw.bet_count),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBet(raw: any): Bet {
  return {
    amount: (typeof raw.amount === "object" && raw.amount.toNumber ? raw.amount.toNumber() : Number(raw.amount)) / 1e9,
    isYes: raw.is_yes,
    claimed: raw.claimed,
  };
}

// ── Read functions ────────────────────────────────────────────────────────────

/** Fetch single market by ID */
export async function getMarket(marketId: number): Promise<Market | null> {
  const cached = cache.get<Market>(CACHE_MARKET(marketId));
  if (cached) return cached;

  try {
    const contract = await getMarketContract();
    const { value } = await contract.functions.get_market(marketId).get();
    const market = parseMarket(value);
    cache.set(CACHE_MARKET(marketId), market, MARKET_TTL);
    return market;
  } catch {
    return null;
  }
}

/** Fetch all markets — iterate 1..marketCount, batch-resolve */
export async function getMarkets(): Promise<Market[]> {
  const cached = cache.get<Market[]>(CACHE_MARKETS);
  if (cached) return cached;

  try {
    const contract = await getMarketContract();
    const { value: countBn } = await contract.functions.get_market_count().get();
    const total = bnToNumber(countBn);
    if (total === 0) return [];

    // Fetch markets in batches of 5
    const tasks = Array.from({ length: total }, (_, i) => {
      const id = i + 1;
      return async () => {
        try {
          const c = await getMarketContract();
          const { value } = await c.functions.get_market(id).get();
          return parseMarket(value);
        } catch {
          return null;
        }
      };
    });

    const results = await batchAll(tasks, 5);
    const markets = results.filter((m): m is Market => m !== null);

    // Cache individual markets too
    for (const m of markets) {
      cache.set(CACHE_MARKET(m.id), m, MARKET_TTL);
    }
    cache.set(CACHE_MARKETS, markets, MARKET_TTL);
    return markets;
  } catch {
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
    const contract = await getMarketContract();
    const { value } = await contract.functions
      .get_bet(marketId, addressIdentity(userAddress))
      .get();
    const bet = parseBet(value);
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
    const contract = await getMarketContract();
    const { value } = await contract.functions.get_odds(marketId).get();
    const odds = {
      yesPercent: value.yes_percent,
      noPercent: value.no_percent,
    };
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
    const contract = await getMarketContract();
    const { value } = await contract.functions.get_accumulated_fees().get();
    const fees = bnToEth(value);
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
