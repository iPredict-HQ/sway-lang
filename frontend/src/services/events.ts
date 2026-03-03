import type { MarketEvent } from "@/types";

// ── Event polling for Fuel ────────────────────────────────────────────────────
//
// On Fuel, contract events are emitted as `Log` / `LogData` receipts within
// each transaction. Unlike Soroban's `server.getEvents()` API, Fuel does not
// yet provide a dedicated event query endpoint.
//
// For a production app, you'd use a Fuel indexer (e.g. Envio, SubSquid, or a
// custom Fuel indexer) to index contract logs and serve them via an API.
//
// This stub returns an empty array so the UI degrades gracefully.
// Activity feeds will be populated once an indexer is integrated.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Poll for recent market events.
 *
 * Currently a stub — returns an empty array.
 * TODO: Integrate with a Fuel indexer to fetch real contract logs.
 *
 * @param _startBlock — Optional block height to start from (unused).
 * @returns Empty array (stub).
 */
export async function pollMarketEvents(
  _startBlock?: number
): Promise<MarketEvent[]> {
  void _startBlock;
  // Stub — Fuel doesn't expose a direct event query API on the provider.
  // Once an indexer is set up, implement event fetching here.
  return [];
}
