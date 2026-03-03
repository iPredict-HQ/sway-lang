import { getLeaderboardContract, addressIdentity, extractAddress, bnToNumber } from "@/services/fuel";
import { getDisplayName } from "@/services/referral";
import * as cache from "@/services/cache";
import type { PlayerStats } from "@/types";

// ── Cache keys & TTLs ────────────────────────────────────────────────────────

const CACHE_TOP_PLAYERS = (limit: number) => `lb_top_${limit}`;
const CACHE_STATS = (addr: string) => `lb_stats_${addr}`;
const CACHE_POINTS = (addr: string) => `lb_pts_${addr}`;
const CACHE_RANK = (addr: string) => `lb_rank_${addr}`;

const LEADERBOARD_TTL = 60_000; // 60s
const STATS_TTL = 30_000; // 30s

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safely coerce to number, returning 0 for NaN/undefined/null */
function safe(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

// ── Read functions ────────────────────────────────────────────────────────────

/**
 * Get top N players from the leaderboard.
 * The contract returns Vec<PlayerEntry> where PlayerEntry is a struct
 * { address: Identity, points: u64 }. Fuel SDK auto-decodes via ABI types.
 */
export async function getTopPlayers(limit: number): Promise<PlayerStats[]> {
  const cacheKey = CACHE_TOP_PLAYERS(limit);
  const cached = cache.get<PlayerStats[]>(cacheKey);
  if (cached) return cached;

  try {
    const contract = await getLeaderboardContract();
    const { value: raw } = await contract.functions.get_top_players(limit).get();

    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    // Extract player entries from the typed response
    const entries = raw.map((item) => ({
      addr: extractAddress(item.address),
      pts: typeof item.points === "object" && item.points.toNumber
        ? item.points.toNumber()
        : safe(item.points),
    }));

    // Batch-resolve display names with concurrency limit of 5
    const nameMap = new Map<string, string>();
    const nameTasks = entries.map(({ addr }) => async () => {
      try {
        const name = await getDisplayName(addr);
        nameMap.set(addr, name || "");
      } catch {
        nameMap.set(addr, "");
      }
    });
    await batchAll(nameTasks, 5);

    // Batch-fetch full stats for each player
    const statsTasks = entries.map(({ addr, pts }) => async () => {
      try {
        const c = await getLeaderboardContract();
        const { value: statsRaw } = await c.functions
          .get_stats(addressIdentity(addr))
          .get();

        const totalBets = safe(statsRaw.total_bets);
        const wonBets = safe(statsRaw.won_bets);
        const lostBets = safe(statsRaw.lost_bets);

        return {
          address: addr,
          displayName: nameMap.get(addr) || "",
          points: pts,
          totalBets,
          wonBets,
          lostBets,
          winRate: totalBets > 0 ? (wonBets / totalBets) * 100 : 0,
        } satisfies PlayerStats;
      } catch {
        return {
          address: addr,
          displayName: nameMap.get(addr) || "",
          points: pts,
          totalBets: 0,
          wonBets: 0,
          lostBets: 0,
          winRate: 0,
        } satisfies PlayerStats;
      }
    });

    const players = await batchAll(statsTasks, 5);

    cache.set(cacheKey, players, LEADERBOARD_TTL);
    return players;
  } catch (err) {
    console.error("[iPredict] getTopPlayers error:", err);
    return [];
  }
}

/** Get stats for a specific user */
export async function getStats(
  userAddress: string
): Promise<PlayerStats | null> {
  const cacheKey = CACHE_STATS(userAddress);
  const cached = cache.get<PlayerStats>(cacheKey);
  if (cached) return cached;

  try {
    const contract = await getLeaderboardContract();
    const { value: raw } = await contract.functions
      .get_stats(addressIdentity(userAddress))
      .get();

    const points = typeof raw.points === "object" && raw.points.toNumber
      ? raw.points.toNumber()
      : safe(raw.points);
    const totalBets = safe(raw.total_bets);
    const wonBets = safe(raw.won_bets);
    const lostBets = safe(raw.lost_bets);

    // Also resolve display name
    let displayName = "";
    try {
      displayName = await getDisplayName(userAddress);
    } catch {
      // silently fail
    }

    const stats: PlayerStats = {
      address: userAddress,
      displayName,
      points,
      totalBets,
      wonBets,
      lostBets,
      winRate: totalBets > 0 ? (wonBets / totalBets) * 100 : 0,
    };
    cache.set(cacheKey, stats, STATS_TTL);
    return stats;
  } catch {
    return null;
  }
}

/** Get total points for a user */
export async function getPoints(userAddress: string): Promise<number> {
  const cacheKey = CACHE_POINTS(userAddress);
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getLeaderboardContract();
    const { value } = await contract.functions
      .get_points(addressIdentity(userAddress))
      .get();
    const pts = bnToNumber(value);
    cache.set(cacheKey, pts, STATS_TTL);
    return pts;
  } catch {
    return 0;
  }
}

/** Get rank for a user (position in top players, or 0 if unranked) */
export async function getRank(userAddress: string): Promise<number> {
  const cacheKey = CACHE_RANK(userAddress);
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const contract = await getLeaderboardContract();
    const { value } = await contract.functions
      .get_rank(addressIdentity(userAddress))
      .get();
    cache.set(cacheKey, value, LEADERBOARD_TTL);
    return value;
  } catch {
    return 0;
  }
}
