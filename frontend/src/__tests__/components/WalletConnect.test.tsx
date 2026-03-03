import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

let accountState = { account: null as string | null };
let connectedState = { isConnected: false };

vi.mock("@fuels/react", () => ({
  useConnectUI: () => ({ connect: mockConnect }),
  useAccount: () => accountState,
  useDisconnect: () => ({ disconnect: mockDisconnect }),
  useIsConnected: () => connectedState,
}));

import WalletConnect from "@/components/wallet/WalletConnect";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("WalletConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountState = { account: null };
    connectedState = { isConnected: false };
  });

  describe("disconnected state", () => {
    it("renders Connect Wallet button", () => {
      render(<WalletConnect />);
      expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
    });

    it("button is enabled and clickable", () => {
      render(<WalletConnect />);
      const btn = screen.getByRole("button", { name: /Connect Wallet/i });
      expect(btn).toBeEnabled();
    });

    it("calls connect() on click (Fuel built-in UI handles wallet selection)", () => {
      render(<WalletConnect />);
      fireEvent.click(screen.getByText(/Connect Wallet/i));
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("connected state", () => {
    beforeEach(() => {
      accountState = {
        account: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890",
      };
      connectedState = { isConnected: true };
    });

    it("shows truncated address instead of Connect button", () => {
      render(<WalletConnect />);
      // truncateAddress for 0x format: "0xAbCd...7890"
      expect(screen.getByText(/0xAbCd/)).toBeInTheDocument();
      expect(screen.queryByText(/Connect Wallet/i)).not.toBeInTheDocument();
    });

    it("opens dropdown on address click", () => {
      render(<WalletConnect />);
      const addrBtn = screen.getByText(/0xAbCd/);
      fireEvent.click(addrBtn);
      expect(screen.getByText("Copy Address")).toBeInTheDocument();
      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    it("calls disconnect when Disconnect is clicked", () => {
      render(<WalletConnect />);
      fireEvent.click(screen.getByText(/0xAbCd/));
      fireEvent.click(screen.getByText("Disconnect"));
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
