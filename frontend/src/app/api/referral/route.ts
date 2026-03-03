import { NextResponse } from "next/server";
import { Provider } from "fuels";
import { ReferralRegistry } from "@/sway-api";

export const dynamic = "force-dynamic";

const PROVIDER_URL =
  process.env.NEXT_PUBLIC_FUEL_PROVIDER_URL ||
  "https://testnet.fuel.network/v1/graphql";
const CONTRACT_ID = process.env.NEXT_PUBLIC_REFERRAL_CONTRACT_ID || "";

let _provider: Provider | null = null;
function getProvider() {
  if (!_provider) _provider = new Provider(PROVIDER_URL);
  return _provider;
}

function getContract() {
  return new ReferralRegistry(CONTRACT_ID, getProvider());
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

function extractAddress(identity: { Address?: { bits: string }; ContractId?: { bits: string } } | undefined | null): string {
  if (!identity) return "";
  if (identity.Address) return identity.Address.bits;
  if (identity.ContractId) return identity.ContractId.bits;
  return "";
}

/**
 * GET /api/referral?action=displayName&address=0x...
 * GET /api/referral?action=referrer&address=0x...
 * GET /api/referral?action=count&address=0x...
 * GET /api/referral?action=earnings&address=0x...
 * GET /api/referral?action=hasReferrer&address=0x...
 * GET /api/referral?action=isRegistered&address=0x...
 */
export async function GET(req: Request) {
  if (!CONTRACT_ID) {
    return NextResponse.json({ error: "Referral contract not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";
  const address = url.searchParams.get("address") || "";

  if (!action || !address) {
    return NextResponse.json({ error: "Missing action or address" }, { status: 400 });
  }

  const identity = { Address: { bits: address } };

  try {
    const contract = getContract();

    if (action === "displayName") {
      const { value } = await contract.functions.get_display_name(identity).get();
      return NextResponse.json({ displayName: value || "" });
    }

    if (action === "referrer") {
      const { value } = await contract.functions.get_referrer(identity).get();
      const addr = value ? extractAddress(value) : null;
      return NextResponse.json({ referrer: addr });
    }

    if (action === "count") {
      const { value } = await contract.functions.get_referral_count(identity).get();
      return NextResponse.json({ count: safeBnToNumber(value) });
    }

    if (action === "earnings") {
      const { value } = await contract.functions.get_earnings(identity).get();
      return NextResponse.json({ earnings: safeBnToNumber(value) });
    }

    if (action === "hasReferrer") {
      const { value } = await contract.functions.has_referrer(identity).get();
      return NextResponse.json({ hasReferrer: value });
    }

    if (action === "isRegistered") {
      const { value } = await contract.functions.is_registered(identity).get();
      return NextResponse.json({ isRegistered: value });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /referral] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
