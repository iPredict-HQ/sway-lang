# iPredict — Grant Application

## Fuel Network Ecosystem Grant

**Project:** iPredict — Decentralized Prediction Market on Fuel Network

**In a nutshell:** iPredict lets you bet ETH on real-world outcomes using Fuel's high-performance execution layer. Win, and you split the pot. Lose, and you still walk away with points and tokens. Every bet, every payout, every referral — all on-chain, all powered by Sway smart contracts on FuelVM.

---

## What's Missing on Fuel

Prediction markets are everywhere in crypto. Polymarket pulled in over a billion dollars during the 2024 US election. Solana has Hedgehog. Base has Thales. On Fuel, Griffy explored the prediction market concept but has not delivered a full-featured, production-ready platform with gamification, loser rewards, on-chain referrals, and composable infrastructure.

That's a gap, because prediction markets are one of the stickiest product categories in this space. People come back every day to check positions, place new bets, flex on the leaderboard. They generate real on-chain volume — not pageviews, not "connected wallets," but actual ETH moving between addresses on every single interaction.

And here's the thing: prediction markets are a *perfect* fit for Fuel's architecture. FuelVM's parallel transaction execution means high throughput without congestion — critical when hundreds of users are placing bets simultaneously on a trending market. Sway's strong type system and ownership model eliminate entire classes of bugs that plague prediction markets on EVM chains. The UTXO-based model provides native asset handling that makes ETH transfers within contracts clean and predictable.

Right now, if a Fuel user wants a prediction market experience with rewards for every participant, on-chain referrals, and a gamified leaderboard — it doesn't exist. There's no good reason for that.

---

## How iPredict Works

It's a pari-mutuel system — simple, fair, and transparent.

1. **A market goes live** with a question, an image, and a deadline (measured in block timestamp).
2. **Users bet ETH** on YES or NO. A 2% fee gets deducted upfront — 1.5% for the platform, 0.5% for whoever referred them.
3. **When time's up**, the admin resolves the market with the actual outcome.
4. **Winners split the entire pool** proportionally based on how much they bet. Payout = `(your_bet / winning_side) × total_pool`.
5. **Losers aren't forgotten.** They still earn 10 leaderboard points and 2 IPREDICT tokens for playing. Because engagement shouldn't only reward people who guessed right.

### What makes it different from other prediction markets

- **Losers earn too.** Most platforms? You lose, you get nothing, you leave. On iPredict, every participant walks away with something. That keeps people coming back.
- **On-chain referrals.** If someone bets because of your link, you pocket 0.5% of their bet in ETH. Not promises. Real ETH, automatically routed by the contract.
- **Gamified leaderboard.** Points, win rates, bet counts, rankings — all computed from on-chain data. No centralized database. No tampering.
- **SRC-20 reward token.** IPREDICT tokens get minted as rewards. Winners get 10, losers get 2. Future utility includes staking and governance.

---

## What's Already Built

This isn't a pitch deck. The MVP is live, tested, and deployed. Here's the receipts:

### Smart Contracts — Built on Fuel Network

| Contract | Lines | What it does |
|----------|-------|-------------|
| prediction_market.sw | 573 | Market lifecycle: create, bet, resolve, cancel, claim winnings, fee management |
| ipredict_token.sw | 267 | SRC-20/SRC-3 token with multi-minter authorization and burn support |
| referral_registry.sw | 287 | User registration, referral tracking, automatic fee crediting, display names |
| leaderboard.sw | 339 | Points system, stats tracking, sorted rankings, top-player management |
| libraries (shared) | 379 | Common types, constants, error enums, ABI definitions |

**1,845 lines of production Sway code.** Not scaffolding. Not boilerplate. Real logic — pari-mutuel math, multi-contract auth, gamified reward distribution, all leveraging FuelVM's native asset model.

### Test Suite — 196 Tests Passing

- **59** contract integration tests using fuels-rs SDK across 5 test suites (including full cross-contract integration)
- **137** frontend tests with Vitest + React Testing Library
- CI/CD pipeline running on GitHub Actions — every push gets linted, tested, and built

### Frontend — Full-Featured

- Next.js 14 with App Router, 7 routes, 30+ React components
- Wallet integration via fuels-ts SDK (Fuel Wallet + Fuelet)
- Every contract function wired to the UI — bet, claim, resolve, cancel, referral, admin
- Social sharing to X, Telegram, WhatsApp after every bet
- Real-time countdown timers with dynamic block-time estimation
- Mobile-first responsive design with glassmorphic purple theme
- Seed markets with real betting enabled

### Zero External Funding

All of this was built before applying for anything. No grants. No investors. No incubator. Just building.

---

## The Roadmap — 6 Months, 6 Milestones

Full details in MILESTONE_PLAN.md. Here's the summary:

| Milestone | Month | Focus |
|-----------|-------|-------|
| Milestone 1: Harden & Audit | 1 | Security hardening, expanded tests, formal verification prep |
| Milestone 2: Testnet Launch | 2 | Fuel testnet deployment, beta testing, community feedback |
| Milestone 3: Mainnet Deploy | 3 | Mainnet deployment, initial markets, monitoring infrastructure |
| Milestone 4: Feature Expansion | 4 | User-created markets, categories, analytics dashboard |
| Milestone 5: Growth & Referrals | 5 | Referral campaign, onboarding, mobile optimization, partnerships |
| Milestone 6: Open Source & Community | 6 | Developer docs, ecosystem integration, community building, post-grant roadmap |

---

## The Ask — $50,000

Full breakdown in BUDGET_PROPOSAL.md. Here's the split:

| Category | Amount | Share |
|----------|--------|-------|
| Security, auditing & testing | $12,000 | 24% |
| Infrastructure & DevOps | $6,500 | 13% |
| Smart contract development | $10,000 | 20% |
| Frontend & UX development | $7,500 | 15% |
| Documentation & content | $5,000 | 10% |
| Community, marketing & outreach | $5,500 | 11% |
| Contingency & operational | $3,500 | 7% |
| **Total** | **$50,000** | **100%** |

The MVP engineering is done. This funding accelerates the path from working prototype to production-grade mainnet product with real users and a thriving community.

---

## Why This Matters for Fuel

iPredict isn't just another dApp. It fills a real gap:

- **ETH utility on Fuel.** Every bet = ETH moving on-chain. Every claim. Every referral payout. That's real usage demonstrating Fuel's throughput advantage.
- **Composable building block.** Market data, referral networks, on-chain reputation — other projects can plug into all of it via Fuel's native inter-contract calls.
- **Community magnet.** Leaderboards and referrals create social loops. People compete, share, and bring friends into the Fuel ecosystem.
- **Open source patterns.** MIT-licensed code gives Fuel developers real Sway patterns to learn from — pari-mutuel math, multi-contract auth, gamification. Not tutorials. Production code.

More in ECOSYSTEM_IMPACT.md.

---

## Where This Is Headed

The 6-month plan gets iPredict to mainnet with real users. After that:

1. **Oracle-based resolution** — automated outcomes from price feeds and data sources (Pyth, Redstone), removing admin dependency
2. **Multi-asset betting** — accept any Fuel-native asset alongside ETH for broader appeal
3. **IPREDICT token utility** — staking for fee discounts, governance on market approval, tier-based rewards
4. **Mobile app** — native iOS and Android experience
5. **Multi-outcome markets** — not just YES/NO, but multiple choices with proper pari-mutuel distribution
6. **Cross-chain markets** — leverage Fuel's bridging to attract users from Ethereum L1
7. **DAO integration** — prediction markets as governance tools for Fuel-based DAOs

---

## Find Us

- **GitHub:** https://github.com/AkaniMohtworking/iPredict-fuel
- **X (Twitter):** [@iPredict_HQ](https://twitter.com/iPredict_HQ)
- **Architecture:** See TECHNICAL_ARCHITECTURE.md
- **User Feedback:** See docs/USER-FEEDBACK.md
