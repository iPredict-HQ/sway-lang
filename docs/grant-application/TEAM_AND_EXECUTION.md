# iPredict — Team & Execution

## Who's Behind This

iPredict is built by **Akan** — full-stack developer, smart contract engineer, and the person who wrote every line of code in this project. Solo builder. No team. No outsourced work. No AI-generated contracts pasted in without understanding.

This isn't a "team of 5 with impressive LinkedIn profiles" play. It's one person who built the entire thing from scratch — 1,845 lines of Sway, a full Next.js frontend, 196 tests, CI/CD pipeline — and is now asking for support to take it to mainnet on Fuel.

---

## The Proof Is the Product

The best way to evaluate execution capability is to look at what already exists:

### Smart Contracts — 1,845 Lines of Production Sway

- **prediction_market.sw** (573 lines) — Full market lifecycle: creation, betting with native ETH, pari-mutuel settlement, fee distribution, cancel-with-refund, claim logic
- **ipredict_token.sw** (267 lines) — SRC-20/SRC-3 fungible token with a multi-minter authorization model
- **referral_registry.sw** (287 lines) — User registration, referral chain tracking, automatic fee crediting, display names
- **leaderboard.sw** (339 lines) — Points, stats (wins/losses/bets), sorted top-50 player ranking with O(n) maintenance
- **libraries** (379 lines) — Shared types, constants, error enums, ABI definitions used across all contracts

All 5 modules built, compiled, and tested. Inter-contract authorization fully wired and working.

### Testing — 196 Tests, All Green

- 59 contract integration tests using fuels-rs SDK across 5 test suites (including full cross-contract integration)
- 137 frontend tests with Vitest + React Testing Library
- CI/CD on GitHub Actions — everything runs on every push

### Frontend — Shipped and Ready

- Next.js 14 with 7 routes, 30+ React components
- Full wallet integration via fuels-ts SDK (Fuel Wallet + Fuelet)
- Every contract function wired to the UI: bet, claim, resolve, cancel, referral, admin
- Social sharing after every bet (X, Telegram, WhatsApp)
- Real-time countdowns with dynamic block-time estimation
- Mobile-responsive glassmorphic design
- Seed markets with betting enabled

### Infrastructure — Ready for Real Use

- Seed markets active and testable
- Reproducible market creation via deployment scripts
- Deployment configurations for both testnet and mainnet
- Sensitive keys excluded from git (proper .gitignore)

---

## Hard Problems That Got Solved

This wasn't a tutorial project. Building iPredict on Fuel meant solving real engineering challenges in Sway:

### Pari-Mutuel Math Without Floating Point

Sway has no floating-point types. The payout formula — `user_bet × total_pool ÷ winning_pool` — needs to handle rounding correctly without losing anyone's money. The contract guarantees total payouts never exceed the total pool, even with integer-only arithmetic. Every edge case — single bettors, minimum bets, maximum pools — is handled and tested.

### Five Contracts That Trust Each Other (But Nobody Else)

The prediction market mints tokens, records leaderboard points, and credits referral fees — but it needs to do that through the other contracts without those contracts being callable by random users. The solution: ContractId-based authorization checks, where each contract stores the IDs of its trusted counterparts during a one-time initialization. Getting inter-contract calls right in Sway — with proper ABI imports, ContractId resolution, and authorization enforcement — required careful architecture.

### Native Asset Handling in FuelVM

Unlike EVM where ETH transfers are special, Fuel treats all assets (including ETH) as first-class UTXO-based primitives. Building the betting logic around `msg_amount()`, `msg_asset_id()`, and `transfer()` meant deeply understanding Fuel's asset model. Pari-mutuel settlement with native asset transfers is clean but requires precise handling of the contract's internal balance tracking versus on-chain UTXO state.

### Storage Architecture Without Nested Structs

Early Fuel/Sway versions had limitations with complex nested types in StorageMap. The contracts use a flattened storage pattern — individual StorageMaps per field — that's verbose but robust and gas-efficient. This pattern is reusable and well-documented for other Fuel builders to learn from.

### Cross-Contract ABI Design

Designing clean ABI boundaries between 5 contracts required careful thought about what each contract exposes, what parameters it accepts, and how authorization flows. The shared library pattern (common types, constants, error enums) keeps all contracts in sync and eliminates duplication.

---

## How I Build Things

I have a process that works, and I stick to it:

1. **Contract first.** Every feature starts in Sway. If it can't be expressed safely on-chain, it doesn't ship.
2. **Tests alongside code.** No function exists without tests. Literally none.
3. **Integration tests verify cross-contract flows.** Once individual contracts work, full flow tests (bet → referral → leaderboard → token) verify the system works end-to-end.
4. **Frontend last.** The UI is built against working, tested contracts using fuels-ts typegen. No mock data in production.
5. **Ship, test with real wallets, fix, repeat.** Deploy, connect Fuel Wallet, click through everything, find bugs, fix them.

### Toolbox

| Tool | What it does for this project |
|------|------|
| Forc (Fuel toolchain) | Contract compilation, deployment, ABI generation |
| fuels-rs SDK | Rust-based contract testing, deployment, and integration testing |
| fuels-ts SDK | TypeScript SDK for frontend-to-contract interaction |
| Vitest | Test runner for frontend tests |
| Next.js 14 | Frontend framework (App Router) |
| Fuel Wallet SDK | Wallet integration (Fuel Wallet + Fuelet) |
| Tailwind CSS | UI styling |
| React Testing Library | Component testing |
| GitHub Actions | CI/CD pipeline |
| Vercel | Frontend hosting |

---

## This Isn't a Grant-and-Disappear Project

Some real talk about long-term commitment:

- The codebase is MIT-licensed. It stays open and actively maintained.
- The post-grant roadmap is real: oracle integration (Pyth/Redstone), multi-asset betting, IPREDICT token utility, mobile app.
- The 2% fee model generates revenue at modest volume. The platform covers its own costs at reasonable adoption.
- Open source contributions from the community will grow the project beyond what one person can do.
- If traction warrants it, follow-up funding or revenue-based sustainability is on the table.

### Why Fuel (Honestly)

I'm building on Fuel because prediction markets need three things that Fuel provides better than any other execution layer:

1. **Speed.** FuelVM's parallel transaction execution means bets land fast, even during high-activity events. On EVM chains, prediction markets choke during elections and crypto events. On Fuel, they won't.

2. **Safety.** Sway's ownership model, strong type system, and compile-time checks catch bugs before deployment. For a product handling real money, that's the difference between a secure platform and an exploit headline.

3. **Native assets.** Fuel treats ETH as a first-class UTXO primitive, not a special case. Pari-mutuel settlement — which is essentially "collect ETH from many users, then redistribute it" — maps perfectly to Fuel's asset model.

That's not fluff. For a product where people put real money on the line, these architectural choices matter more than TPS benchmarks or gas cost comparisons.

---

## Connect

- **GitHub:** https://github.com/AkaniMohtworking/iPredict-fuel
- **X (Twitter):** [@iPredict_HQ](https://twitter.com/iPredict_HQ)
