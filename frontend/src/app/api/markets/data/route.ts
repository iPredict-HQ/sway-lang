import { NextResponse } from "next/server";
import { Provider } from "fuels";
import { PredictionMarket } from "@/sway-api";

export const dynamic = "force-dynamic";

const PROVIDER_URL =
  process.env.NEXT_PUBLIC_FUEL_PROVIDER_URL ||
  "https://testnet.fuel.network/v1/graphql";
const CONTRACT_ID = process.env.NEXT_PUBLIC_MARKET_CONTRACT_ID || "";

let _provider: Provider | null = null;
function getProvider() {
  if (!_provider) _provider = new Provider(PROVIDER_URL);
  return _provider;
}

function getContract() {
  return new PredictionMarket(CONTRACT_ID, getProvider());
}

/**
 * GET /api/markets/bet?marketId=1&address=0x...  → user's bet
 * GET /api/markets/odds?marketId=1               → odds for a market
 * GET /api/markets/fees                          → accumulated fees
 */
export async function GET(req: Request) {
  if (!CONTRACT_ID) {
    return NextResponse.json({ error: "Contract not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const marketIdStr = url.searchParams.get("marketId");

  try {
    const contract = getContract();

    if (action === "odds" && marketIdStr) {
      const marketId = parseInt(marketIdStr, 10);
      const { value } = await contract.functions.get_odds(marketId).get();
      return NextResponse.json({
        yesPercent: value.yes_percent,
        noPercent: value.no_percent,
      });
    }

    if (action === "bet" && marketIdStr) {
      const address = url.searchParams.get("address");
      if (!address) {
        return NextResponse.json({ error: "Missing address" }, { status: 400 });
      }
      const marketId = parseInt(marketIdStr, 10);
      const identity = { Address: { bits: address } };
      const { value } = await contract.functions.get_bet(marketId, identity).get();
      return NextResponse.json({
        amount: (typeof value.amount === "object" && value.amount.toNumber ? value.amount.toNumber() : Number(value.amount)) / 1e9,
        isYes: value.is_yes,
        claimed: value.claimed,
      });
    }

    if (action === "fees") {
      const { value } = await contract.functions.get_accumulated_fees().get();
      const fees = value.toNumber() / 1e9;
      return NextResponse.json({ fees });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /markets/data] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
