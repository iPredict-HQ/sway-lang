# iPredict

**Predict. Win or Lose — You Always Earn.**

A decentralized prediction market on **Fuel Network** where users bet ETH on YES/NO outcomes, winners split the pool, and **every participant** earns points + IPREDICT tokens — whether they win or lose. Fully onchain referral system and leaderboard drive viral growth.

![CI/CD](https://github.com/Akanimoh12/iPredict/actions/workflows/ci.yml/badge.svg)
![Fuel](https://img.shields.io/badge/Fuel-Sway-00F58C?logo=fuel&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Overview

- Users bet ETH on YES/NO prediction markets
- Winners split the pool (minus 2% fee: 1.5% platform + 0.5% referrer)
- **All participants earn rewards** — winners AND losers
- IPREDICT token minted as reward via inter-contract calls
- Onchain referral system: register a display name + referrer, earn 0.5% + 3 bonus points on every bet your referrals place
- Referral registration bonus: 5 points + 1 IPREDICT token as welcome gift
- No referrer? Platform keeps the full 2% fee — sustainable revenue model
- Onchain leaderboard ranked by points — shows display names instead of wallet addresses
- Social sharing: share your bet on X, Telegram, WhatsApp after placing a bet

### Why Fuel Network?

- **Sub-second finality** — bets confirm nearly instantly
- **Parallel execution** — UTXO-based model enables high throughput
- **< $0.01 fees** — micro-bets of 0.001 ETH are practical
- **Sway smart contracts** — type-safe, purpose-built for the FuelVM
- **Native asset support** — ETH base asset + custom tokens via SRC-20/SRC-3

---

## Reward System

Every user who participates in a resolved market earns rewards, regardless of outcome. This keeps users engaged and coming back.

| Outcome | Points | IPREDICT Tokens |
|---------|--------|-----------------|
| **Win** (correct prediction) | **30 points** | **10 IPREDICT** |
| **Loss** (wrong prediction) | **10 points** | **2 IPREDICT** |
| **Referral Registration** | **5 points** | **1 IPREDICT** |

### Payout Formula (Winners Only)

```
Each Bet:     2% fee deducted at bet time
              → 1.5% kept by platform (AccumulatedFees)
              → 0.5% sent to referrer (+ 3 bonus pts)
              → If no referrer: full 2% kept by platform
Net Amount:   Amount - 2% fee (enters the pool)
Total Pool:   All net YES bets + All net NO bets
User Payout:  (User Net Bet / Winning Side Net Total) × Total Pool
```

> **Split fee model:** The 2% is collected once at bet time. **1.5% stays in the contract** as platform revenue (`AccumulatedFees`, withdrawable by admin). **0.5% goes to the user's referrer** (+ 3 bonus points per referred bet). If the user has **no referrer**, the full 2% stays as platform revenue. No additional fee at claim time.

### Worked Example

```
Market: "Will ETH hit $5,000 by Friday?"

Total bets placed: 8 ETH (before fee)
  → 2% fee deducted at bet time: 0.16 ETH total
  → Fee split: ~0.12 ETH platform (1.5%) + ~0.04 ETH to referrers (0.5%)
     (unregistered users' 0.5% also goes to platform → platform keeps more)
  → Net pool: 7.84 ETH (4.9 YES + 2.94 NO)

Outcome: YES wins ✅

Alice bet 0.5 ETH on YES (winner) — has referrer Bob:
  → Total fee: 0.01 ETH (2%)
     → 0.0075 ETH (1.5%) → AccumulatedFees (platform keeps)
     → 0.0025 ETH (0.5%) → sent to Bob (her referrer) + Bob earns 3 pts
  → Net bet: 0.49 ETH entered the YES pool
  → Payout: (0.49/4.9) × 7.84 = 0.784 ETH  (+56.8% profit)
  → Earns:  30 points + 10 IPREDICT tokens

Alice later increased her position with another 0.2 ETH on YES:
  → Total fee: 0.004 ETH (2%)
     → 0.003 ETH (1.5%) → platform  |  0.001 ETH (0.5%) → Bob + 3 pts
  → Additional net: 0.196 ETH added to her YES position (total: 0.686 ETH)
  → Total payout recalculated with her combined position

Dave bet 0.3 ETH on NO (loser) — has a referrer:
  → Total fee: 0.006 ETH (2%)
     → 0.0045 ETH (1.5%) → platform  |  0.0015 ETH (0.5%) → referrer + 3 pts
  → Net bet: 0.294 ETH entered the NO pool
  → Payout: 0 ETH (lost his bet)
  → Earns:  10 points + 2 IPREDICT tokens  ← still rewarded!

Dave tried to bet YES on the same market:
  → REJECTED — cannot bet on opposite side of existing position

Eve bet 0.2 ETH on YES, never registered (no referrer):
  → Total fee: 0.004 ETH (2%) → ALL stays as platform revenue
     → 0.003 ETH (1.5%) → AccumulatedFees
     → 0.001 ETH (0.5%) → also AccumulatedFees (no referrer → platform keeps full 2%)
  → Net bet: 0.196 ETH entered the YES pool
```

### Referral Registration Bonus

Users can optionally register a **display name** and a **referrer**. On registration they receive a **welcome bonus** of 5 points + 1 IPREDICT token. If no referrer is provided, the user has no custom referrer and the full 2% fee on their bets stays as platform revenue. Display names appear on the leaderboard instead of raw wallet addresses.

---

## Core Features

| Feature | Description |
|---------|-------------|
| **Prediction Markets** | Admin creates YES/NO markets with cover images and deadlines |
| **ETH Betting** | Users stake ETH on their prediction — ETH forwarded with the contract call. Can increase position on same side but cannot bet both sides |
| **Auto Payout** | Winners claim proportional share of the pool |
| **Points + Tokens for All** | Win = 30 pts + 10 IPREDICT, Lose = 10 pts + 2 IPREDICT |
| **IPREDICT Token** | SRC-20 platform token minted via inter-contract call on claim |
| **Onchain Leaderboard** | Top 50 ranked by points — shows display name if registered |
| **Referral with Display Name** | Register a display name + optional referrer, earn 5 pts + 1 IPREDICT welcome bonus |
| **Platform Fee: 1.5% guaranteed** | Platform always keeps at least 1.5% — full 2% when user has no referrer |
| **Social Sharing** | Share your bet on X, Telegram, WhatsApp with one tap after betting |
| **Market Browser** | Filter by active, ending soon, resolved, cancelled with search and sort |
| **Market Images** | Each market has a cover image for visual appeal |
| **Mobile-First Design** | Fully responsive with sticky rounded navbar |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Sway / Fuel VM |
| Shared Library | libraries/ crate with common types, constants, ABIs |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Wallet | Fuel Wallet, Fuelet via `@fuels/react` + `@fuels/connectors` |
| Fuel SDK | `fuels` (TypeScript SDK) |
| Icons | `react-icons` (Feather SVG set) |
| Hosting | Vercel |
| CI/CD | GitHub Actions |

---

## Smart Contract Architecture

Four Sway contracts connected via inter-contract calls, plus a shared library:

```
┌──────────────────────────────────────────┐
│            iPredict System               │
│                                          │
│  ┌──────────────────┐                    │
│  │ PredictionMarket │  (core logic)      │
│  └───────┬──────────┘                    │
│          │ inter-contract calls          │
│    ┌─────┼──────────┐                    │
│    ▼     ▼          ▼                    │
│  ┌─────┐ ┌────────┐ ┌──────────────┐    │
│  │Refer│ │Leader- │ │  IPREDICT    │    │
│  │ral  │ │board   │ │Token (SRC-20)│    │
│  └─────┘ └────────┘ └──────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  libraries/ (shared types/ABIs) │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### Inter-Contract Flow

```
place_bet(market_id, YES)  — user forwards ETH with the call
  ├─ Deduct 2% fee: (1.5% platform + 0.5% referrer)
  ├─ Keep net bet amount in contract balance
  ├─ Add 1.5% to AccumulatedFees (platform revenue)
  ├─ ReferralRegistry.credit{coins: referral_fee}(user)  ← inter-contract
  │   └─ If custom referrer: transfer() 0.5% ETH to referrer + 3 pts
  │   └─ If no referrer: returns false → market contract adds to AccumulatedFees
  ├─ If new bet: store bet (net amount); if existing same-side: add to position
  └─ Leaderboard.record_bet(user)           ← inter-contract

resolve_market(market_id, YES)
  └─ Mark market resolved onchain

cancel_market(market_id)  ← admin can cancel if event voided
  └─ Refund net bet amounts to all bettors via transfer()

claim(market_id)  ← called by ALL users (winners + losers)
  ├─ If winner: transfer() payout from total pool (no additional fee)
  ├─ Leaderboard.add_pts(user, 30 or 10)    ← inter-contract
  └─ IPredictToken.mint(user, 10 or 2)      ← inter-contract

register_referral("CryptoKing", referrer?)  ← optional but incentivized
  ├─ Store display name (shown on leaderboard)
  ├─ Assign referrer (if provided)
  ├─ Leaderboard.add_bonus_pts(user, 5)     ← inter-contract
  └─ IPredictToken.mint(user, 1)            ← inter-contract
```

---

## Frontend Pages

| Page | Purpose |
|------|---------|
| **Landing** | Hero, featured markets, how-it-works, stats |
| **Markets** | Browse/filter/search all markets |
| **Market Detail** | Bet panel, odds bar, countdown, activity feed |
| **Leaderboard** | Top 50 by points with win rates |
| **Profile** | Bet history, points, IPREDICT balance, referral link |
| **Admin** | Create markets, resolve outcomes, cancel markets, withdraw platform fees |

---

## Deployment

```bash
# Build contracts
cd contracts
forc build

# Deploy contracts to Fuel testnet
forc deploy --testnet --signing-key $ADMIN_SECRET

# Initialize with inter-contract links
# (use forc-wallet or a deployment script)

# Frontend
cd frontend
npm install && npx fuels build && npm run dev     # development
npm run build                                      # production → Vercel auto-deploys
```

---

## Roadmap

- **Feb 2026 (MVP):** Markets, betting, claim, IPREDICT token rewards, referrals, leaderboard
- **v2:** User-created markets, oracle auto-resolution, categories
- **v3:** IPREDICT governance staking, mobile app, cross-chain deposits
- **v4:** Mainnet launch with real ETH

---

## License

MIT

---

*Built on Fuel Network — Sway Smart Contracts + Next.js*
*Author: Akanimoh | 2026*
