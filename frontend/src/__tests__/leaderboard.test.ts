import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockFunctions = new Proxy(
  {},
  {
    get: () =>
      (..._args: unknown[]) => ({
        get: mockGet,
      }),
  }
);

vi.mock("@/services/fuel", () => ({
  getLeaderboardContract: vi.fn(() =>
    Promise.resolve({ functions: mockFunctions })
  ),
  addressIdentity: (addr: string) => ({ Address: { bits: addr } }),
  extractAddress: (identity: { Address?: { bits: string } }) =>
    identity?.Address?.bits ?? "",
  bnToNumber: (v: unknown) => {
    if (v && typeof v === "object" && "toNumber" in v)
      return (v as { toNumber: () => number }).toNumber();
    return Number(v);
  },
}));

vi.mock("@/services/cache", () => ({
  get: () => null,
  set: vi.fn(),
  invalidate: vi.fn(),
  invalidateAll: vi.fn(),
}));

vi.mock("@/services/referral", () => ({
  getDisplayName: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/config/network", () => ({
  LEADERBOARD_CONTRACT_ID: "0xLEADERBOARD",
  ADMIN_PUBLIC_KEY: "0xADMIN456",
}));

import { getTopPlayers, getStats, getPoints, getRank } from "@/services/leaderboard";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("leaderboard service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTopPlayers", () => {
    it("returns sorted array of PlayerStats", async () => {
      // get_top_players returns Vec<PlayerEntry { address: Identity, points: u64 }>
      mockGet.mockResolvedValueOnce({
        value: [
          {
            address: { Address: { bits: "0xALICE" } },
            points: { toNumber: () => 1000 },
          },
          {
            address: { Address: { bits: "0xBOB" } },
            points: { toNumber: () => 500 },
          },
        ],
      });
      // get_stats for Alice
      mockGet.mockResolvedValueOnce({
        value: {
          points: { toNumber: () => 1000 },
          total_bets: 15,
          won_bets: 10,
          lost_bets: 5,
        },
      });
      // get_stats for Bob
      mockGet.mockResolvedValueOnce({
        value: {
          points: { toNumber: () => 500 },
          total_bets: 10,
          won_bets: 6,
          lost_bets: 4,
        },
      });

      const players = await getTopPlayers(10);
      expect(players).toHaveLength(2);
      expect(players[0].address).toBe("0xALICE");
      expect(players[0].points).toBe(1000);
      expect(players[0].totalBets).toBe(15);
      expect(players[0].wonBets).toBe(10);
      expect(players[0].winRate).toBeCloseTo(66.67, 1);
      expect(players[1].address).toBe("0xBOB");
      expect(players[1].points).toBe(500);
    });

    it("returns empty array when no players", async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      const players = await getTopPlayers(10);
      expect(players).toEqual([]);
    });

    it("returns empty array on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("network"));
      const players = await getTopPlayers(10);
      expect(players).toEqual([]);
    });

    it("handles stats fetch failure gracefully", async () => {
      mockGet.mockResolvedValueOnce({
        value: [
          {
            address: { Address: { bits: "0xALICE" } },
            points: { toNumber: () => 100 },
          },
        ],
      });
      // stats call fails
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const players = await getTopPlayers(10);
      expect(players).toHaveLength(1);
      expect(players[0].points).toBe(100);
      expect(players[0].totalBets).toBe(0); // fallback
      expect(players[0].winRate).toBe(0);
    });
  });

  describe("getStats", () => {
    it("returns player stats for a user", async () => {
      mockGet.mockResolvedValueOnce({
        value: {
          points: { toNumber: () => 800 },
          total_bets: 20,
          won_bets: 12,
          lost_bets: 8,
        },
      });

      const stats = await getStats("0xUSER");
      expect(stats).not.toBeNull();
      expect(stats!.points).toBe(800);
      expect(stats!.totalBets).toBe(20);
      expect(stats!.wonBets).toBe(12);
      expect(stats!.lostBets).toBe(8);
      expect(stats!.winRate).toBe(60);
    });

    it("returns null on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));
      const stats = await getStats("0xUSER");
      expect(stats).toBeNull();
    });
  });

  describe("getPoints", () => {
    it("returns numeric points", async () => {
      mockGet.mockResolvedValueOnce({ value: { toNumber: () => 1234 } });
      const pts = await getPoints("0xUSER");
      expect(pts).toBe(1234);
    });

    it("returns 0 on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));
      const pts = await getPoints("0xUSER");
      expect(pts).toBe(0);
    });
  });

  describe("getRank", () => {
    it("returns numeric rank", async () => {
      mockGet.mockResolvedValueOnce({ value: 3 });
      const rank = await getRank("0xUSER");
      expect(rank).toBe(3);
    });

    it("returns 0 on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));
      const rank = await getRank("0xUSER");
      expect(rank).toBe(0);
    });
  });
});
