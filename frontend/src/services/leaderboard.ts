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

// ── Read functions (via API routes) ───────────────────────────────────────────

/**
 * Get top N players from the leaderboard.
 */
export async function getTopPlayers(limit: number): Promise<PlayerStats[]> {
  const cacheKey = CACHE_TOP_PLAYERS(limit);
  const cached = cache.get<PlayerStats[]>(cacheKey);
  if (cached) return cached;

  try {
    // Step 1: Get top players (address + points) from API
    const res = await fetch(`/api/leaderboard?action=top&limit=${limit}`);
    if (!res.ok) return [];
    const entries: { address: string; points: number }[] = await res.json();
    if (!Array.isArray(entries) || entries.length === 0) return [];

    // Step 2: Batch-fetch display names and stats for each player
    const statsTasks = entries.map(({ address: addr, points: pts }) => async () => {
      let displayName = "";
      let totalBets = 0;
      let wonBets = 0;
      let lostBets = 0;

      try {
        const nameRes = await fetch(`/api/referral?action=displayName&address=${encodeURIComponent(addr)}`);
        if (nameRes.ok) {
          const nameData = await nameRes.json();
          displayName = nameData.displayName || "";
        }
      } catch { /* skip */ }

      try {
        const statsRes = await fetch(`/api/leaderboard?action=stats&address=${encodeURIComponent(addr)}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          totalBets = safe(statsData.totalBets);
          wonBets = safe(statsData.wonBets);
          lostBets = safe(statsData.lostBets);
        }
      } catch { /* skip */ }

      return {
        address: addr,
        displayName,
        points: pts,
        totalBets,
        wonBets,
        lostBets,
        winRate: totalBets > 0 ? (wonBets / totalBets) * 100 : 0,
      } satisfies PlayerStats;
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
    const statsRes = await fetch(`/api/leaderboard?action=stats&address=${encodeURIComponent(userAddress)}`);
    if (!statsRes.ok) return null;
    const raw = await statsRes.json();

    const points = safe(raw.points);
    const totalBets = safe(raw.totalBets);
    const wonBets = safe(raw.wonBets);
    const lostBets = safe(raw.lostBets);

    let displayName = "";
    try {
      const nameRes = await fetch(`/api/referral?action=displayName&address=${encodeURIComponent(userAddress)}`);
      if (nameRes.ok) {
        const nameData = await nameRes.json();
        displayName = nameData.displayName || "";
      }
    } catch { /* skip */ }

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
    const res = await fetch(`/api/leaderboard?action=points&address=${encodeURIComponent(userAddress)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    const pts = safe(data.points);
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
    const res = await fetch(`/api/leaderboard?action=rank&address=${encodeURIComponent(userAddress)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    const rank = safe(data.rank);
    cache.set(cacheKey, rank, LEADERBOARD_TTL);
    return rank;
  } catch {
    return 0;
  }
}
