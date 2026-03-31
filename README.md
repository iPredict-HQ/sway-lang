<p align="center">
  <img src="frontend/public/favicon.svg" width="64" height="64" alt="iPredict logo" />
</p>

<h1 align="center">iPredict — Prediction Market on Fuel Network</h1>

<p align="center">
  <a href="https://github.com/AkanEf);/ipredict-fuelnetwork/actions"><img src="https://img.shields.io/github/actions/workflow/status/AkanEf);/ipredict-fuelnetwork/ci.yml?branch=main&label=CI&logo=github" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Fuel-Sway-00F58C?logo=fuel&logoColor=white" alt="Fuel" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/tests-207%20passing-brightgreen" alt="Tests" />
</p>

> **Predict. Win or Lose — You Always Earn.** Decentralized prediction market on Fuel Network with near-zero fees and sub-second finality.

---

## Live Demo

**Frontend:** [https://ipredict-fuel.vercel.app](https://ipredict-fuel.vercel.app)

## Demo Video

🎬 [Watch Full MVP Flow on YouTube](https://www.youtube.com/@iPredict_HQ) — *Wallet connect → browse markets → place bet → view leaderboard → claim reward → referral flow*


## Features

- **Binary Prediction Markets** — Bet YES or NO on any question with ETH
- **Inclusive Reward System** — Both winners AND losers earn points + IPREDICT tokens
- **Onchain Referral Program** — Share your link, earn 0.5% of every referred bet + bonus points
- **Real-Time Leaderboard** — Rankings by points, volume, and win rate from onchain data
- **Social Sharing** — One-tap sharing to X, Telegram, WhatsApp after every bet
- **4 Independent Smart Contracts** — Single responsibility, independently testable
- **Near-Zero Fees** — Only 2% total (1.5% platform + 0.5% referrer)
- **Sub-Second Finality** — Instant settlement on Fuel Network
- **Mobile-First Design** — Fully responsive glassmorphic UI
- **Non-Custodial** — Your keys, your funds. Smart contracts handle everything

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 14 Frontend                        │
│  (App Router • Tailwind CSS • @fuels/react)                    │
└──────────────┬──────────────┬──────────────┬──────────────┬─────┘
               │              │              │              │
        Fuel GraphQL    Fuel GraphQL   Fuel GraphQL   Fuel GraphQL
               │              │              │              │
  ┌────────────▼──┐ ┌────────▼────┐ ┌───────▼──────┐ ┌────▼────────┐
  │  Prediction   │ │  IPREDICT   │ │   Referral   │ │ Leaderboard │
  │    Market     │ │    Token    │ │   Registry   │ │             │
  │               │ │ (SRC-20/3) │ │              │ │             │
  │ create_market │ │ mint        │ │ register     │ │ add_pts     │
  │ place_bet ────┼─┼─► mint ◄───┼─┤ credit ──────┼─┤ record_bet  │
  │ resolve    ───┼─┼─► mint     │ │ get_referrer │ │ get_stats   │
  │ claim      ───┼─┼─► mint     │ │ get_earnings │ │ get_top     │
  │ cancel        │ │ transfer   │ │ is_registered│ │ get_rank    │
  │ withdraw_fees │ │ balance    │ │              │ │             │
  └───────────────┘ └────────────┘ └──────────────┘ └─────────────┘
```

### Inter-Contract Call Flow

**Place Bet:** `PredictionMarket.place_bet()` → User forwards ETH with call → `ReferralRegistry.credit()` (splits fee: 0.5% to referrer, 1.5% to platform) → `Leaderboard.record_bet()`

**Resolve Market:** `PredictionMarket.resolve_market()` → Stores outcome onchain

**Claim Reward:** `PredictionMarket.claim()` → Calculates pro-rata payout → Transfers ETH to user → `Leaderboard.add_pts()` (win: 30 pts / lose: 10 pts) → `IPredictToken.mint()` (win: 10 IPRED / lose: 2 IPRED)

**Referral Registration:** `ReferralRegistry.register_referral()` → `Leaderboard.add_bonus_pts()` (5 pts) → `IPredictToken.mint()` (1 IPRED welcome bonus)

---

## Reward System

| Outcome | ETH Payout | Points | IPREDICT Tokens |
|---------|-----------|--------|-----------------|
| **Win** | Pro-rata share of losing pool | +30 pts | +10 IPRED |
| **Lose** | 0 ETH | +10 pts | +2 IPRED |
| **Cancelled** | Full refund | +10 pts | +2 IPRED |
| **Referral Registration** | — | +5 pts | +1 IPRED |
| **Referred Bet** (referrer earns) | 0.5% of bet | +3 pts | — |

### Payout Formula

$$\text{Payout} = \frac{\text{UserBet}}{\text{WinningSidePool}} \times \text{TotalPool}$$

### Fee Model

| Component | Rate | Recipient |
|-----------|------|-----------|
| Platform fee | 1.5% | Admin (accumulated, withdrawable) |
| Referral fee | 0.5% | Referrer's ETH wallet |
| **Total** | **2.0%** | Deducted at bet time |

*If bettor has no referrer, full 2% goes to platform.*

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Smart Contracts** | Sway (Fuel VM) | forc 0.66+ |
| **Frontend** | Next.js (App Router) | 14.2.35 |
| **UI** | React + Tailwind CSS | 18.3.1 / 3.4.17 |
| **Language** | TypeScript | 5.7.3 |
| **Wallet** | @fuels/react + @fuels/connectors | Fuel Wallet, Fuelet |
| **Blockchain SDK** | fuels (TypeScript) | 0.100.6 |
| **Testing** | Vitest + Testing Library | 2.1.9 |
| **Contract Testing** | fuels-rs integration tests | — |
| **CI/CD** | GitHub Actions | Node 20 + fuelup |
| **Deployment** | Vercel (frontend) + Fuel Testnet | — |

---

## Project Structure

```
ipredict-fuelnetwork/
├── .github/workflows/ci.yml       # CI pipeline (2 jobs)
├── contracts/
│   ├── Forc.toml                   # Sway workspace manifest
│   ├── libraries/                  # Shared types, constants, ABIs
│   ├── prediction_market/          # Core market logic
│   ├── ipredict_token/             # SRC-20 + SRC-3 platform token
│   ├── referral_registry/          # Referral tracking
│   └── leaderboard/                # Rankings + stats
├── frontend/
│   ├── fuels.config.ts             # Fuel SDK config + typegen
│   ├── src/
│   │   ├── app/                    # Next.js pages (7 routes)
│   │   ├── components/             # 30+ React components
│   │   │   ├── layout/             # Navbar, Footer, MobileMenu
│   │   │   ├── market/             # MarketCard, BettingPanel, OddsBar…
│   │   │   ├── leaderboard/        # LeaderboardTable, Tabs, PlayerRow
│   │   │   ├── profile/            # BetHistory, PointsCard, Referral…
│   │   │   ├── social/             # ShareBetButton (inline popover)
│   │   │   ├── wallet/             # WalletConnect (uses @fuels/react)
│   │   │   ├── admin/              # CreateMarket, Resolve, Stats
│   │   │   └── ui/                 # Spinner, Skeleton, Toast, Badge…
│   │   ├── hooks/                  # useMarket, useBet, useClaim…
│   │   ├── services/               # Fuel SDK service layer
│   │   ├── sway-api/               # Auto-generated TypeScript bindings
│   │   ├── utils/                  # Helpers, cache, formatting
│   │   ├── config/                 # Network constants
│   │   └── types/                  # TypeScript interfaces
│   └── __tests__/                  # 9 test suites
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT-GUIDE.md
│   ├── USER-FEEDBACK.md
│   └── ITERATION-LOG.md
└── README.md
```

---

## Getting Started

### Prerequisites

- **fuelup** — Fuel toolchain manager (installs `forc`, `fuel-core`, `forc-wallet`)
- **Node.js** ≥ 18
- **Fuel Wallet** browser extension (for testnet interaction)

### Setup

```bash
# Clone
git clone https://github.com/AkanEf);/ipredict-fuelnetwork.git
cd ipredict-fuelnetwork

# Build smart contracts
cd contracts
forc build

# Run contract integration tests (requires fuel-core running)
fuel-core run --db-type in-memory &
cargo test

# Setup frontend
cd ../frontend
cp .env.local.example .env.local
# Edit .env.local with your deployed contract IDs
npm install
npx fuels build   # Generate TypeScript bindings
npm test
npm run build
npm run dev  # http://localhost:3000
```

### Deploy Contracts (Testnet)

See [docs/DEPLOYMENT-GUIDE.md](docs/DEPLOYMENT-GUIDE.md) for the full step-by-step deployment guide with correct dependency order.

---

## Deployed Contracts

| Contract | Address | Explorer |
|----------|---------|----------|
| Prediction Market | *TBD after Fuel testnet deployment* | [app.fuel.network](https://app.fuel.network) |
| IPREDICT Token | *TBD* | [app.fuel.network](https://app.fuel.network) |
| Referral Registry | *TBD* | [app.fuel.network](https://app.fuel.network) |
| Leaderboard | *TBD* | [app.fuel.network](https://app.fuel.network) |

> **Network:** Fuel Testnet | **Seed markets** pre-loaded

---

## Testing

### Summary

| Suite | Tests | Status |
|-------|-------|--------|
| **Prediction Market** (Sway/Rust) | 36 | ✅ All passing |
| **Referral Registry** (Sway/Rust) | 13 | ✅ All passing |
| **IPREDICT Token** (Sway/Rust) | 11 | ✅ All passing |
| **Leaderboard** (Sway/Rust) | 10 | ✅ All passing |
| **Frontend Helpers** | 49 | ✅ All passing |
| **Frontend Cache** | 20 | ✅ All passing |
| **BettingPanel Component** | 13 | ✅ All passing |
| **MarketCard Component** | 10 | ✅ All passing |
| **LeaderboardTable Component** | 10 | ✅ All passing |
| **Navbar Component** | 7 | ✅ All passing |
| **WalletConnect Component** | 6 | ✅ All passing |
| **Market Service** | 12 | ✅ All passing |
| **Leaderboard Service** | 10 | ✅ All passing |
| **Total** | **207** | **✅ All passing** |

### Run Tests

```bash
# Sway contract tests
cd contracts && forc test

# fuels-rs integration tests (requires fuel-core)
cd contracts && cargo test

# Frontend tests
cd frontend && npm test

# Frontend tests with coverage
cd frontend && npx vitest run --coverage
```

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`/`develop` and every PR to `main`.

### Job 1: `frontend`
- **Matrix:** Node.js 20
- **Steps:** `npm ci` → `npx fuels build` → `npm test` → `npm run build`
- **Artifacts:** Production build uploaded

### Job 2: `contracts`
- **Toolchain:** fuelup (latest stable)
- **Steps:** `forc build` → `forc test` → `cargo test` (with fuel-core in-memory)
- **Cache:** Fuel toolchain + Cargo target cached

---

## User Validation

### Testnet Users

| # | Wallet Address | Action | Date |
|---|---------------|--------|------|
| 1 | *pending* | — | — |
| 2 | *pending* | — | — |
| 3 | *pending* | — | — |
| 4 | *pending* | — | — |
| 5 | *pending* | — | — |

*Wallets verifiable on [Fuel Explorer](https://app.fuel.network)*

### Feedback & Iteration

See [docs/USER-FEEDBACK.md](docs/USER-FEEDBACK.md) for the full feedback log.

---

## Smart Contract Functions

### Prediction Market

| Function | Description |
|----------|-------------|
| `initialize(admin, token, referral, leaderboard)` | One-time setup with linked contracts |
| `create_market(question, image_url, duration_secs)` | Create new prediction market (admin only) |
| `place_bet(market_id, is_yes)` | Place or increase bet — ETH forwarded with call (2% fee deducted) |
| `resolve_market(market_id, outcome)` | Admin resolves with YES/NO outcome |
| `cancel_market(market_id)` | Cancel market, enable refunds |
| `claim(market_id)` | Claim payout + points + tokens |
| `withdraw_fees()` | Admin withdraws accumulated platform fees |
| `get_market(market_id)` | Read market data |
| `get_bet(market_id, user)` | Read user's bet on market |
| `get_market_count()` | Total markets created |
| `get_odds(market_id)` | Current YES/NO percentages |
| `get_accumulated_fees()` | Total unclaimed platform fees |

### IPREDICT Token (SRC-20 + SRC-3)

| Function | Description |
|----------|-------------|
| `initialize(admin)` | One-time token setup |
| `set_minter(minter)` | Authorize contract to mint (multi-minter) |
| `remove_minter(minter)` | Revoke minting rights |
| `mint(to, amount)` | Mint tokens (authorized minters only) |
| `transfer(to, amount)` | Transfer tokens — sender is `msg_sender()` |
| `burn(amount)` | Burn tokens — sender is `msg_sender()` |
| `balance(account)` | Get token balance |
| `total_supply()` | Total tokens minted |
| `name()` / `symbol()` / `decimals()` | Token metadata (IPREDICT / IPRED / 9) |

### Referral Registry

| Function | Description |
|----------|-------------|
| `initialize(admin, market, token, leaderboard)` | One-time setup |
| `register_referral(display_name, referrer?)` | Register with optional referrer |
| `credit(user, referral_fee)` | Credit referral fee — ETH forwarded with call (market contract only) |
| `get_referrer(user)` | Get user's referrer address |
| `get_display_name(user)` | Get registered display name |
| `get_referral_count(user)` | Number of referrals |
| `get_earnings(user)` | Total referral earnings |
| `has_referrer(user)` / `is_registered(user)` | Status checks |

### Leaderboard

| Function | Description |
|----------|-------------|
| `initialize(admin, market, referral)` | One-time setup |
| `add_pts(user, points, is_winner)` | Add win/loss points + update stats (market contract only) |
| `add_bonus_pts(user, points)` | Add bonus points (referral contract only) |
| `record_bet(user)` | Increment total bets count (market contract only) |
| `get_points(user)` | Get user's total points |
| `get_stats(user)` | Full player stats (points, bets, wins, losses) |
| `get_top_players(limit)` | Sorted leaderboard |
| `get_rank(user)` | User's current rank |

---

## Roadmap

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| **Foundation** | Feb 2026 | MVP launch, testnet, core markets |
| **Growth** | Q2 2026 | User-created markets, oracle resolution, categories |
| **Token Utility** | Q3 2026 | IPREDICT staking, governance, reward tiers |
| **Scale** | Q4 2026 | Mainnet launch, mobile app, cross-chain bridges |

---

## License

[MIT](LICENSE)

---

## Author

Built by **Akan** — Decentralized prediction markets on Fuel Network.
