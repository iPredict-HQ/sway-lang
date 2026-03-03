import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatETH,
  displayETH,
  truncateAddress,
  isValidAmount,
  timeUntil,
  calculatePayout,
  calculateOdds,
  bpsToPercent,
  explorerUrl,
} from "@/utils/helpers";

// ── formatETH ─────────────────────────────────────────────────────────────────

describe("formatETH", () => {
  it("formats whole ETH correctly", () => {
    expect(formatETH(100_000000000n)).toBe("100 ETH");
  });

  it("formats fractional ETH correctly", () => {
    expect(formatETH(123_456789000n)).toBe("123.456789 ETH");
  });

  it("handles zero", () => {
    expect(formatETH(0n)).toBe("0 ETH");
  });

  it("handles negative values", () => {
    expect(formatETH(-50_000000000n)).toBe("-50 ETH");
  });

  it("handles small base units (less than 1 ETH)", () => {
    expect(formatETH(1n)).toBe("0.000000001 ETH");
  });

  it("handles very large amounts", () => {
    // 1 billion ETH
    expect(formatETH(1_000_000_000_000000000n)).toBe("1000000000 ETH");
  });

  it("handles negative fractional values", () => {
    expect(formatETH(-5_500000000n)).toBe("-5.5 ETH");
  });

  it("strips trailing zeros from fractional part", () => {
    // 10.1 ETH = 10_100000000 base units
    expect(formatETH(10_100000000n)).toBe("10.1 ETH");
  });

  it("handles exactly 1 base unit", () => {
    expect(formatETH(1n)).toBe("0.000000001 ETH");
  });
});

// ── truncateAddress ───────────────────────────────────────────────────────────

describe("truncateAddress", () => {
  it("truncates a standard 66-char Fuel address", () => {
    const addr = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    expect(truncateAddress(addr)).toBe("0x1234...cdef");
  });

  it("truncates long hex addresses", () => {
    expect(truncateAddress("0xabcdef1234567890abcdef1234567890")).toBe(
      "0xabcd...7890"
    );
  });

  it("returns short strings as-is", () => {
    expect(truncateAddress("SHORT")).toBe("SHORT");
  });

  it("returns empty string as-is", () => {
    expect(truncateAddress("")).toBe("");
  });

  it("returns exactly 12-char string as-is", () => {
    expect(truncateAddress("ABCDEFGHIJKL")).toBe("ABCDEFGHIJKL");
  });

  it("truncates 13-char string", () => {
    expect(truncateAddress("ABCDEFGHIJKLM")).toBe("ABCDEF...JKLM");
  });
});

// ── isValidAmount ─────────────────────────────────────────────────────────────

describe("isValidAmount", () => {
  it("accepts valid amount within balance", () => {
    expect(isValidAmount("50", 100)).toBe(true);
  });

  it("accepts minimum 0.001 ETH", () => {
    expect(isValidAmount("0.001", 100)).toBe(true);
  });

  it("accepts amount equal to balance", () => {
    expect(isValidAmount("100", 100)).toBe(true);
  });

  it("rejects amount below 0.001 ETH minimum", () => {
    expect(isValidAmount("0.0005", 100)).toBe(false);
  });

  it("rejects zero", () => {
    expect(isValidAmount("0", 100)).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(isValidAmount("-5", 100)).toBe(false);
  });

  it("rejects amount exceeding balance", () => {
    expect(isValidAmount("150", 100)).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(isValidAmount("abc", 100)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidAmount("", 100)).toBe(false);
  });
});

// ── timeUntil ─────────────────────────────────────────────────────────────────

describe("timeUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin "now" to a known Unix time: 2026-02-26T00:00:00Z = 1771977600
    vi.setSystemTime(new Date("2026-02-26T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Ended" for past timestamps', () => {
    expect(timeUntil(0)).toBe("Ended");
  });

  it('returns "Ended" for timestamp equal to now', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(timeUntil(now)).toBe("Ended");
  });

  it("returns days/hours/minutes for future timestamp", () => {
    const now = Math.floor(Date.now() / 1000);
    // 2 days, 3 hours, 45 minutes from now
    const future = now + 2 * 86400 + 3 * 3600 + 45 * 60;
    expect(timeUntil(future)).toBe("2d 3h 45m");
  });

  it("returns hours/minutes when less than a day", () => {
    const now = Math.floor(Date.now() / 1000);
    const future = now + 5 * 3600 + 30 * 60;
    expect(timeUntil(future)).toBe("5h 30m");
  });

  it("returns minutes only when less than an hour", () => {
    const now = Math.floor(Date.now() / 1000);
    const future = now + 42 * 60;
    expect(timeUntil(future)).toBe("42m");
  });

  it("returns seconds when less than a minute", () => {
    const now = Math.floor(Date.now() / 1000);
    const future = now + 30;
    expect(timeUntil(future)).toBe("30s");
  });
});

// ── calculatePayout ───────────────────────────────────────────────────────────

describe("calculatePayout", () => {
  it("calculates correct payout for sole winner (100% of winning side)", () => {
    // User bet 100, winning side total 100, pool 300 → gets entire pool
    expect(calculatePayout(100, 100, 300)).toBe(300);
  });

  it("calculates proportional payout for multiple winners", () => {
    // User bet 50, winning side total 200, pool 500
    expect(calculatePayout(50, 200, 500)).toBe(125);
  });

  it("calculates equal split payout", () => {
    // 2 equal winners: user bet 50, winning side 100, pool 200
    expect(calculatePayout(50, 100, 200)).toBe(100);
  });

  it("returns 0 if winning side total is 0", () => {
    expect(calculatePayout(100, 0, 500)).toBe(0);
  });

  it("returns 0 if winning side total is negative", () => {
    expect(calculatePayout(100, -1, 500)).toBe(0);
  });

  it("handles small fractional bets", () => {
    // User bet 1, winning side 3, pool 10 → ~3.333
    const payout = calculatePayout(1, 3, 10);
    expect(payout).toBeCloseTo(3.333, 2);
  });
});

// ── calculateOdds ─────────────────────────────────────────────────────────────

describe("calculateOdds", () => {
  it("returns 50/50 when no bets", () => {
    expect(calculateOdds(0, 0)).toEqual({ yesPercent: 50, noPercent: 50 });
  });

  it("returns correct percentages for clear split", () => {
    expect(calculateOdds(75, 25)).toEqual({ yesPercent: 75, noPercent: 25 });
  });

  it("returns 100/0 when all bets on YES", () => {
    expect(calculateOdds(500, 0)).toEqual({ yesPercent: 100, noPercent: 0 });
  });

  it("returns 0/100 when all bets on NO", () => {
    expect(calculateOdds(0, 300)).toEqual({ yesPercent: 0, noPercent: 100 });
  });

  it("rounds percentages and always totals 100", () => {
    const result = calculateOdds(1, 2);
    expect(result.yesPercent + result.noPercent).toBe(100);
    expect(result.yesPercent).toBe(33);
    expect(result.noPercent).toBe(67);
  });
});

// ── bpsToPercent ──────────────────────────────────────────────────────────────

describe("bpsToPercent", () => {
  it("converts 200 bps to 2%", () => {
    expect(bpsToPercent(200)).toBe("2%");
  });

  it("converts 150 bps to 1.5%", () => {
    expect(bpsToPercent(150)).toBe("1.5%");
  });

  it("converts 50 bps to 0.5%", () => {
    expect(bpsToPercent(50)).toBe("0.5%");
  });

  it("converts 10000 bps to 100%", () => {
    expect(bpsToPercent(10000)).toBe("100%");
  });

  it("converts 0 bps to 0%", () => {
    expect(bpsToPercent(0)).toBe("0%");
  });
});

// ── explorerUrl ───────────────────────────────────────────────────────────────

describe("explorerUrl", () => {
  it("builds transaction URL", () => {
    expect(explorerUrl("tx", "abc123")).toBe(
      "https://app.fuel.network/tx/abc123"
    );
  });

  it("builds account URL", () => {
    expect(explorerUrl("account", "0xabc")).toBe(
      "https://app.fuel.network/account/0xabc"
    );
  });

  it("builds contract URL", () => {
    expect(explorerUrl("contract", "0xdef456")).toBe(
      "https://app.fuel.network/contract/0xdef456"
    );
  });
});
