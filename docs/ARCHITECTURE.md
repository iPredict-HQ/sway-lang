# iPredict — Architecture

## System Overview

iPredict is a decentralized prediction market built on Fuel Network with Sway smart contracts and a Next.js 14 frontend.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Pages    │  │  Hooks   │  │  Services    │  │  @fuels/react │  │
│  │  (7 routes)│ │  (9 hooks)│ │  (7 modules) │  │  (Fuel Wallet │  │
│  └──────────┘  └──────────┘  └──────┬───────┘  │  Fuelet)      │  │
│                                     │           └───────┬───────┘  │
└─────────────────────────────────────┼───────────────────┼──────────┘
                                      │ Fuel GraphQL      │ Sign TX
                                      ▼                   ▼
┌─────────────────────────── Fuel Testnet ────────────────────────────┐
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               PredictionMarket Contract                     │    │
│  │  create_market · place_bet · resolve_market · cancel_market │    │
│  │  claim · get_market · get_odds · withdraw_fees              │    │
│  │                                                             │    │
│  │  Calls ──►  IPredictToken.mint()                           │    │
│  │  Calls ──►  Leaderboard.add_pts() / record_bet()           │    │
│  │  Calls ──►  ReferralRegistry.credit()                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                 │                    │                   │
│           ▼                 ▼                    ▼                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐     │
│  │ IPredictToken│  │ Leaderboard  │  │  ReferralRegistry     │     │
│  │  (SRC-20)    │  │              │  │                       │     │
│  │  mint·burn   │  │  add_pts     │  │  register_referral    │     │
│  │  transfer    │  │  record_bet  │  │  credit (fee split)   │     │
│  │  balance     │  │  get_top     │  │  get_display_name     │     │
│  │  set_minter  │  │  get_stats   │  │                       │     │
│  └──────────────┘  └──────────────┘  └───────────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Shared Library (libraries/)               │    │
│  │  Types: Market, Bet, Odds, PlayerStats, PlayerEntry         │    │
│  │  Constants: fees, rewards, limits                           │    │
│  │  Errors: MarketError, TokenError, ReferralError, etc.       │    │
│  │  ABIs: IPredictToken, Leaderboard, ReferralRegistry         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Inter-Contract Call Flow

### User Places a Bet (2% fee)

```
User → PredictionMarket.place_bet(market_id, YES)    ← #[payable] — ETH forwarded
  │
  ├─ 1. Validate: market active, side matches existing bet (if any)
  ├─ 2. msg_amount() captures forwarded ETH (must be >= MIN_BET = 1 ETH)
  ├─ 3. msg_asset_id() validates it's the base asset (ETH)
  ├─ 4. Deduct 2% fee:
  │     ├─ abi(ReferralRegistry).has_referrer(user)
  │     │   ├── YES: 1.5% → accumulated_fees, 0.5% → referrer
  │     │   │   └─ abi(ReferralRegistry).credit(user, referral_fee)
  │     │   │        ├─ transfer(referral_fee, base_asset, referrer)
  │     │   │        ├─ abi(Leaderboard).add_bonus_pts(referrer, 3)
  │     │   │        └─ log(ReferralCredited)
  │     │   └── NO:  2% → accumulated_fees (platform keeps full 2%)
  │     └─ Net bet added to YES pool
  ├─ 5. abi(Leaderboard).record_bet(user) → increment bet counter
  ├─ 6. Update bettor index for the market
  └─ 7. log(BetPlaced { market_id, user, is_yes, amount, net_amount, fee })
```

### Admin Resolves Market

```
Admin → PredictionMarket.resolve_market(market_id, true)
  │
  ├─ 1. Validate: msg_sender() == admin
  ├─ 2. Set resolved = true, outcome = true (YES wins)
  ├─ 3. No funds move yet (payouts happen at claim time)
  └─ 4. log(MarketResolved { market_id, outcome })
```

### User Claims Rewards

```
User → PredictionMarket.claim(market_id)
  │
  ├─ WINNER (bet matches outcome):
  │   ├─ 1. Calculate payout: (user_net / winning_total) × total_pool
  │   ├─ 2. transfer(payout, base_asset_id, user)
  │   ├─ 3. abi(Leaderboard).add_pts(user, 30, true) — WIN_POINTS
  │   ├─ 4. abi(IPredictToken).mint(user, 10_000_000_000) — 10 IPRED (9 dec)
  │   └─ 5. log(RewardClaimed)
  │
  ├─ LOSER (bet doesn't match outcome):
  │   ├─ 1. No ETH payout
  │   ├─ 2. abi(Leaderboard).add_pts(user, 10, false) — LOSE_POINTS
  │   ├─ 3. abi(IPredictToken).mint(user, 2_000_000_000) — 2 IPRED (9 dec)
  │   └─ 4. log(RewardClaimed)
  │
  └─ CANCELLED:
      ├─ 1. Refund net bet amount via transfer()
      └─ 2. log(MarketCancelled)
```

### User Registers for Referral (Optional)

```
User → ReferralRegistry.register_referral("CryptoKing", Some(referrer))
  │
  ├─ 1. Store display name
  ├─ 2. Link referrer (if provided and valid, no self-referral)
  ├─ 3. abi(Leaderboard).add_bonus_pts(user, 5) — welcome bonus
  ├─ 4. abi(IPredictToken).mint(user, 1_000_000_000) — 1 IPRED welcome token
  └─ 5. log(ReferralRegistered { user, display_name, referrer })
```

## Data Flow Summary

### Storage Layout

| Contract | Key Storage Items |
|----------|-------------------|
| **PredictionMarket** | `market_count`, `market_*` StorageMaps (question, end_time, total_yes, total_no, resolved, outcome, cancelled, creator, bet_count), `bet_*` StorageMaps (amount, is_yes, claimed, exists), `accumulated_fees` |
| **IPredictToken** | `admin`, `authorized_minters` StorageMap<ContractId, bool>, `balances` StorageMap<Identity, u64>, `total_supply`, `name`/`symbol`/`decimals` |
| **Leaderboard** | `points` StorageMap, `total_bets`/`won_bets`/`lost_bets` StorageMaps, `top_player_count`, `top_player_address`/`top_player_points` StorageMaps (sorted by points descending, max 50) |
| **ReferralRegistry** | `display_name` StorageMap<Identity, StorageString>, `referrer` StorageMap, `referral_count`/`referral_earnings` StorageMaps, `registered` StorageMap, linked contract IDs |

### Fee Model

| Source | Platform (accumulated_fees) | Referrer | Total |
|--------|---------------------------|----------|-------|
| User has referrer | 1.5% (150 BPS) | 0.5% (50 BPS) | 2.0% |
| User has no referrer | 2.0% (200 BPS) | 0% | 2.0% |

### Reward Model

| Outcome | Points | IPREDICT Tokens | ETH Payout |
|---------|--------|-----------------|------------|
| Win | +30 | +10 | proportional share of pool |
| Lose | +10 | +2 | none |
| Cancel | 0 | 0 | net bet refund |
| Register (referral) | +5 | +1 | — |
| Referrer per bet | +3 | 0 | +0.5% of referred bet |

## Frontend Architecture

```
Next.js 14 (App Router)
├── Server Components (pages, layout)
├── Client Components ('use client')
│   ├── Data hooks (useMarkets, useLeaderboard, etc.)
│   ├── Action hooks (useBet, useClaim)
│   └── Wallet via @fuels/react (useWallet, useAccount, useConnectUI)
├── Services Layer
│   ├── fuel.ts — Provider, contract factories, identity helpers
│   ├── market.ts — PredictionMarket calls (.get / .call / .callParams)
│   ├── token.ts — IPredictToken calls
│   ├── leaderboard.ts — Leaderboard calls
│   ├── referral.ts — ReferralRegistry calls
│   ├── events.ts — Fuel log/receipt polling
│   └── cache.ts — TTL localStorage cache (ip_ prefix)
├── sway-api/ — Auto-generated typed bindings (npx fuels build)
└── @fuels/react + @fuels/connectors (Fuel Wallet, Fuelet)
```

### Contract Interaction Patterns

```
READ (dry-run, no gas cost):
  const contract = getMarketContract();        // Provider-only, no wallet
  const { value } = await contract.functions
    .get_market(marketId)
    .get();                                     // .get() = simulate

WRITE (wallet signs, submits tx):
  const contract = getMarketContract(wallet);   // Wallet-connected
  const { value } = await contract.functions
    .resolve_market(marketId, outcome)
    .call();                                    // .call() = sign + submit

PAYABLE WRITE (forward ETH with call):
  const contract = getMarketContract(wallet);
  const baseAssetId = await wallet.provider.getBaseAssetId();
  const { value } = await contract.functions
    .place_bet(marketId, isYes)
    .callParams({ forward: { amount, assetId: baseAssetId } })
    .call();                                    // ETH forwarded to contract
```

### Error Handling Strategy

- **React Error Boundaries** wrap every major section (market grid, betting panel, leaderboard table, claim section)
- **Service-level errors** classified into `AppError` types: `NETWORK`, `WALLET`, `CONTRACT`, `VALIDATION`
- **Toast notifications** for transaction success/failure feedback
- **Graceful fallbacks** — failed contract calls return `null` / empty arrays instead of crashing
