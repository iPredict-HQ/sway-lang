import { NextResponse } from "next/server";
import { Provider } from "fuels";
import { IpredictToken } from "@/sway-api";

export const dynamic = "force-dynamic";

const PROVIDER_URL =
  process.env.NEXT_PUBLIC_FUEL_PROVIDER_URL ||
  "https://testnet.fuel.network/v1/graphql";
const CONTRACT_ID = process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID || "";

let _provider: Provider | null = null;
function getProvider() {
  if (!_provider) _provider = new Provider(PROVIDER_URL);
  return _provider;
}

function getContract() {
  return new IpredictToken(CONTRACT_ID, getProvider());
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

/**
 * GET /api/token?action=info
 * GET /api/token?action=balance&address=0x...
 * GET /api/token?action=supply
 */
export async function GET(req: Request) {
  if (!CONTRACT_ID) {
    return NextResponse.json({ error: "Token contract not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "info";
  const address = url.searchParams.get("address") || "";

  try {
    const contract = getContract();

    if (action === "info") {
      const [nameRes, symbolRes, decimalsRes, supplyRes] = await Promise.all([
        contract.functions.name().get(),
        contract.functions.symbol().get(),
        contract.functions.decimals().get(),
        contract.functions.total_supply().get(),
      ]);
      return NextResponse.json({
        name: nameRes.value,
        symbol: symbolRes.value,
        decimals: decimalsRes.value,
        totalSupply: safeBnToNumber(supplyRes.value),
      });
    }

    if (action === "balance" && address) {
      const identity = { Address: { bits: address } };
      const { value } = await contract.functions.balance(identity).get();
      const balance = safeBnToNumber(value) / 1e9;
      return NextResponse.json({ balance });
    }

    if (action === "supply") {
      const { value } = await contract.functions.total_supply().get();
      return NextResponse.json({ totalSupply: safeBnToNumber(value) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /token] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
