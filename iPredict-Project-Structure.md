# iPredict — Project Structure & Architecture

> A comprehensive project structure and development guide for building the iPredict prediction market MVP on Fuel Network. **No code implementation** — this document defines the folder structure, file responsibilities, component flow, contract architecture, and development patterns.

---

## Root Folder Structure

```
ipredict-fuelnetwork/
├── .github/
│   └── workflows/
│       └── ci.yml
├── contracts/
│   ├── Forc.toml              # [workspace] — all 4 contract + 1 library package
│   ├── libraries/
│   │   ├── Forc.toml
│   │   └── src/
│   │       └── lib.sw         # Shared types, constants, ABIs, error enums
│   ├── prediction_market/
│   │   ├── Forc.toml
│   │   ├── src/
│   │   │   └── main.sw        # Contract logic, storage, events, inter-contract calls
│   │   └── tests/
│   │       └── harness.rs     # Rust SDK integration tests
│   ├── ipredict_token/
│   │   ├── Forc.toml
│   │   ├── src/
│   │   │   └── main.sw
│   │   └── tests/
│   │       └── harness.rs
│   ├── referral_registry/
│   │   ├── Forc.toml
│   │   ├── src/
│   │   │   └── main.sw
│   │   └── tests/
│   │       └── harness.rs
│   └── leaderboard/
│       ├── Forc.toml
│       ├── src/
│       │   └── main.sw
│       └── tests/
│           └── harness.rs
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── og-image.png
│   │   └── images/
│   │       └── markets/
│   │           ├── xlm-price.png
│   │           ├── bitcoin.png
│   │           ├── football.png
│   │           ├── crypto-event.png
│   │           └── default-market.png
│   ├── src/
│   │   ├── sway-api/          # Auto-generated typed bindings (npx fuels build)
│   │   │   ├── contracts/
│   │   │   │   ├── PredictionMarketContract.ts
│   │   │   │   ├── IpredictTokenContract.ts
│   │   │   │   ├── ReferralRegistryContract.ts
│   │   │   │   └── LeaderboardContract.ts
│   │   │   └── index.ts
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── providers.tsx
│   │   │   ├── FeaturedMarkets.tsx
│   │   │   ├── LeaderboardPreview.tsx
│   │   │   ├── LiveStats.tsx
│   │   │   ├── markets/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── leaderboard/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   └── admin/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── MobileMenu.tsx
│   │   │   ├── market/
│   │   │   │   ├── MarketCard.tsx
│   │   │   │   ├── MarketGrid.tsx
│   │   │   │   ├── MarketFilters.tsx
│   │   │   │   ├── BettingPanel.tsx
│   │   │   │   ├── OddsBar.tsx
│   │   │   │   ├── CountdownTimer.tsx
│   │   │   │   └── MarketImage.tsx
│   │   │   ├── leaderboard/
│   │   │   │   ├── LeaderboardTable.tsx
│   │   │   │   ├── LeaderboardTabs.tsx
│   │   │   │   └── PlayerRow.tsx
│   │   │   ├── profile/
│   │   │   │   ├── BetHistory.tsx
│   │   │   │   ├── PointsCard.tsx
│   │   │   │   ├── TokenBalance.tsx
│   │   │   │   └── ReferralStats.tsx
│   │   │   ├── social/
│   │   │   │   └── ShareBetButton.tsx    # Inline dropdown popover (no modal)
│   │   │   ├── wallet/
│   │   │   │   └── WalletConnect.tsx     # Uses @fuels/react hooks directly
│   │   │   ├── admin/
│   │   │   │   ├── CreateMarketForm.tsx
│   │   │   │   ├── ResolveMarketPanel.tsx
│   │   │   │   └── PlatformStats.tsx
│   │   │   └── ui/
│   │   │       ├── Spinner.tsx
│   │   │       ├── Skeleton.tsx
│   │   │       ├── TxProgress.tsx
│   │   │       ├── Toast.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── ErrorBoundary.tsx
│   │   │       └── EmptyState.tsx
│   │   ├── hooks/
│   │   │   ├── useMarkets.ts
│   │   │   ├── useMarket.ts
│   │   │   ├── useBet.ts
│   │   │   ├── useClaim.ts
│   │   │   ├── useLeaderboard.ts
│   │   │   ├── useReferral.ts
│   │   │   ├── useToken.ts
│   │   │   ├── useProfile.ts
│   │   │   └── useToast.tsx
│   │   ├── services/
│   │   │   ├── fuel.ts         # Provider + contract factory helpers
│   │   │   ├── market.ts
│   │   │   ├── token.ts
│   │   │   ├── referral.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── events.ts
│   │   │   └── cache.ts
│   │   ├── config/
│   │   │   └── network.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── helpers.ts
│   │   │   └── share.ts
│   │   └── __tests__/
│   │       ├── helpers.test.ts
│   │       ├── cache.test.ts
│   │       ├── market.test.ts
│   │       ├── leaderboard.test.ts
│   │       ├── components/
│   │       │   ├── Navbar.test.tsx
│   │       │   ├── MarketCard.test.tsx
│   │       │   ├── BettingPanel.test.tsx
│   │       │   ├── LeaderboardTable.test.tsx
│   │       │   └── WalletConnect.test.tsx
│   │       └── test-setup.ts
│   ├── fuels.config.ts       # Fuel SDK codegen config
│   ├── next.config.mjs
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   └── .env.local
├── docs/
│   ├── ARCHITECTURE.md
│   ├── USER-FEEDBACK.md
│   ├── DEPLOYMENT-GUIDE.md
│   └── ITERATION-LOG.md
├── .gitignore
├── README.md
└── LICENSE
```

---

## Smart Contracts — Structure & Flow

### Contract Workspace

Each contract is an independent Sway project under a shared Forc workspace. A shared `libraries/` package provides common types, constants, ABIs, and error enums:

```
contracts/
├── Forc.toml        # [workspace] members = ["libraries", "prediction_market", "ipredict_token", "referral_registry", "leaderboard"]
├── libraries/
│   ├── Forc.toml
│   └── src/
│       └── lib.sw   # Shared types, constants, ABIs — imported via `use libraries::*;`
└── <contract_name>/
    ├── Forc.toml    # [dependencies] libraries = { path = "../libraries" }
    ├── src/
    │   └── main.sw  # `contract;` directive, storage, abi impl, events, inter-contract calls
    └── tests/
        └── harness.rs  # Rust SDK integration tests using fuels-rs
```

The workspace `Forc.toml` ensures consistent builds across all packages and enables `forc build` / `forc test` from the workspace root.

**Forc.toml pattern (all 4 contracts):**
- `[project]` → `entry = "src/main.sw"`, `license = "MIT"`
- `[dependencies]` → `libraries = { path = "../libraries" }`, `standards = { git = "https://github.com/FuelLabs/sway-standards", tag = "v0.7.0" }`

**Shared Library (`libraries/src/lib.sw`):**
- Fee constants: `TOTAL_FEE_BPS = 200`, `PLATFORM_FEE_BPS = 150`, `REFERRAL_FEE_BPS = 50`, `BPS_DENOM = 10_000`
- Betting constraints: `MIN_BET = 1_000_000_000` (1 ETH in 9-decimal base units)
- Reward constants: `WIN_POINTS = 30`, `LOSE_POINTS = 10`, `WIN_TOKENS = 10_000_000_000` (10 IPRED), `LOSE_TOKENS = 2_000_000_000` (2 IPRED)
- Referral constants: `WELCOME_BONUS_POINTS = 5`, `WELCOME_BONUS_TOKENS = 1_000_000_000` (1 IPRED), `REFERRAL_BET_POINTS = 3`
- Leaderboard constants: `MAX_TOP_PLAYERS = 50`
- Structs: `Market`, `Bet`, `Odds`, `PlayerStats`, `PlayerEntry`
- Error enums: `MarketError`, `TokenError`, `ReferralError`, `LeaderboardError`
- ABI definitions: `IPredictToken`, `Leaderboard`, `ReferralRegistry` (used by PredictionMarket for inter-contract calls)

### Contract 1: `prediction_market` — Core Logic

**Storage** (flattened `StorageMap` pattern — avoids nested struct limitations in Sway):
- `initialized` — bool
- `admin` — Identity (admin address)
- `market_count` — u64 (auto-incrementing counter)
- `accumulated_fees` — u64 (platform fees in base units)
- `token_contract` / `referral_contract` / `leaderboard_contract` — ContractId
- `market_question(u64)` — StorageString per market
- `market_image_url(u64)` — StorageString per market
- `market_end_time(u64)` / `market_total_yes(u64)` / `market_total_no(u64)` — u64
- `market_resolved(u64)` / `market_outcome(u64)` / `market_cancelled(u64)` — bool
- `market_creator(u64)` — Identity
- `market_bet_count(u64)` — u32
- `bet_amount(u64, Identity)` / `bet_is_yes(u64, Identity)` / `bet_claimed(u64, Identity)` — per (market, user)
- `bet_exists(u64, Identity)` — bool

> **Fee model (single 2% fee — split for sustainable revenue):** A 2% fee is deducted **once** at bet time. The fee is split: **1.5% (150 bps) stays in the contract as platform revenue** (`accumulated_fees`) and **0.5% (50 bps) is sent to the user's referrer** via `ReferralRegistry.credit()`. The referrer also earns **3 bonus points** per referred bet. If the user has **no custom referrer**, the full 2% stays in the contract as platform revenue (no ETH leaves). There is **no additional fee at claim time**. User bets 1 ETH → 0.015 ETH kept by contract + 0.005 ETH sent to referrer (+ 3 pts) → 0.98 ETH enters the pool. Winners split the **entire pool** with no further deduction. Admin can withdraw accumulated platform fees via `withdraw_fees()`.

**Functions:**

| Function | Access | Flow |
|----------|--------|------|
| `initialize(token_id, referral_id, leaderboard_id)` | Admin | `msg_sender()` becomes admin, store linked contract IDs, set `accumulated_fees = 0` |
| `create_market(question, image_url, duration_secs) → u64` | Admin | Increment market_count, store new Market fields, return auto-incremented ID, emit `MarketCreated` log |
| `place_bet(market_id, is_yes)` | Public `#[payable]` | Validate market active + not expired + not cancelled + `msg_amount() >= MIN_BET` + user hasn't bet opposite side → `msg_amount()` is the forwarded ETH → calculate fees: `total_fee = amount * 200 / 10000`, `platform_fee = amount * 150 / 10000`, `referral_fee = total_fee - platform_fee`, `net = amount - total_fee` → add `platform_fee` to `accumulated_fees` → inter-contract call `ReferralRegistry.credit(user, referral_fee)` with forwarded coins → if user has referrer: 0.5% to referrer + 3 pts; if no referrer: returns false, add `referral_fee` to `accumulated_fees` → store Bet with net amount, increment bet_count, update market totals → inter-contract call `Leaderboard.record_bet(user)` → emit `BetPlaced` log |
| `resolve_market(market_id, outcome)` | Admin | Validate not resolved + not cancelled → set resolved + outcome → emit `MarketResolved` log |
| `cancel_market(market_id)` | Admin | Validate not resolved → set cancelled → refund each bettor's net amount via `transfer()` → emit `MarketCancelled` log. Note: the 2% fee already distributed is NOT refunded |
| `claim(market_id)` | Public | Validate resolved + not cancelled + has bet + not claimed → if winner: payout = `(user_net / winning_total) × total_pool`, `transfer()` ETH to user, `Leaderboard.add_pts(user, 30, true)`, `IPredictToken.mint(user, 10_000_000_000)` → if loser: `Leaderboard.add_pts(user, 10, false)`, `IPredictToken.mint(user, 2_000_000_000)` → mark claimed → emit `RewardClaimed` log |
| `get_market(market_id) → Market` | View | Return assembled Market struct |
| `get_bet(market_id, user) → Bet` | View | Return Bet struct |
| `get_market_count() → u64` | View | Return total markets created |
| `get_odds(market_id) → Odds` | View | Calculate YES% and NO% from net totals |
| `get_accumulated_fees() → u64` | View | Return current accumulated_fees |
| `withdraw_fees() → u64` | Admin | Transfer accumulated_fees ETH to admin → reset to 0 → emit `FeesWithdrawn` log |

**Inter-contract calls** (Sway `abi(ContractId)` pattern):
- `place_bet` → calls `ReferralRegistry.credit()` + `Leaderboard.record_bet()`
- `claim` → calls `Leaderboard.add_pts()` + `IPredictToken.mint()`

**Events emitted** (via `log()` — indexed by Fuel GraphQL):
- `MarketCreated` — (market_id, question, end_time)
- `BetPlaced` — (market_id, user, is_yes, amount, net_amount, fee)
- `MarketResolved` — (market_id, outcome)
- `MarketCancelled` — (market_id)
- `RewardClaimed` — (market_id, user, payout, points, tokens)
- `FeesWithdrawn` — (admin, amount)

**Tests in `tests/harness.rs`** (Rust SDK integration tests):
- Initialize contract with linked contract IDs
- Create market successfully
- Place YES bet and verify net amount (after 2% fee) in totals
- Place NO bet and verify net amount in totals
- Verify fee split: 1.5% to accumulated_fees, 0.5% routed to referrer via inter-contract call
- Verify full 2% to accumulated_fees when user has no custom referrer
- Reject bet on expired market
- Reject bet on resolved market
- Reject bet on cancelled market
- Reject bet below minimum (< 1 ETH / MIN_BET)
- Increase existing YES position and verify cumulative net amount
- Reject opposite-side bet (user bet YES, tries NO → error)
- Resolve market and verify state
- Reject double resolution
- Cancel market and verify all bettors refunded net amounts
- Reject cancel on already resolved market
- Claim as winner — verify ETH payout from full pool + inter-contract calls
- Claim as loser — verify no ETH payout + still gets points & tokens
- Reject double claim
- Reject claim on unresolved market
- Reject claim on cancelled market
- Get odds calculation accuracy on net totals
- Admin withdraw_fees transfers accumulated_fees and resets to 0
- Reject withdraw_fees by non-admin

### Contract 2: `ipredict_token` — Platform Token (SRC-20 compatible)

**Storage:**
- `initialized` — bool
- `admin` — Identity
- `authorized_minters` — StorageMap<ContractId, bool> (supports multiple minters)
- `balances` — StorageMap<Identity, u64>
- `total_supply` — u64
- `name` — StorageString ("IPREDICT")
- `symbol` — StorageString ("IPRED")
- `decimals` — u8 (9)

**Functions:**

| Function | Access | Flow |
|----------|--------|------|
| `initialize(name, symbol, decimals)` | Admin | `msg_sender()` becomes admin, store token metadata |
| `set_minter(minter: ContractId)` | Admin | Store `authorized_minters(minter) = true` — can add both PredictionMarket and ReferralRegistry |
| `remove_minter(minter: ContractId)` | Admin | Remove minter from authorized map |
| `mint(to, amount)` | Authorized minter | Validate caller is authorized minter → increment balance + total supply → emit `Mint` log |
| `transfer(to, amount)` | Public | Debit caller's balance, credit `to` → emit `Transfer` log |
| `burn(amount)` | Public | Debit caller's balance, reduce supply → emit `Burn` log |
| `balance(account) → u64` | View | Return balance |
| `total_supply() → u64` | View | Return total supply |
| `name() → String` | View | Return "IPREDICT" |
| `symbol() → String` | View | Return "IPRED" |
| `decimals() → u8` | View | Return 9 |

**Tests:**
- Initialize with metadata
- Add multiple authorized minters via `set_minter`
- Mint by first authorized minter (PredictionMarket)
- Mint by second authorized minter (ReferralRegistry)
- Reject mint by non-minter
- Remove minter and reject subsequent mint
- Balance check after mint
- Transfer between accounts
- Reject transfer with insufficient balance
- Burn tokens
- Total supply tracking

### Contract 3: `referral_registry` — Onchain Referral & Identity

**Storage:**
- `initialized` — bool
- `admin` — Identity
- `market_contract` — ContractId (authorized caller)
- `token_contract` — ContractId (for minting welcome bonus)
- `leaderboard_contract` — ContractId (for awarding welcome points)
- `referrer` — StorageMap<Identity, Identity> (who referred this user)
- `display_name` — StorageMap<Identity, StorageString>
- `referral_count` — StorageMap<Identity, u32>
- `referral_earnings` — StorageMap<Identity, u64>
- `registered` — StorageMap<Identity, bool>

**Functions:**

| Function | Access | Flow |
|----------|--------|------|
| `initialize(market_contract, token_contract, leaderboard_contract)` | Admin | `msg_sender()` becomes admin, store linked contract IDs |
| `register_referral(display_name, referrer: Option<Identity>)` | Public | Validate not already registered, user != referrer → store display name → if referrer provided: store referrer + increment count → `Leaderboard.add_bonus_pts(user, 5)` welcome bonus → `IPredictToken.mint(user, 1_000_000_000)` for 1 IPREDICT → emit `ReferralRegistered` log |
| `credit(user, referral_fee) → bool` | Market contract | Validate caller → if user has referrer: `transfer()` referral_fee ETH to referrer + `Leaderboard.add_bonus_pts(referrer, 3)` + accumulate earnings → return true. If no referrer: return false (caller adds to accumulated_fees) |
| `get_referrer(user) → Option<Identity>` | View | Return referrer identity |
| `get_display_name(user) → String` | View | Return display name string |
| `get_referral_count(user) → u32` | View | Return count |
| `get_earnings(user) → u64` | View | Return total earnings |
| `has_referrer(user) → bool` | View | Return bool |
| `is_registered(user) → bool` | View | Return bool |

**Important:** Registration is optional — users can bet without registering. However, registering gives a **5-point + 1 IPREDICT welcome bonus** and lets users set a **display name** shown on the leaderboard. Users who never register have no custom referrer, so the full 2% fee from their bets stays in the contract as platform revenue.

**Tests:**
- Register with display name + referrer successfully
- Register with display name + no referrer
- Welcome bonus: 5 points via `add_bonus_pts` + 1 IPREDICT minted on registration
- Reject self-referral
- Reject double registration
- Display name stored and retrievable
- Credit routes 0.5% to referrer when exists + awards 3 bonus points
- Credit returns false when no referrer (caller adds to accumulated_fees)
- Earnings accumulation across multiple credits
- Referral count tracking

### Contract 4: `leaderboard` — Onchain Points & Rankings

**Storage:**
- `initialized` — bool
- `admin` — Identity
- `market_contract` — ContractId
- `referral_contract` — ContractId
- `points` — StorageMap<Identity, u64>
- `total_bets` — StorageMap<Identity, u32>
- `won_bets` — StorageMap<Identity, u32>
- `lost_bets` — StorageMap<Identity, u32>
- `top_player_count` — u32
- `top_player_address(u32)` — StorageMap<u32, Identity> (sorted by points descending)
- `top_player_points(u32)` — StorageMap<u32, u64>

**Functions:**

| Function | Access | Flow |
|----------|--------|------|
| `initialize(market_contract, referral_contract)` | Admin | `msg_sender()` becomes admin, store authorized caller contract IDs |
| `add_pts(user, points, is_winner)` | Market contract | Validate caller → add points → if is_winner: increment won_bets, else: increment lost_bets → update sorted top players list → emit `PointsAwarded` log |
| `add_bonus_pts(user, points)` | Referral contract | Validate caller → add points → update sorted top players → emit `PointsAwarded` log. **Does NOT modify won_bets or lost_bets** |
| `record_bet(user)` | Market contract | Increment total_bets for user |
| `get_points(user) → u64` | View | Return points |
| `get_stats(user) → PlayerStats` | View | Return PlayerStats { points, total_bets, won_bets, lost_bets } |
| `get_top_players(limit) → Vec<PlayerEntry>` | View | Return top N from sorted list, each entry = { address, points } |
| `get_rank(user) → u32` | View | Return position in top players or 0 if unranked |

**Note:** The leaderboard stores points and stats by wallet identity. The frontend resolves display names by calling `ReferralRegistry.get_display_name(identity)` for each player. If a user has a registered display name, it is shown on the leaderboard; otherwise, the truncated wallet address is shown.

**Tests:**
- Add points and verify balance
- Accumulate points across multiple adds
- `add_bonus_pts` awards points without modifying won/lost counters
- Top players sorted correctly after inserts
- Top 50 cap — 51st player doesn't enter if below threshold
- Record bet increments counter
- Get stats returns correct aggregate
- Rank calculation

### Inter-Contract Call Flow (Complete)

```
USER PLACES A BET (2% fee deducted at bet time — split: 1.5% platform + 0.5% referrer)
───────────────────────────────────────────────────────────────────────────────────
User → PredictionMarket.place_bet(market_id, YES)     ← #[payable] — ETH forwarded with call
  │
  ├─ 1. msg_sender() identifies caller
  ├─ 2. Validate: market active, not expired, not cancelled
  ├─ 3. msg_amount() captures forwarded ETH (must be >= MIN_BET = 1 ETH)
  ├─ 4. msg_asset_id() validates it's the base asset (ETH)
  ├─ 5. If user has existing bet: validate is_yes matches (reject opposite-side bet)
  ├─ 6. Calculate: total_fee = amount × 200 / 10000
  │     platform_fee = amount × 150 / 10000
  │     referral_fee = total_fee - platform_fee
  │     net = amount - total_fee
  ├─ 7. Add platform_fee to accumulated_fees
  ├─ 8. abi(ReferralRegistry, referral_contract).credit(user, referral_fee)
  │     ├─ If user has custom referrer:
  │     │   ├─ transfer(referral_fee, base_asset, referrer)
  │     │   ├─ abi(Leaderboard).add_bonus_pts(referrer, 3)
  │     │   └─ Accumulate referrer earnings → return true
  │     └─ If no custom referrer:
  │         └─ Return false → caller adds referral_fee to accumulated_fees (full 2%)
  ├─ 9. abi(Leaderboard, leaderboard_contract).record_bet(user)
  ├─ 10. If new bet: store Bet (net amount), add to bettor index
  │      If existing bet: add net to existing Bet amount
  ├─ 11. Update Market totals with net amount
  └─ 12. log(BetPlaced { market_id, user, is_yes, amount, net_amount, fee })

  Fee flow summary:
  • User with custom referrer: 1.5% → accumulated_fees + 0.5% → referrer + 3 pts
  • User without referrer:     2.0% → accumulated_fees (platform keeps full 2%)
  • No additional fee at claim time. Admin can withdraw accumulated_fees.


ADMIN RESOLVES MARKET
─────────────────────
Admin → PredictionMarket.resolve_market(market_id, true)
  │
  ├─ 1. Validate: msg_sender() == admin
  ├─ 2. Validate: market exists, not resolved, not cancelled
  ├─ 3. Set resolved = true, outcome = true (YES wins)
  └─ 4. log(MarketResolved { market_id, outcome })


ADMIN CANCELS MARKET (event voided, mistake, etc.)
───────────────────────────────────────────────────
Admin → PredictionMarket.cancel_market(market_id)
  │
  ├─ 1. Validate: msg_sender() == admin
  ├─ 2. Validate: market exists, not resolved
  ├─ 3. Set cancelled = true
  ├─ 4. Iterate bettor index → refund each bettor's net amount
  │     └─ transfer(net_amount, base_asset_id, bettor_identity)
  └─ 5. log(MarketCancelled { market_id })

  Note: The 2% fee already collected at bet time is NOT refunded.
  Users get back their net bet amount. This prevents abuse of cancel to drain referral fees.


USER CLAIMS REWARDS (winner or loser)
─────────────────────────────────────
User → PredictionMarket.claim(market_id)
  │
  ├─ 1. Validate: msg_sender() is caller
  ├─ 2. Validate: market resolved, not cancelled, user has bet, not claimed
  ├─ 3. Determine: did user win or lose?
  │
  ├─ IF WINNER:
  │   ├─ Calculate payout = (user_net / winning_side_total) × total_pool
  │   │   (total_pool = all net bets from both sides — no additional fee)
  │   ├─ transfer(payout, base_asset_id, user)
  │   ├─ abi(Leaderboard).add_pts(user, 30, true)
  │   └─ abi(IPredictToken).mint(user, 10_000_000_000)   ← 9 decimals = 10 IPRED
  │
  ├─ IF LOSER:
  │   ├─ No ETH payout
  │   ├─ abi(Leaderboard).add_pts(user, 10, false)
  │   └─ abi(IPredictToken).mint(user, 2_000_000_000)    ← 9 decimals = 2 IPRED
  │
  ├─ 4. Mark bet as claimed
  └─ 5. log(RewardClaimed { market_id, user, payout, points, tokens })


USER REGISTERS FOR REFERRAL (optional but incentivized)
────────────────────────────────────────────────────────
User → ReferralRegistry.register_referral("CryptoKing", Some(referrer))
  │
  ├─ 1. msg_sender() identifies caller
  ├─ 2. Validate: not already registered, user != referrer
  ├─ 3. Store display name "CryptoKing"
  ├─ 4. If referrer provided: store referrer + increment referrer's count
  │     If no referrer:       no custom referrer stored (platform keeps full 2%)
  ├─ 5. abi(Leaderboard).add_bonus_pts(user, 5)          ← welcome bonus (no win/loss)
  ├─ 6. abi(IPredictToken).mint(user, 1_000_000_000)     ← 1 IPREDICT
  └─ 7. log(ReferralRegistered { user, display_name, referrer })
```

---

## Frontend — Next.js App Structure & Flow

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Fuel SDK | `fuels` v0.100.6 (auto-generated typed bindings via `npx fuels build`) |
| Wallet Integration | `@fuels/react` + `@fuels/connectors` (Fuel Wallet, Fuelet) |
| Icons | `react-icons` (Feather icons `fi` set — real SVG icons, no emoji characters) |
| Testing | Vitest + React Testing Library |
| Hosting | Vercel |

### Next.js App Router Pages

All page components are server components by default. Interactive components use `'use client'` directive.

#### `app/layout.tsx` — Root Layout

- Wraps entire app in `<Providers>` (FuelProvider, toast provider)
- Imports global CSS (`globals.css` with Tailwind)
- Sets metadata: title, description, Open Graph image (`og-image.png`)
- Contains `<Navbar />` (sticky with rounded bottom corners) and `<Footer />`
- Google Fonts: Inter (body) + Space Grotesk (headings)
- **React error boundaries** wrapping each major page section (market grid, betting panel, leaderboard table) — a failed contract call in one component doesn't crash the entire page. Each boundary renders a "Something went wrong — Retry" fallback card.

#### `app/providers.tsx` — Client Context Wrapper

- `'use client'` component
- Wraps children in `<FuelProvider>` from `@fuels/react`
- Configures `defaultConnectors` from `@fuels/connectors` (Fuel Wallet, Fuelet)
- Specifies Fuel testnet network URL via `networks` prop

#### `app/page.tsx` — Landing Page (`/`)

**Design reference: tipz-rosy.vercel.app landing page pattern**

**Sections in order:**

1. **Hero Section**
   - Bold headline: "Predict. Win or Lose — You Always Earn."
   - Subtitle: "Decentralized prediction market on Fuel. Sub-second finality. Parallel execution."
   - Two CTA buttons: "Explore Markets" (primary) → `/markets` | "View Leaderboard" (secondary) → `/leaderboard`
   - Live stats row (`<LiveStats />`): Total Markets | Total Volume (ETH) | Total Predictors | IPREDICT Minted
   - Badge: "Live on Fuel Testnet | Low 2% fee"

2. **Feature Cards (3-column grid)**
   - "Instant Settlement" — icon: `FiZap` — "Bets confirm in under a second via Fuel"
   - "Everyone Earns" — icon: `FiGift` — "Win: 30 pts + 10 IPRED. Lose: 10 pts + 2 IPRED"
   - "Fully Onchain" — icon: `FiShield` — "All bets, payouts, and rankings stored on Fuel VM"

3. **How It Works (numbered steps — tipz-style numbered cards)**
   - Step 01: "Connect Wallet" — Connect Fuel Wallet or Fuelet. No signup needed.
   - Step 02: "Pick a Market" — Browse active predictions. Crypto, sports, events.
   - Step 03: "Bet YES or NO" — Stake ETH on your prediction. See live odds.
   - Step 04: "Earn Rewards" — Win or lose, you earn points + IPREDICT tokens.

4. **Featured Markets (horizontal scroll or 3-card grid)** (`<FeaturedMarkets />`)
   - Pulls from `useMarkets()` hook — top 3 by volume or ending soonest
   - Each card: `<MarketCard />` with market image, question, odds bar, pool, countdown, "Bet Now"

5. **Top Creators / Leaderboard Preview** (`<LeaderboardPreview />`)
   - Shows top 3 players from `useLeaderboard()` hook
   - Medal icons (using `FiAward` or gold/silver/bronze colored badges)
   - "View All" link → `/leaderboard`

6. **Additional Features Grid (6-card, 2-column — tipz-style)**
   - "Onchain Referrals" — Share your link, earn 0.5% + 3 bonus points on every bet placed by your referrals
   - "Social Sharing" — Share your prediction on X, Telegram, WhatsApp with one tap
   - "Live Activity" — Real-time event feed of all bets and claims across markets
   - "IPREDICT Token" — Platform token earned by every participant, win or lose
   - "Non-Custodial" — Your keys, your funds. Smart contracts handle everything
   - "Mobile-First" — Full experience on mobile. Bet on the go

7. **Roadmap / Journey (tipz-style timeline)**
   - Feb 2026: Foundation — MVP launch, testnet, core markets
   - Q2 2026: Growth — User-created markets, oracle resolution, categories
   - Q3 2026: Token Utility — IPREDICT staking, governance, rewards tiers
   - Q4 2026: Scale — Mainnet launch, mobile app, cross-chain

8. **CTA Footer Section**
   - "Start Predicting Today" with connect wallet button
   - "No signup required. Just connect and bet."
   - Links to: Twitter, GitHub, Fuel Forum

#### `app/markets/page.tsx` — Market Browser (`/markets`)

- **Filter Tabs**: All | Active | Ending Soon | Resolved | Cancelled (using `<MarketFilters />`)
- **Search Bar**: keyword search by question text
- **Sort Dropdown**: Newest | Most Volume | Ending Soon | Most Bettors
- **Market Grid**: responsive grid of `<MarketCard />` components
- Each card shows: market image, question, odds bar, ETH pool, bet count, countdown, "Bet Now"
- Uses `useMarkets()` hook with filter/sort parameters
- Empty state with illustration when no markets match

#### `app/markets/[id]/page.tsx` — Market Detail (`/markets/:id`)

- **Market Header**: Large market image, question text, status badge (Active / Resolved YES / Resolved NO / Cancelled), countdown timer
- **Odds Bar**: Full-width animated bar showing YES% green / NO% red with labels
- **Betting Panel** (`<BettingPanel />`):
  - YES / NO toggle buttons (green / red)
  - If user has existing bet: side is locked to their current side, opposite side button disabled with tooltip "You already bet YES/NO on this market"
  - If user has existing bet: show current position above input: "Your current bet: X.XX ETH on YES"
  - Amount input field with quick buttons: [0.1] [0.5] [1] [5] [10] [MAX]
  - Live payout calculator: "If you win: X.XX ETH (+YY% profit)" (includes existing + new amount)
  - Reward preview: "You'll earn: 30 pts + 10 IPRED (win) or 10 pts + 2 IPRED (lose)"
  - Wallet balance display
  - "Place Bet" / "Increase Position" submit button (label changes if user has existing bet)
  - After bet: `<ShareBetButton />` — inline dropdown popover for sharing on X / Telegram / WhatsApp
- **Market Stats Row**: Total Pool | YES Pool | NO Pool | Bettors | Your Bet (amount + side, if any)
- **Claim Section** (shown when market resolved + user has bet):
  - Outcome display: "You predicted YES — You won!" or "You predicted NO — You lost"
  - Reward breakdown: ETH payout (if winner) + points + IPREDICT tokens
  - "Claim Rewards" button → calls `useClaim()` hook
- **Activity Feed**: Recent bets on this market, pulled from Fuel logs via `useEvents()`
- Uses `useMarket(id)` hook for market data

#### `app/leaderboard/page.tsx` — Leaderboard (`/leaderboard`)

**Design reference: tipz-rosy.vercel.app/leaderboard pattern**

- **Header**: "Leaderboard" headline + "Rankings update in real-time" subtitle + Live badge
- **Tabs** (pill-style like tipz):
  - "Top Predictors" — by points (default)
  - "Most Active" — by total bets placed
  - "Top Referrers" — by referral count
- **Table** (`<LeaderboardTable />`):
  - Columns: Rank | Player (display name or truncated wallet, linked to Fuel Explorer) | Points | Bets | Won | Win Rate
  - Top 3: gold/silver/bronze medal badges (using `FiAward` with color)
  - Rows: `<PlayerRow />` component per entry
  - "Your Rank" card pinned at top when wallet is connected
- Uses `useLeaderboard()` hook
- Shows top 50 players from onchain data

#### `app/profile/page.tsx` — User Profile (`/profile`)

- **Requires wallet connected** — shows connect prompt if not
- **Stats Overview Cards Row**:
  - Total Points + Rank
  - IPREDICT Token Balance
  - Total Bets (won / lost / pending)
  - Referral Earnings (ETH)
- **Bet History Tab** (`<BetHistory />`):
  - Table: Market | Your Bet | Amount | Outcome | Payout | Points | Status
  - Claimable rows highlighted with "Claim" button
- **Referral Section** (`<ReferralStats />`):
  - Registration form: display name input + optional referrer address
  - "Register & Earn 5 pts + 1 IPREDICT" CTA button
  - After registration: unique referral link `https://ipredict-fuel.vercel.app/?ref=0xAbCd...`
  - Copy-to-clipboard button
  - Referral count + total earnings display
  - Note: "Registration is optional. Share your link — if they register you, you earn 0.5% + 3 points on all their bets"
- Uses `useProfile()` + `useReferral()` + `useToken()` hooks

#### `app/admin/page.tsx` — Admin Dashboard (`/admin`)

- **Gated**: Only renders full UI if connected wallet === admin address from config
- **Create Market Form** (`<CreateMarketForm />`):
  - Question text input
  - Market image upload or URL input (stored as image_url string in contract)
  - Duration picker (hours/days)
  - "Create Market" submit
- **Pending Resolutions** (`<ResolveMarketPanel />`):
  - List of markets past deadline but not resolved
  - Each row: question, end time, totals, "Resolve YES" / "Resolve NO" buttons
- **Platform Stats** (`<PlatformStats />`):
  - **Accumulated platform fees** (fetched from `PredictionMarket.get_accumulated_fees()`) with **"Withdraw Fees"** button → calls `withdraw_fees()`
  - Total referral fees credited to referrers (from `ReferralRegistry` earnings)
  - Total markets created (active / resolved / cancelled)
  - Total volume
  - Revenue breakdown: 1.5% from every bet + additional 0.5% from unregistered users (full 2%)

---

### Components Breakdown

#### Layout Components (`components/layout/`)

**`Navbar.tsx`** — `'use client'`
- Sticky top with `position: sticky`, slight shadow on scroll
- **Rounded bottom corners** (Tailwind: `rounded-b-2xl` or custom `border-radius: 0 0 16px 16px`)
- Logo "iPredict" on left (text logo, styled with Space Grotesk font)
- Nav links center: Home | Markets | Leaderboard
- Right side: `<WalletConnect />` button
- Mobile: hamburger icon → `<MobileMenu />` slide-in panel
- Active link highlight (purple underline or background pill)

**`Footer.tsx`**
- 4-column grid: Product links, Resources, Legal, Social
- Copyright line
- Fuel Network attribution

**`MobileMenu.tsx`** — `'use client'`
- Full-screen overlay menu for mobile
- Same nav links + wallet connect
- Smooth slide-in animation

#### Market Components (`components/market/`)

**`MarketCard.tsx`** — Card for market grid
- Market image thumbnail (`<MarketImage />`)
- Question text (truncated to 2 lines)
- `<OddsBar />` — animated YES/NO percentage bar
- Pool amount in ETH + bet count
- `<CountdownTimer />` — time remaining
- "Bet Now" link to `/markets/[id]`

**`MarketGrid.tsx`** — Responsive grid container
- CSS Grid: 3 columns desktop, 2 tablet, 1 mobile
- Renders array of `<MarketCard />` components

**`MarketFilters.tsx`** — Filter tabs + search + sort
- Pill-style tab buttons: All | Active | Ending Soon | Resolved | Cancelled
- Search input with `FiSearch` icon
- Sort dropdown with `FiChevronDown`

**`BettingPanel.tsx`** — `'use client'` — Main betting interface
- YES / NO toggle buttons with active glow (green / red)
- Amount input with validation (min 0.000000001 ETH, max wallet balance)
- Quick amount buttons: [0.1] [0.5] [1] [5] [10] [MAX]
- Live payout calculation (recalculates on amount or side change)
- Reward preview showing both win and lose outcomes
- Submit button → calls `useBet()` hook
- Transaction progress: `<TxProgress />` (building → signing → submitting → confirmed)
- On success: show `<ShareBetButton />` for social sharing
- Disabled states: wallet not connected, market not active, opposite side when user has existing bet

**`OddsBar.tsx`** — Visual YES/NO split
- Single horizontal bar, green left (YES), red right (NO)
- Percentages labeled on each side
- Smooth CSS transition on updates (300ms ease)
- If no bets: show 50/50 gray

**`CountdownTimer.tsx`** — `'use client'`
- Shows "2d 14h 32m" format for active markets
- Shows "Ended" for expired markets
- Uses `setInterval` to tick every minute (switches to every second when < 1 hour remaining)
- Red text when < 1 hour remaining

**`MarketImage.tsx`** — Market cover image
- Shows market image from `image_url` or falls back to `/images/markets/default-market.png`
- Rounded corners, object-cover fit
- Lazy loaded with `next/image`

#### Leaderboard Components (`components/leaderboard/`)

**`LeaderboardTable.tsx`** — Full ranking table
- Responsive table with scroll on mobile
- Header: Rank | Player | Points | Bets | Won | Win Rate
- Renders `<PlayerRow />` for each entry
- "Your Rank" pinned card at top

**`LeaderboardTabs.tsx`** — Tab switcher
- Pill-style tabs matching tipz design
- "Top Predictors" | "Most Active" | "Top Referrers"
- Purple active indicator

**`PlayerRow.tsx`** — Single leaderboard row
- Rank number (1,2,3 get medal badge)
- Wallet address truncated OR display name shown (linked to Fuel Explorer `app.fuel.network`)
- Points, bets, won count, win rate %
- Highlight row if current user

#### Profile Components (`components/profile/`)

**`BetHistory.tsx`** — Table of user's bets across all markets
**`PointsCard.tsx`** — Points total + rank display card
**`TokenBalance.tsx`** — IPREDICT balance display
**`ReferralStats.tsx`** — Referral link + count + earnings

#### Social Components (`components/social/`)

**`ShareBetButton.tsx`** — `'use client'`
- Inline dropdown popover (no modal) — toggles open/closed on click
- Uses `useRef` for click-outside detection to auto-close
- Share options with real icons positioned as absolute dropdown above the button:
  - X (Twitter): `FiTwitter` → opens `buildTwitterShareUrl(text, url)`
  - Telegram: custom Telegram icon → opens `buildTelegramShareUrl(text, url)`
  - WhatsApp: custom WhatsApp icon → opens `buildWhatsAppShareUrl(text, url)`
  - Copy Link: `FiCopy` → copies market URL to clipboard
- Pre-filled text: "I just bet {amount} ETH that {question} on iPredict! 👉 {url}"
- Auto-includes referral param in URL: `?ref={walletAddress}`

#### Wallet Components (`components/wallet/`)

**`WalletConnect.tsx`** — `'use client'`
- Uses `@fuels/react` hooks directly: `useConnectUI`, `useAccount`, `useDisconnect`, `useIsConnected`
- Shows "Connect Wallet" when disconnected → calls `connect()` from `useConnectUI` (opens Fuel Wallet / Fuelet connector dialog)
- Shows truncated `0x` address + disconnect option when connected
- No separate modal component needed — `@fuels/react` handles the connector selection UI

#### Admin Components (`components/admin/`)

**`CreateMarketForm.tsx`** — Market creation form
**`ResolveMarketPanel.tsx`** — Resolve expired markets
**`PlatformStats.tsx`** — Platform fee display + withdraw

#### UI Components (`components/ui/`)

**`Spinner.tsx`** — CSS spinner animation
**`Skeleton.tsx`** — Loading placeholder with shimmer
**`TxProgress.tsx`** — Multi-step transaction tracker (Building → Signing → Submitting → Confirmed/Failed)
**`Toast.tsx`** — Success/error toast notification with auto-dismiss
**`Badge.tsx`** — Status badges (Active, Resolved, Cancelled, Won, Lost)
**`ErrorBoundary.tsx`** — React error boundary wrapper with "Something went wrong — Retry" fallback
**`EmptyState.tsx`** — Empty state illustration + message

---

### Hooks — Data & Action Patterns

All hooks in `hooks/` follow the `'use client'` pattern. Wallet access comes from `@fuels/react` hooks (`useWallet`, `useAccount`, `useIsConnected`).

#### Data Fetching Hooks (return `{ data, loading, error, refetch }`)

| Hook | Purpose | Service |
|------|---------|---------|
| `useMarkets(filter?, sort?)` | Fetch all markets with optional filter/sort | `services/market.ts` |
| `useMarket(id)` | Fetch single market + user's bet on it | `services/market.ts` |
| `useLeaderboard(tab)` | Fetch top 50 + user rank | `services/leaderboard.ts` |
| `useToken()` | Fetch IPREDICT balance + token info | `services/token.ts` |
| `useProfile()` | Aggregate: bets, points, rank, earnings | Multiple services |
| `useReferral()` | Referral link, count, earnings | `services/referral.ts` |

#### Action Hooks (return `{ submit, result, loading, error, reset }`)

| Hook | Purpose | Service |
|------|---------|---------|
| `useBet()` | Place a bet (build contract call, sign via wallet, submit) | `services/market.ts` |
| `useClaim()` | Claim rewards on resolved market | `services/market.ts` |

#### Wallet Access

Wallet state is accessed via `@fuels/react` hooks — no custom `useWallet` context needed:

| Hook (from `@fuels/react`) | Purpose |
|------|---------|
| `useWallet()` | Get connected `Wallet` instance for signing transactions |
| `useAccount()` | Get connected account address (string) |
| `useIsConnected()` | Check connection status (boolean) |
| `useConnectUI()` | Trigger wallet connector dialog |
| `useDisconnect()` | Disconnect wallet |

---

### Services — Contract Interaction Layer

Each service file handles all Fuel contract interactions for one contract:

- Read-only calls: use `.get()` (dry-run simulation) → parse result → cache
- Write calls: use `.call()` (auto-signs via connected wallet) → invalidate cache → return result
- Payable calls: use `.callParams({ forward: { amount, assetId } })` before `.call()`
- Contract instances created via auto-generated factory classes from `sway-api/`
- Error classification into `AppError` with types: `NETWORK`, `WALLET`, `CONTRACT`, `VALIDATION`

| File | Contract | Key Functions |
|------|----------|---------------|
| `fuel.ts` | — | `getProvider()`, `getMarketContract(wallet?)`, `getTokenContract(wallet?)`, `getReferralContract(wallet?)`, `getLeaderboardContract(wallet?)`, `addressIdentity()`, `extractAddress()`, `bnToNumber()` |
| `market.ts` | PredictionMarket | `createMarket()`, `placeBet()`, `resolveMarket()`, `cancelMarket()`, `claim()`, `getMarket()`, `getMarkets()`, `getBet()`, `getOdds()` |
| `token.ts` | IPredictToken | `getBalance()`, `getTokenInfo()`, `getTotalSupply()` |
| `referral.ts` | ReferralRegistry | `registerReferral()`, `getReferrer()`, `getReferralCount()`, `getEarnings()`, `hasReferrer()` |
| `leaderboard.ts` | Leaderboard | `getTopPlayers()`, `getStats()`, `getPoints()`, `getRank()` |
| `events.ts` | — | `pollMarketEvents()` — parses BetPlaced, MarketResolved, RewardClaimed logs from Fuel receipts |
| `cache.ts` | — | Same TTL localStorage cache: `get<T>()`, `set<T>()`, `invalidate()`, `invalidateAll()` with `ip_` prefix |

---

### Config — `config/network.ts`

```
Exports:
- FUEL_PROVIDER_URL — Fuel testnet RPC endpoint (e.g., "https://testnet.fuel.network/v1/graphql")
- MARKET_CONTRACT_ID — deployed PredictionMarket contract ID (0x...)
- TOKEN_CONTRACT_ID — deployed IPredictToken contract ID (0x...)
- REFERRAL_CONTRACT_ID — deployed ReferralRegistry contract ID (0x...)
- LEADERBOARD_CONTRACT_ID — deployed Leaderboard contract ID (0x...)
- ADMIN_ADDRESS — admin wallet address (0x...)
- TOTAL_FEE_BPS — 200 (total 2% fee deducted at bet time)
- PLATFORM_FEE_BPS — 150 (1.5% kept by platform in accumulated_fees)
- REFERRAL_FEE_BPS — 50 (0.5% sent to referrer if user has one; otherwise added to platform fees)
- REFERRAL_BET_POINTS — 3 (bonus points referrer earns per referred bet)
- WIN_POINTS — 30
- LOSE_POINTS — 10
- WIN_TOKENS — 10
- LOSE_TOKENS — 2
- REGISTER_BONUS_POINTS — 5
- REGISTER_BONUS_TOKENS — 1
```

### Types — `types/index.ts`

```
Interfaces/Enums:
- Market — { id, question, imageUrl, endTime, totalYes, totalNo, resolved, outcome, cancelled, creator, betCount }
- Bet — { amount, isYes, claimed }
- PlayerStats — { address, displayName, points, totalBets, wonBets, lostBets, winRate }
- TokenInfo — { name, symbol, decimals, totalSupply }
- ReferralInfo — { referrer, displayName, referralCount, earnings, isRegistered }
- MarketFilter — 'all' | 'active' | 'ending_soon' | 'resolved' | 'cancelled'
- MarketSort — 'newest' | 'volume' | 'ending_soon' | 'bettors'
- TransactionResult — { success, transactionId?, error? }
- AppErrorType — enum (NETWORK, WALLET, CONTRACT, VALIDATION)
- AppError — { type, message, details? }
- MarketEvent — { type, user, marketId, amount?, timestamp, txHash }
```

### Utils

**`utils/helpers.ts`** — Pure utility functions:
- `formatETH(baseUnits: number): string` — Convert 9-decimal base units to ETH display (e.g., "1.23 ETH")
- `truncateAddress(addr: string): string` — "0xAbCd...7x2F"
- `isValidAmount(amount: string, balance: number): boolean`
- `timeUntil(timestamp: number): string` — "2d 14h 32m"
- `formatDate(timestamp: number): string`
- `calculatePayout(userNetBet, winningSideTotal, totalPool): number`
- `calculateOdds(totalYes, totalNo): { yesPercent, noPercent }`
- `bpsToPercent(bps: number): string`
- `explorerUrl(type: 'tx' | 'account' | 'contract', id: string): string` — links to `app.fuel.network`

**`utils/share.ts`** — Social sharing URL builders:
- `buildTwitterShareUrl(text, url): string`
- `buildTelegramShareUrl(text, url): string`
- `buildWhatsAppShareUrl(text, url): string`
- `buildShareText(question, amount, side, marketUrl, referralAddress?): string`

---

## Testing Strategy

### Contract Tests (Rust SDK Integration Tests)

Written in `tests/harness.rs` alongside each contract. Run via `forc test` or `cargo test` in each contract directory.

Each test file:
1. Deploys the contract(s) to a local `fuel-core` in-memory node
2. Creates test wallets with funded balances
3. Interacts with contracts via the generated Rust SDK bindings
4. Asserts state changes, event logs, and error conditions

| Contract | Target Tests |
|----------|-------------|
| prediction_market | 20+ tests (initialize, create, bet, increase position, reject opposite-side, resolve, cancel + refund, claim winner, claim loser, edge cases) |
| ipredict_token | 11+ tests (initialize, multi-minter, mint, transfer, burn, auth) |
| referral_registry | 7+ tests (register, credit, self-referral rejection, no-referrer credit) |
| leaderboard | 8+ tests (add points, bonus points, record bet, top players sorted, rank) |
| **Total** | **46+ contract tests** |

### Frontend Tests (Vitest + React Testing Library)

Written in `__tests__/`. Run via `npm test`.

| Test File | What It Covers |
|-----------|---------------|
| `helpers.test.ts` | formatETH, truncateAddress, timeUntil, calculatePayout, calculateOdds (20+ tests) |
| `cache.test.ts` | TTL cache CRUD operations (7 tests) |
| `market.test.ts` | Market service mock tests — mocks `@/services/fuel` contract factories (5 tests) |
| `leaderboard.test.ts` | Leaderboard data parsing — mocks Fuel contract `.get()` calls (3 tests) |
| `Navbar.test.tsx` | Renders nav links, wallet button — mocks `@fuels/react` hooks |
| `MarketCard.test.tsx` | Renders question, odds bar, countdown, pool amount |
| `BettingPanel.test.tsx` | Amount input, validation, quick buttons, payout calc |
| `LeaderboardTable.test.tsx` | Renders rows, medals, user highlight |
| `WalletConnect.test.tsx` | Connect/disconnect states — mocks `useConnectUI`, `useAccount`, `useIsConnected`, `useDisconnect` |
| **Total** | **45+ frontend tests** |

---

## CI/CD — `.github/workflows/ci.yml`

Two jobs:

**Job 1: `lint-test-build`** (Frontend)
- Triggers on push to `main`/`develop` and PRs to `main`
- Strategy matrix: Node 20
- Steps: checkout → setup-node (cache npm) → install fuelup → `npx fuels build` (generate typed bindings) → `cd frontend && npm ci` → `npm test` → `npm run build`
- Upload build artifact

**Job 2: `contract-check`** (Smart Contracts)
- Install fuelup toolchain (`fuelup-init`, `fuelup toolchain install latest`)
- Start `fuel-core run --db-type in-memory` as background process
- Steps: checkout → `forc build` (compile all contracts) → `forc test` (run all harness.rs integration tests against local node)
- Verifies all contracts compile and pass tests

Vercel auto-deploys from GitHub integration on push to `main` (no deploy job needed).

---

## Docs Folder

### `docs/ARCHITECTURE.md`
- System diagram of 4 contracts + shared library + frontend
- Inter-contract call flow explanation (Sway `abi()` pattern)
- Data flow for bet → resolve → claim cycle
- Storage layout per contract (flattened StorageMap pattern)

### `docs/USER-FEEDBACK.md`
- Template for documenting feedback from 5+ testnet users
- Format: User wallet address | Feedback | Date | Action taken
- Required for Level 5 submission
- Space for iteration notes: what changed based on feedback

### `docs/DEPLOYMENT-GUIDE.md`
- Step-by-step contract deployment using `forc deploy`:
  - Admin wallet: **private key stored in env var — NEVER commit to repo**
  - Public address: `0x...` (admin identity)
- Contract build, deploy, initialize, link commands (`forc deploy --testnet`)
- Frontend `.env.local` setup with deployed contract IDs
- Vercel deployment config
- Seed market creation commands via `fuels` CLI or script

### `docs/ITERATION-LOG.md`
- Changelog documenting each improvement iteration
- Before/after for user-feedback-driven changes
- Commit references for each iteration

---

## README.md — Submission Checklist Structure

The root `README.md` should contain these sections for Level 5 validation:

```
1. Title + badges (CI, Fuel-Sway, License)
2. One-line description
3. Live Demo link (Vercel deployment URL)
4. Demo Video link (Loom or YouTube — showing full MVP flow)
5. Screenshots (landing, markets, betting, leaderboard, profile)
6. Features list
7. Architecture (4-contract diagram + shared library + inter-contract flow)
8. Reward System (win/lose table + payout formula)
9. Tech Stack table
10. Project Structure (folder tree)
11. Getting Started (prerequisites: fuelup, Node.js, Fuel Wallet extension)
12. Deployed Contracts (table: contract name | contract ID | Fuel Explorer link)
13. Testing (test count summary table)
14. CI/CD Pipeline explanation
15. User Validation (required):
    - 5+ real testnet user wallet addresses (verifiable on Fuel Explorer)
    - Link to USER-FEEDBACK.md
    - Summary of 1 iteration completed based on feedback
16. Smart Contract function listings per contract
17. Roadmap
18. License (MIT)
19. Author attribution
```

---

## Deployment Order

1. **Build all contracts** → `forc build` (in `contracts/` directory)
2. **Deploy IPREDICT Token** first (no dependencies)
3. **Deploy Leaderboard** (no dependencies)
4. **Deploy ReferralRegistry** (depends on token + leaderboard for welcome bonus)
5. **Deploy PredictionMarket** last (depends on all 3)
6. **Initialize PredictionMarket** with all 3 linked contract IDs
7. **Initialize IPredictToken** → `set_minter(prediction_market_id)` + `set_minter(referral_registry_id)` (both need to mint)
8. **Initialize ReferralRegistry** → pass market contract + token contract + leaderboard contract
9. **Initialize Leaderboard** → pass market contract + referral contract as authorized callers
10. **Create seed markets** (10 markets with images)
11. **Generate frontend bindings** → `npx fuels build`
12. **Deploy frontend** to Vercel with contract IDs in `.env.local`

All deployments use:
- **fuelup** toolchain for `forc deploy --testnet`
- Admin wallet funded via Fuel testnet faucet

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router** | SEO for landing page, file-based routing, server components for static content |
| **Tailwind CSS** | Utility-first, fast iteration, responsive out of the box |
| **Fuel Network** | Sub-second finality, parallel execution (UTXO model), Sway language with native asset support |
| **4 separate contracts + shared library** | Single responsibility, independently testable. Shared `libraries/` crate contains all types, constants, ABIs, and error enums |
| **Sway language** | Rust-inspired with blockchain-specific features: `storage`, `#[payable]`, `msg_sender()`, `msg_amount()`, native asset forwarding |
| **Flattened StorageMap pattern** | Avoids nested struct storage limitations in Sway — individual fields keyed by ID |
| **Referral is optional** | Users can bet without registering — but registering gives 5 pts + 1 IPREDICT welcome bonus |
| **Display names on leaderboard** | Registered users show their chosen name instead of raw wallet address |
| **Fee split: 1.5% platform + 0.5% referrer** | Platform always keeps at least 1.5%. Referrers earn 0.5% + 3 pts per referred bet. Unregistered users (no referrer) → platform keeps full 2%. Sustainable revenue regardless of referral adoption |
| **Both winners and losers earn** | Keeps engagement high, encourages repeat use even after losses |
| **`@fuels/react` for wallet** | No custom wallet modal needed — `useConnectUI` opens the standard Fuel connector dialog. Supports Fuel Wallet and Fuelet out of the box |
| **Inline dropdown for social sharing** | Simple `ShareBetButton` with click-outside detection, no portal-based modal needed |
| **`react-icons/fi`** Feather icons | Real SVG icons, not emoji or character icons |
| **Market images** | Visual appeal, stored as URL in contract, served from `/public/images/markets/` |
| **Social sharing post-bet** | Viral loop: bet → share → friend sees → bets → referral earning |
| **Sticky navbar with rounded bottom** | Modern design pattern from tipz reference |
| **Cache with `ip_` prefix** | Avoid clashing with other apps in localStorage |
| **Single 2% fee at bet time** | Fee deducted once on `place_bet`: 1.5% to `accumulated_fees` + 0.5% to referrer (or full 2% to platform if no referrer). Admin withdraws via `withdraw_fees()`. No fee at claim time |
| **Indexed bettors (not Vec storage)** | Individual `StorageMap` entries keyed by index avoid unbounded storage growth |
| **Cancel market with refund** | Admin can cancel markets for voided events — refunds net bet amounts, protects users |
| **Increase position, one side only** | Users can add to their bet on the same side but cannot bet both sides — prevents hedging |
| **Multi-minter token via map** | `authorized_minters(ContractId) → bool` supports both PredictionMarket and ReferralRegistry as minters |
| **`add_bonus_pts` separate from win/loss** | Welcome bonus points don't inflate win/loss stats — new users start with clean records |
| **Error boundaries per section** | React error boundaries around market grid, betting panel, leaderboard — one failure doesn't crash the whole app |
| **9 decimal precision** | Fuel's native asset (ETH) uses 9 decimals. IPREDICT token also uses 9 decimals for consistency |
| **Auto-generated typed bindings** | `npx fuels build` generates TypeScript contract classes from Sway ABI — full type safety, no manual ABI encoding |

---

*This document defines the complete structure and flow for iPredict on Fuel Network. Implementation follows these patterns exactly.*
