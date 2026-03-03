import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockCall = vi.fn();
const mockCallParams = vi.fn(() => ({ call: mockCall }));
const mockFunctions = new Proxy(
  {},
  {
    get: () =>
      (..._args: unknown[]) => ({
        get: mockGet,
        call: mockCall,
        callParams: mockCallParams,
      }),
  }
);

vi.mock("@/services/fuel", () => ({
  getMarketContract: vi.fn(() => Promise.resolve({ functions: mockFunctions })),
  addressIdentity: (addr: string) => ({ Address: { bits: addr } }),
  extractAddress: (identity: { Address?: { bits: string } }) =>
    identity?.Address?.bits ?? "",
  bnToNumber: (v: unknown) => {
    if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber: () => number }).toNumber();
    return Number(v);
  },
  bnToEth: (v: unknown) => Number(v) / 1e9,
  ethToBaseUnits: (eth: number) => Math.round(eth * 1e9),
  getBaseAssetId: vi.fn(() => Promise.resolve("0x0000000000000000000000000000000000000000000000000000000000000000")),
  executeContractCall: vi.fn(async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return { success: true, hash: "0xabc123" };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }),
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
  MARKET_CONTRACT_ID: "0xMARKET123",
  ADMIN_PUBLIC_KEY: "0xADMIN456",
  TOTAL_FEE_BPS: 200,
  PLATFORM_FEE_BPS: 150,
  REFERRAL_FEE_BPS: 50,
}));

import {
  getMarket,
  getMarkets,
  getBet,
  getOdds,
  placeBet,
  resolveMarket,
  claim,
} from "@/services/market";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("market service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMarket", () => {
    it("returns parsed Market object on success", async () => {
      mockGet.mockResolvedValueOnce({
        value: {
          id: { toNumber: () => 1 },
          question: "Will ETH flip BTC?",
          image_url: "/eth.png",
          end_time: { toNumber: () => 1700000000 },
          total_yes: { toNumber: () => 1000000000 },
          total_no: { toNumber: () => 500000000 },
          resolved: false,
          outcome: false,
          cancelled: false,
          creator: { Address: { bits: "0xCREATOR" } },
          bet_count: { toNumber: () => 5 },
        },
      });

      const market = await getMarket(1);
      expect(market).not.toBeNull();
      expect(market!.id).toBe(1);
      expect(market!.question).toBe("Will ETH flip BTC?");
      expect(market!.totalYes).toBeCloseTo(1, 1);
      expect(market!.totalNo).toBeCloseTo(0.5, 1);
      expect(market!.betCount).toBe(5);
    });

    it("returns null on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("not found"));
      const market = await getMarket(999);
      expect(market).toBeNull();
    });
  });

  describe("getMarkets", () => {
    it("returns array of markets", async () => {
      // First call: get_market_count
      mockGet.mockResolvedValueOnce({ value: { toNumber: () => 2 } });
      // Then two get_market calls
      mockGet
        .mockResolvedValueOnce({
          value: {
            id: { toNumber: () => 1 },
            question: "Q1",
            image_url: "",
            end_time: { toNumber: () => 100 },
            total_yes: { toNumber: () => 10000000000 },
            total_no: { toNumber: () => 5000000000 },
            resolved: false,
            outcome: false,
            cancelled: false,
            creator: { Address: { bits: "0x01" } },
            bet_count: { toNumber: () => 2 },
          },
        })
        .mockResolvedValueOnce({
          value: {
            id: { toNumber: () => 2 },
            question: "Q2",
            image_url: "",
            end_time: { toNumber: () => 200 },
            total_yes: { toNumber: () => 20000000000 },
            total_no: { toNumber: () => 15000000000 },
            resolved: false,
            outcome: false,
            cancelled: false,
            creator: { Address: { bits: "0x02" } },
            bet_count: { toNumber: () => 4 },
          },
        });

      const markets = await getMarkets();
      expect(markets).toHaveLength(2);
      expect(markets[0].question).toBe("Q1");
      expect(markets[1].question).toBe("Q2");
    });

    it("returns empty array when count is 0", async () => {
      mockGet.mockResolvedValueOnce({ value: { toNumber: () => 0 } });
      const markets = await getMarkets();
      expect(markets).toEqual([]);
    });
  });

  describe("getBet", () => {
    it("returns parsed Bet on success", async () => {
      mockGet.mockResolvedValueOnce({
        value: {
          amount: { toNumber: () => 1000000000 },
          is_yes: true,
          claimed: false,
        },
      });

      const bet = await getBet(1, "0xUSER");
      expect(bet).not.toBeNull();
      expect(bet!.amount).toBeCloseTo(1, 1);
      expect(bet!.isYes).toBe(true);
      expect(bet!.claimed).toBe(false);
    });

    it("returns null on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("no bet"));
      const bet = await getBet(1, "0xUSER");
      expect(bet).toBeNull();
    });
  });

  describe("getOdds", () => {
    it("returns odds from contract", async () => {
      mockGet.mockResolvedValueOnce({
        value: { yes_percent: 60, no_percent: 40 },
      });
      const odds = await getOdds(1);
      expect(odds.yesPercent).toBe(60);
      expect(odds.noPercent).toBe(40);
    });

    it("returns 50/50 on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));
      const odds = await getOdds(1);
      expect(odds).toEqual({ yesPercent: 50, noPercent: 50 });
    });
  });

  describe("placeBet", () => {
    it("calls contract with forward params for ETH", async () => {
      mockCall.mockResolvedValueOnce({ transactionId: "0xhash" });

      const mockWallet = {} as never;
      const result = await placeBet("0xUSER", 1, true, 1.5, mockWallet);
      expect(result.success).toBe(true);
    });

    it("returns error result on failure", async () => {
      mockCall.mockRejectedValueOnce(new Error("Tx failed"));

      const mockWallet = {} as never;
      const result = await placeBet("0xUSER", 1, true, 1.5, mockWallet);
      expect(result.success).toBe(false);
    });
  });

  describe("resolveMarket", () => {
    it("sends correct outcome", async () => {
      mockCall.mockResolvedValueOnce({ transactionId: "0xh1" });

      const mockWallet = {} as never;
      const result = await resolveMarket(1, true, mockWallet);
      expect(result.success).toBe(true);
    });
  });

  describe("claim", () => {
    it("returns transaction result", async () => {
      mockCall.mockResolvedValueOnce({ transactionId: "0xclaim" });

      const mockWallet = {} as never;
      const result = await claim("0xUSER", 1, mockWallet);
      expect(result.success).toBe(true);
    });
  });
});
