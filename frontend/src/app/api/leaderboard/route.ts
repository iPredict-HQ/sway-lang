import { NextResponse } from "next/server";
import { Provider } from "fuels";
import { Leaderboard } from "@/sway-api";

export const dynamic = "force-dynamic";

const PROVIDER_URL =
  process.env.NEXT_PUBLIC_FUEL_PROVIDER_URL ||
  "https://testnet.fuel.network/v1/graphql";
const CONTRACT_ID = process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_ID || "";

let _provider: Provider | null = null;
function getProvider() {
  if (!_provider) _provider = new Provider(PROVIDER_URL);
  return _provider;
}

function getContract() {
  return new Leaderboard(CONTRACT_ID, getProvider());
}

function safeBnToNumber(bn: unknown): number {
  if (typeof bn === "number") return bn;
  if (typeof bn === "object" && bn !== null && "toNumber" in bn) {
    try {
      return (bn as { toNumber: () => number }).toNumber();
    } catch {
      return Number(BigInt((bn as { toString: () => string }).toString()));
    }
  }
  return Number(bn);
}

function extractAddress(identity: { Address?: { bits: string }; ContractId?: { bits: string } }): string {
  if (identity?.Address) return identity.Address.bits;
  if (identity?.ContractId) return identity.ContractId.bits;
  return "";
}

/**
 * GET /api/leaderboard?action=top&limit=50
 * GET /api/leaderboard?action=stats&address=0x...
 * GET /api/leaderboard?action=points&address=0x...
 * GET /api/leaderboard?action=rank&address=0x...
 */
export async function GET(req: Request) {
  if (!CONTRACT_ID) {
    return NextResponse.json({ error: "Leaderboard contract not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "top";
  const address = url.searchParams.get("address") || "";
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  try {
    const contract = getContract();

    if (action === "top") {
      const { value: raw } = await contract.functions.get_top_players(limit).get();
      if (!raw || !Array.isArray(raw) || raw.length === 0) {
        return NextResponse.json([]);
      }
      const players = raw.map((item: { address: { Address?: { bits: string }; ContractId?: { bits: string } }; points: unknown }) => ({
        address: extractAddress(item.address),
        points: safeBnToNumber(item.points),
      }));
      return NextResponse.json(players);
    }

    if (action === "stats" && address) {
      const identity = { Address: { bits: address } };
      const { value: raw } = await contract.functions.get_stats(identity).get();
      return NextResponse.json({
        points: safeBnToNumber(raw.points),
        totalBets: safeBnToNumber(raw.total_bets),
        wonBets: safeBnToNumber(raw.won_bets),
        lostBets: safeBnToNumber(raw.lost_bets),
      });
    }

    if (action === "points" && address) {
      const identity = { Address: { bits: address } };
      const { value } = await contract.functions.get_points(identity).get();
      return NextResponse.json({ points: safeBnToNumber(value) });
    }

    if (action === "rank" && address) {
      const identity = { Address: { bits: address } };
      const { value } = await contract.functions.get_rank(identity).get();
      return NextResponse.json({ rank: safeBnToNumber(value) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /leaderboard] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
