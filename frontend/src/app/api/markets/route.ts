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

// TAI64 epoch offset — Fuel's timestamp() returns TAI64 format
const TAI64_EPOCH = BigInt("4611686018427387904");

/** Safely convert a Fuel BN to a JS number. Uses toString() + BigInt for large values. */
function safeBnToNumber(bn: unknown): number {
  if (typeof bn === "number") return bn;
  if (typeof bn === "object" && bn !== null && "toString" in bn) {
    const str = (bn as { toString: () => string }).toString();
    const big = BigInt(str);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
      // Likely a TAI64 timestamp — convert to Unix seconds
      return Number(big - TAI64_EPOCH);
    }
    return Number(big);
  }
  return Number(bn);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMarket(raw: any) {
  return {
    id: safeBnToNumber(raw.id),
    question: raw.question,
    imageUrl: raw.image_url,
    endTime: safeBnToNumber(raw.end_time),
    totalYes: safeBnToNumber(raw.total_yes) / 1e9,
    totalNo: safeBnToNumber(raw.total_no) / 1e9,
    resolved: raw.resolved,
    outcome: raw.outcome,
    cancelled: raw.cancelled,
    creator:
      raw.creator?.Address?.bits ||
      raw.creator?.ContractId?.bits ||
      "",
    betCount: safeBnToNumber(raw.bet_count),
  };
}

/**
 * GET /api/markets          → all markets
 * GET /api/markets?id=3     → single market
 * GET /api/markets?count=1  → market count only
 */
export async function GET(req: Request) {
  if (!CONTRACT_ID) {
    return NextResponse.json({ error: "Market contract not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const idParam = url.searchParams.get("id");
  const countOnly = url.searchParams.get("count");

  try {
    const contract = getContract();

    // Return market count only
    if (countOnly) {
      const { value } = await contract.functions.get_market_count().get();
      return NextResponse.json({ count: value.toNumber() });
    }

    // Return a single market
    if (idParam) {
      const marketId = parseInt(idParam, 10);
      if (isNaN(marketId) || marketId < 1) {
        return NextResponse.json({ error: "Invalid market ID" }, { status: 400 });
      }
      const { value } = await contract.functions.get_market(marketId).get();
      return NextResponse.json(parseMarket(value));
    }

    // Return all markets
    console.log("[API /markets] Fetching market count...");
    const { value: countBn } = await contract.functions.get_market_count().get();
    const total = countBn.toNumber();
    console.log("[API /markets] Market count:", total);
    if (total === 0) return NextResponse.json([]);

    const markets = [];
    for (let i = 1; i <= total; i++) {
      try {
        const c = getContract();
        const { value } = await c.functions.get_market(i).get();
        markets.push(parseMarket(value));
      } catch (e) {
        console.error(`[API /markets] Failed to fetch market ${i}:`, e instanceof Error ? e.message : e);
      }
    }
    console.log("[API /markets] Returning", markets.length, "markets");

    return NextResponse.json(markets);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /markets] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
