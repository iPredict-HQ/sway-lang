import { getTokenContract, addressIdentity, bnToNumber } from "@/services/fuel";
import * as cache from "@/services/cache";
import type { TokenInfo } from "@/types";

// ── Cache keys & TTLs ────────────────────────────────────────────────────────

const CACHE_BALANCE = (addr: string) => `token_bal_${addr}`;
const CACHE_TOKEN_INFO = "token_info";
const CACHE_TOTAL_SUPPLY = "token_supply";

const TOKEN_TTL = 30_000; // 30s
const INFO_TTL = 300_000; // 5 min — metadata rarely changes

// ── Read functions ────────────────────────────────────────────────────────────

/** Fetch IPREDICT token balance for an account (in human-readable units, 9 decimals) */
export async function getBalance(account: string): Promise<number> {
  const cacheKey = CACHE_BALANCE(account);
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getTokenContract();
    const { value } = await contract.functions
      .balance(addressIdentity(account))
      .get();
    // Token has 9 decimals — convert from base units to human-readable
    const balance = bnToNumber(value) / 1e9;
    cache.set(cacheKey, balance, TOKEN_TTL);
    return balance;
  } catch {
    return 0;
  }
}

/** Fetch token metadata (name, symbol, decimals, totalSupply) */
export async function getTokenInfo(): Promise<TokenInfo> {
  const cached = cache.get<TokenInfo>(CACHE_TOKEN_INFO);
  if (cached) return cached;

  try {
    const contract = await getTokenContract();

    const [nameRes, symbolRes, decimalsRes, supplyRes] = await Promise.all([
      contract.functions.name().get(),
      contract.functions.symbol().get(),
      contract.functions.decimals().get(),
      contract.functions.total_supply().get(),
    ]);

    const info: TokenInfo = {
      name: nameRes.value,
      symbol: symbolRes.value,
      decimals: decimalsRes.value,
      totalSupply: bnToNumber(supplyRes.value),
    };
    cache.set(CACHE_TOKEN_INFO, info, INFO_TTL);
    return info;
  } catch {
    // Return defaults if contract not yet deployed
    return { name: "IPREDICT", symbol: "IPRED", decimals: 9, totalSupply: 0 };
  }
}

/** Fetch total supply */
export async function getTotalSupply(): Promise<number> {
  const cached = cache.get<number>(CACHE_TOTAL_SUPPLY);
  if (cached !== null) return cached;

  try {
    const contract = await getTokenContract();
    const { value } = await contract.functions.total_supply().get();
    const supply = bnToNumber(value);
    cache.set(CACHE_TOTAL_SUPPLY, supply, TOKEN_TTL);
    return supply;
  } catch {
    return 0;
  }
}
