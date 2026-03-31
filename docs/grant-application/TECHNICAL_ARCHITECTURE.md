# iPredict — Technical Architecture

## How It's Built Under the Hood

iPredict is a full-stack prediction market built on Fuel Network. The backend is five Sway smart contract modules running on FuelVM. The frontend is a Next.js 14 app that talks directly to the blockchain through the fuels-ts SDK. There's no centralized server in between — all state lives on-chain.

---

## The Five Contract Modules

Each contract has one job. They communicate through Sway's inter-contract call mechanism using ABI imports and ContractId references.

```
prediction_market.sw (573 lines)
├── Core logic: create markets, accept bets (native ETH), resolve outcomes,
│   cancel with refunds, claim rewards, manage fees
├── Calls → ipredict_token.mint (reward winners and losers)
├── Calls → referral_registry.credit (route referral fees)
└── Calls → leaderboard.record_bet, leaderboard.add_pts (track stats and points)

ipredict_token.sw (267 lines)
└── SRC-20/SRC-3 fungible token with multi-minter auth (only authorized contracts can mint)

referral_registry.sw (287 lines)
├── User registration, referral chains, fee crediting, display names
├── Calls → leaderboard.add_bonus_pts (referral bonus points)
└── Calls → ipredict_token.mint (token rewards for referrers)

leaderboard.sw (339 lines)
└── Points, stats (wins/losses/bets), sorted top-50 player ranking with O(n) maintenance

libraries (379 lines)
└── Shared types, constants, error enums, ABI definitions — imported by all contracts
```

**Total:** 1,845 lines of production Sway code.

### How the Contracts Trust Each Other

Two layers of access control:

1. **Admin operations** (create market, resolve, cancel, withdraw fees) — the contract checks `msg_sender()` against the stored `admin` Identity. Only the deployer who called `initialize` can perform these.
2. **Cross-contract operations** (mint tokens, record stats, credit fees) — each contract stores the ContractIds of its authorized callers during initialization. Inter-contract calls are verified by checking the calling contract's ID against the stored authorized ContractId.

The `initialize` function on each contract runs once after deployment. It stores the ContractIds of the other contracts so they can communicate securely. No one else gets in.

---

## What Happens When You Place a Bet

Step by step, this is the flow inside the contracts when someone clicks "Place Bet":

1. `prediction_market` receives `bet(market_id, is_yes)` with ETH attached via `msg_amount()`
2. Validates the asset is the base ETH asset via `msg_asset_id()`
3. Validates everything: market exists, hasn't expired (block timestamp), isn't resolved or cancelled, amount ≥ minimum bet
4. Calculates the 2% fee: 1.5% platform + 0.5% referral (all in basis points, integer math)
5. The ETH is already in the contract from the function call (Fuel's native asset model)
6. Stores the fee breakdown in contract state
7. Calls `referral_registry.credit()` — if the user has a referrer, routes 0.5% of the bet as real ETH to the referrer's wallet
8. Stores (or updates) the bet record: amount net of fees, which side they chose, claimed flag
9. Updates the market totals: adds to the YES or NO pool
10. Calls `leaderboard.record_bet()` to bump the user's bet count
11. Fires a `log` event with all the bet details

That's 11 steps in a single transaction. All atomic — if any step fails, the whole thing reverts.

## What Happens When You Claim a Reward

After the market resolves:

1. Checks: market is resolved, your bet exists, you haven't claimed yet
2. **If you won:** payout = `(your_bet ÷ winning_pool) × total_pool`
3. Transfers your payout from the contract to your wallet via `transfer()`
4. Calls `leaderboard.add_pts()` — 30 points for a win, 10 for a loss
5. Calls `ipredict_token.mint()` — 10 IPREDICT for a win, 2 for a loss
6. Fires a `reward-claimed` log event

Everyone gets something. Winners get ETH + more points + more tokens. Losers get points and tokens for showing up.

---

## The Pari-Mutuel Math

All bets on the losing side get redistributed to the winning side, proportionally.

**Example:** 100 ETH total pool (after fees)
- YES pool: 60 ETH (3 bettors)
- NO pool: 40 ETH (2 bettors)
- Outcome: YES wins

| Bettor | Side | Bet | Payout | Calculation |
|--------|------|-----|--------|-------------|
| A | YES | 30 ETH | 50.00 ETH | (30/60) × 100 |
| B | YES | 20 ETH | 33.33 ETH | (20/60) × 100 |
| C | YES | 10 ETH | 16.67 ETH | (10/60) × 100 |
| D | NO | 25 ETH | 0 ETH | (lost, but earns 10 pts + 2 IPREDICT) |
| E | NO | 15 ETH | 0 ETH | (lost, but earns 10 pts + 2 IPREDICT) |

The math is clean: everybody's payout comes from the same pool. The contract enforces that total payouts never exceed total deposits. All arithmetic is integer-only (u64) — Sway has no floating point, so rounding is handled explicitly.

### Fee Breakdown

| Fee | Rate | Where it goes |
|-----|------|---------------|
| Platform | 1.5% | Accumulates in the contract, admin can withdraw |
| Referral | 0.5% | Sent directly to referrer's wallet (or becomes platform fee if no referrer) |
| **Total** | **2.0%** | Deducted from bet amount before it enters the pool |

---

## Frontend Architecture

### The Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, server components where appropriate) |
| UI | React 18, Tailwind CSS, glassmorphic design system |
| Wallet | fuels-ts SDK (Fuel Wallet + Fuelet) |
| Blockchain | fuels-ts for contract interaction, ABI typegen |
| Testing | Vitest, React Testing Library |
| Hosting | Vercel |

### Routes

| Route | What's there |
|-------|-------------|
| `/` | Landing page — featured markets, live stats, leaderboard preview |
| `/markets` | Browse all markets — status badges, countdown timers, odds bars |
| `/markets/[id]` | Market detail — full view, betting panel, bettor list |
| `/leaderboard` | Rankings — sortable by points, volume, win rate |
| `/profile` | Your stats — bet history, referral info, token balance |
| `/admin` | Admin controls — create, resolve, cancel markets, withdraw fees |

### Service Layer

The frontend wraps all blockchain calls in a service layer:

- **fuel.ts** — Fuel provider connection, wallet detection, contract instance creation
- **market.ts** — market CRUD, bet placement, claims, fee withdrawal via fuels-ts
- **leaderboard.ts** — player stats, rankings, top players
- **referral.ts** — registration, display names, referral tracking
- **token.ts** — IPREDICT balance and supply queries
- **cache.ts** — in-memory TTL cache to cut down on RPC calls
- **events.ts** — event parsing for transaction history

### Contract Type Generation

The frontend uses fuels-ts typegen to generate TypeScript types from the Sway ABI. This means:

- Full type safety on every contract call
- Auto-complete for function names and parameters
- Compile-time errors when contract interfaces change
- No manual ABI parsing or raw hex decoding

### Component Layout

```
components/
  layout/      — Navbar, Footer, MobileMenu
  market/      — MarketCard, BettingPanel, OddsBar, CountdownTimer, MarketImage
  leaderboard/ — LeaderboardTable, PlayerRow, Tabs
  profile/     — BetHistory, PointsCard, ReferralCard, TokenBalance
  social/      — ShareBetButton, SocialShareModal
  admin/       — CreateMarket, ResolveMarket, MarketStats
  wallet/      — WalletConnect
  ui/          — Spinner, Skeleton, Toast, Badge, TxProgress
```

30+ components, organized by domain. No component dump.

---

## Testing Strategy

### Contract Tests (fuels-rs SDK + Tokio)

59 integration tests across 5 test suites:

- **prediction_market/harness.rs** — market lifecycle, betting, resolution, claims, cancellation, edge cases
- **ipredict_token/harness.rs** — SRC-20/SRC-3 compliance, multi-minter auth, burn, transfer
- **referral_registry/harness.rs** — registration, referral chains, fee crediting
- **leaderboard/harness.rs** — points, rankings, sorted insert, stats
- **integration_tests/integration.rs** — full cross-contract flows (bet → referral → leaderboard → token)

### Frontend Tests (Vitest + React Testing Library)

137 tests across 9 files:

- Service layer: market calls, leaderboard queries, cache behavior, helpers
- Components: MarketCard, BettingPanel, LeaderboardTable, Navbar, WalletConnect

---

## Deployment Setup

### Contracts

- **Toolchain:** Forc (Fuel toolchain) for compilation and deployment
- **Testing:** fuels-rs with cargo test for contract integration tests
- **ABI Generation:** fuels-ts typegen for frontend TypeScript bindings
- **Post-deploy:** `initialize()` function on each contract wires up inter-contract ContractId references

### Frontend

- **Platform:** Vercel
- **Build:** Next.js with static and dynamic routes
- **Env vars:** Contract IDs, Fuel provider URL, network configuration
- **Type generation:** fuels.config.ts configures automatic ABI → TypeScript generation

### CI/CD

- GitHub Actions pipeline
- Steps: lint → contract build → contract test → frontend test → frontend build
- Automated on every push and pull request

---

## FuelVM Advantages for This Architecture

### Parallel Execution

FuelVM's UTXO-based model allows parallel transaction processing. For iPredict, this means:
- Multiple bets can be placed simultaneously without contention
- High-traffic events (election nights, crypto market moves) don't create gas wars
- Resolution and claim transactions can process in parallel across different markets

### Native Asset Model

Fuel treats ETH (and all assets) as first-class UTXO primitives:
- `msg_amount()` and `msg_asset_id()` make bet deposits clean and predictable
- `transfer()` handles payouts without low-level call semantics
- No need for WETH wrapping or approval patterns

### Sway Safety Guarantees

- **No reentrancy by design** — Sway's execution model prevents reentrant calls
- **Integer overflow protection** — compile-time and runtime checks prevent arithmetic bugs
- **Ownership model** — resource tracking prevents double-spend and use-after-move bugs
- **Strong typing** — Identity, ContractId, Address are distinct types, preventing confusion
