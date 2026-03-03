# iPredict — Iteration Log

## Purpose

This document tracks each iteration of improvements made to the iPredict platform, particularly those driven by real user feedback from testnet testing.

---

## Iteration Template

```markdown
### Iteration N: [Title]

**Date:** YYYY-MM-DD
**Triggered by:** User Feedback #X (from USER-FEEDBACK.md) / Internal QA / Code review
**Priority:** High / Medium / Low

#### Problem
_Describe the issue or opportunity that triggered this change._

#### Solution
_Describe what was changed and why._

#### Files Changed
- `path/to/file.ts` — brief description

#### Before / After
_Screenshots, code snippets, or behavioral description showing the improvement._

#### Commit
`abc1234` — commit message

#### Impact
_Measurable or observable improvement._
```

---

## Log

### Iteration 0: Stellar → Fuel Network Migration

**Date:** 2025-01
**Triggered by:** Internal — Platform migration to Fuel Network for improved performance
**Priority:** High

#### Problem
The original iPredict platform was built on Stellar/Soroban. To take advantage of Fuel Network's sub-second finality, parallel execution (UTXO model), and Sway's native asset support, the entire platform was migrated.

#### Solution
Complete migration of all smart contracts from Soroban (Rust + `soroban-sdk`) to Sway on Fuel VM, and all frontend services/hooks from `@stellar/stellar-sdk` to `fuels` TypeScript SDK with `@fuels/react` for wallet integration.

**Smart Contracts:**
- Rewrote all 4 contracts in Sway: `prediction_market`, `ipredict_token`, `referral_registry`, `leaderboard`
- Created shared `libraries/` package with common types, constants, ABIs, and error enums
- Replaced `Cargo.toml` workspace with `Forc.toml` workspace
- Replaced `#![no_std]` Rust with `contract;` Sway directive
- Replaced `soroban-sdk` storage with Sway flattened `StorageMap` pattern
- Replaced SAC XLM transfers with Fuel native `transfer()` + `msg_amount()` for payable functions
- Replaced `env.invoke_contract()` with Sway `abi(Contract, id)` inter-contract calls
- Replaced `Address` with Fuel `Identity` type
- Updated decimals from 7 (Stellar) to 9 (Fuel)
- Replaced `lib.rs` + `test.rs` with `main.sw` + `tests/harness.rs` (Rust SDK integration tests)

**Frontend:**
- Replaced `@stellar/stellar-sdk` with `fuels` v0.100.6
- Replaced `@creit.tech/stellar-wallets-kit` with `@fuels/react` + `@fuels/connectors`
- Removed custom `useWallet` hook — wallet state from `@fuels/react` hooks (`useWallet`, `useAccount`, `useConnectUI`, `useIsConnected`, `useDisconnect`)
- Replaced `services/soroban.ts` with `services/fuel.ts` (Provider, contract factories, identity helpers)
- Updated all service files to use `.get()` / `.call()` / `.callParams()` patterns
- Updated all hooks to use `@fuels/react` wallet hooks
- Removed `wallet/` directory (kit.ts, types.ts) — replaced by `@fuels/react`
- Removed `WalletModal.tsx` — replaced by `@fuels/react` connector dialog
- Replaced `SocialShareModal.tsx` (portal-based modal) with inline dropdown in `ShareBetButton.tsx`
- Updated all UI text: XLM → ETH, Stellar → Fuel, stellar.expert → app.fuel.network
- Added `sway-api/` directory for auto-generated typed contract bindings
- Updated all test files to mock Fuel SDK patterns

**Documentation:**
- Rewrote README.md, ipredict.md, iPredict-Project-Structure.md, ARCHITECTURE.md, DEPLOYMENT-GUIDE.md
- Updated CI/CD pipeline for `fuelup` + `forc` toolchain

#### Files Changed
- `contracts/**` — All Sway contracts and Forc.toml configs
- `frontend/src/services/*` — All service files rewritten for Fuel SDK
- `frontend/src/hooks/*` — All hooks updated for @fuels/react
- `frontend/src/components/wallet/WalletConnect.tsx` — Uses @fuels/react
- `frontend/src/components/social/ShareBetButton.tsx` — Inline popover
- `frontend/src/components/social/SocialShareModal.tsx` — Deleted
- `frontend/src/components/wallet/WalletModal.tsx` — Deleted
- `frontend/src/wallet/` — Deleted (kit.ts, types.ts)
- `frontend/src/app/providers.tsx` — FuelProvider config
- `frontend/src/__tests__/**` — All tests updated
- `*.md` — All documentation files

#### Impact
- Sub-second transaction finality (vs 5s on Stellar)
- Parallel execution via Fuel's UTXO model
- Type-safe contract interactions via auto-generated Sway bindings
- Native asset forwarding for payable functions (no SAC transfer step)
- Simplified wallet UX via @fuels/react connector dialog

---

### Iteration 1: _[Pending — Will Be Filled After User Testing]_

**Date:**
**Triggered by:**
**Priority:**

#### Problem
_To be documented after user feedback is collected._

#### Solution
_To be documented._

#### Files Changed
- _TBD_

#### Before / After
_TBD_

#### Commit
_TBD_

#### Impact
_TBD_

---

### Iteration 2: _[Pending]_

_Reserved for second iteration based on feedback._

---

### Iteration 3: _[Pending]_

_Reserved for third iteration based on feedback._

---

## Iteration Checklist

Before marking an iteration complete:

- [ ] Problem clearly described
- [ ] Solution implemented and tested
- [ ] Files changed documented
- [ ] Before/after evidence captured
- [ ] Changes committed with descriptive message
- [ ] USER-FEEDBACK.md updated with action taken
- [ ] Deployed to testnet for re-validation
