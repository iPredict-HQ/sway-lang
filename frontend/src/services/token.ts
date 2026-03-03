import * as cache from "@/services/cache";
import type { TokenInfo } from "@/types";

// ── Cache keys & TTLs ────────────────────────────────────────────────────────

const CACHE_BALANCE = (addr: string) => `token_bal_${addr}`;
const CACHE_TOKEN_INFO = "token_info";
const CACHE_TOTAL_SUPPLY = "token_supply";

const TOKEN_TTL = 30_000; // 30s
const INFO_TTL = 300_000; // 5 min — metadata rarely changes

// ── Read functions (via API routes) ──────────────────────────────────────────

/** Fetch IPREDICT token balance for an account (in human-readable units, 9 decimals) */
export async function getBalance(account: string): Promise<number> {
  const cacheKey = CACHE_BALANCE(account);
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await fetch(`/api/token?action=balance&address=${encodeURIComponent(account)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    const balance = data.balance ?? 0;
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
    const res = await fetch("/api/token?action=info");
    if (!res.ok) return { name: "IPREDICT", symbol: "IPRED", decimals: 9, totalSupply: 0 };
    const info = await res.json();
    cache.set(CACHE_TOKEN_INFO, info, INFO_TTL);
    return info;
  } catch {
    return { name: "IPREDICT", symbol: "IPRED", decimals: 9, totalSupply: 0 };
  }
}

/** Fetch total supply */
export async function getTotalSupply(): Promise<number> {
  const cached = cache.get<number>(CACHE_TOTAL_SUPPLY);
  if (cached !== null) return cached;

  try {
    const res = await fetch("/api/token?action=supply");
    if (!res.ok) return 0;
    const data = await res.json();
    const supply = data.totalSupply ?? 0;
    cache.set(CACHE_TOTAL_SUPPLY, supply, TOKEN_TTL);
    return supply;
  } catch {
    return 0;
  }
}
