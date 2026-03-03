"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getTopPlayers } from "@/services/leaderboard";
import type { PlayerStats } from "@/types";

export type LeaderboardTab = "top_predictors" | "most_active" | "top_referrers";

/** Auto-refresh interval (30 s) */
const POLL_INTERVAL = 30_000;

interface UseLeaderboardResult {
  data: PlayerStats[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Sort players based on the selected tab */
function sortByTab(players: PlayerStats[], tab: LeaderboardTab): PlayerStats[] {
  const sorted = [...players];
  switch (tab) {
    case "most_active":
      return sorted.sort((a, b) => b.totalBets - a.totalBets);
    case "top_referrers":
      return sorted.sort((a, b) => b.points - a.points);
    case "top_predictors":
    default:
      return sorted.sort((a, b) => b.points - a.points);
  }
}

export function useLeaderboard(
  tab?: LeaderboardTab
): UseLeaderboardResult {
  const [allPlayers, setAllPlayers] = useState<PlayerStats[]>([]);
  const [data, setData] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    // Only show loading spinner on first load, not during polling
    if (!silent) setLoading(true);
    setError(null);
    try {
      const players = await getTopPlayers(50);

      if (!mountedRef.current) return;
      setAllPlayers(players);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard"
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        initialLoadDone.current = true;
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  // Auto-poll every 30 seconds (silent — no skeleton flash)
  useEffect(() => {
    const interval = setInterval(() => {
      if (initialLoadDone.current) {
        fetchData(true);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-sort when tab or allPlayers changes
  useEffect(() => {
    setData(sortByTab(allPlayers, tab ?? "top_predictors"));
  }, [allPlayers, tab]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
