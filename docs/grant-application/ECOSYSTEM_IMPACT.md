# iPredict — Ecosystem Impact

## What iPredict Brings to Fuel Network

### A quick reality check

Ethereum has Polymarket, Augur, and Gnosis. Solana has Hedgehog and Drift. Base has Thales. On Fuel, Griffy attempted to bring prediction markets to the ecosystem but hasn't delivered a full-featured, production-ready platform with gamification, loser rewards, and composable on-chain infrastructure.

That's not a small thing. Prediction markets are one of the highest-engagement categories in all of DeFi. Polymarket alone moved over $1 billion in volume during the 2024 US election cycle. These platforms generate daily active users, real token volume, and the kind of community buzz that keeps people talking about a chain.

iPredict brings the full prediction market experience to Fuel — raising the bar from basic betting to a gamified, composable platform that showcases FuelVM's performance advantages.

---

## Real On-Chain Volume, Not Vanity Metrics

Every single interaction on iPredict creates on-chain economic activity:

- **Placing a bet** — ETH moves from user wallet to contract
- **Claiming a reward** — ETH moves from contract back to winner
- **Referral payouts** — ETH moves from contract to the referrer's wallet
- **Fee withdrawal** — accumulated fees move to the admin

This isn't a dashboard people look at and close. It's an app that moves ETH every time someone uses it. That's the kind of activity that matters for ecosystem health — and it's the kind of activity that demonstrates Fuel's throughput advantage to the broader crypto community.

---

## Why Fuel's Architecture Is Perfect for Prediction Markets

Prediction markets are about one thing: trust. Can you trust that the rules won't change after you bet? Can you trust that the payout math is right? Can you trust that nobody can drain the pool?

Building on Fuel gives iPredict structural advantages no other execution layer provides:

- **Parallel transaction execution** — FuelVM processes transactions in parallel using the UTXO model, meaning hundreds of bets can land simultaneously without congestion. During high-activity events (election nights, crypto market moves), this is the difference between a working product and a broken one.
- **Sway's type safety** — Sway's strong type system, ownership model, and compile-time safety checks eliminate entire classes of bugs. No reentrancy. No unchecked arithmetic overflows. The compiler catches bugs before deployment.
- **Native asset handling** — Fuel's native asset model means ETH transfers within contracts are first-class operations, not fragile low-level calls. Pari-mutuel settlement math with native assets is clean and predictable.
- **Predictable gas costs** — Fuel's gas model means users know exactly what a bet will cost before submitting. No gas auction surprises during high-traffic markets.
- **Sub-second finality** — Users see their bets confirmed almost instantly, creating the responsive UX that prediction markets need to feel real-time.

That's not marketing. That's a real technical advantage for a product where people are putting money on the line.

---

## Composable Pieces Other Projects Can Use

iPredict doesn't just exist as a standalone app. It creates on-chain primitives that other Fuel projects can plug into.

### Market Data — Open and Readable

Any contract or frontend on Fuel can query iPredict market data:

- Current odds for any prediction question (YES pool vs NO pool)
- Total volume per market
- Number of unique participants
- Resolution outcomes

No API key needed. No permission required. It's all on-chain and public.

### Referral Network — Reusable

The referral registry is its own contract. Other projects could:

- Check whether a user was referred (reuse the referral graph)
- Read display names for user-facing features
- Build their own referral program using the same infrastructure

### On-Chain Reputation — Portable

The leaderboard tracks points, win rates, total bets, and rankings. All readable by any contract or frontend. This could be used for:

- Access gating (e.g., "must have 100+ points to access early features")
- Reputation scoring for other Fuel apps
- DAO governance weighting — active predictors get more voting power

### IPREDICT Token — SRC-20 Compatible

IPREDICT is a standard SRC-20/SRC-3 token on Fuel. Once it has real distribution through market activity:

- Tradeable on Fuel DEXes
- Stakeable for governance or fee discounts
- Usable as a reputation signal anywhere in the ecosystem

---

## How We Compare

| Feature | iPredict | Griffy (Fuel) | Polymarket (Polygon) | Hedgehog (Solana) |
|---------|----------|--------------|---------------------|-------------------|
| Chain | Fuel Network | Fuel Network | Polygon | Solana |
| Settlement model | Pari-mutuel | Basic betting | Order book | AMM |
| Losers earn rewards | Yes | No | No | No |
| Referral system | On-chain, 0.5% of bets | No | Off-chain | None |
| Leaderboard | On-chain, real-time | No | Centralized | Limited |
| Platform token | IPREDICT (SRC-20) | No | None | None |
| Open source | Yes (MIT) | No | No | Partial |
| Composable contracts | Yes (5 modules) | No | No | No |
| Production-ready MVP | Yes | Unclear / inactive | Yes | Yes |

Griffy may have explored prediction markets on Fuel, but appears to be inactive or still in early development. iPredict is a production-ready MVP with complete smart contracts, comprehensive tests, and a full frontend — ready to become the definitive prediction market on Fuel Network.

We're not trying to out-volume Polymarket. We're building the prediction market infrastructure that the Fuel ecosystem deserves — with features that don't exist anywhere else: loser rewards, on-chain referrals, a gamified leaderboard, and composable architecture other projects can build on.

---

## Growth Game Plan

### Numbers We're Tracking

| Metric | 6-Month Target | How we measure it |
|--------|---------------|-------------------|
| Total markets created | 100+ | On-chain market count |
| Unique bettors | 500+ | Unique addresses in bet events |
| Total ETH volume | 50+ ETH | Sum of all bet amounts |
| Registered users (with username) | 1,000+ | Referral-registry registrations |
| Referral chains | 150+ | Users who signed up through a referrer |
| Leaderboard participants | 300+ | Unique addresses with points > 0 |
| GitHub stars | 100+ | Repo metrics |
| Community members | 200+ | Discord/Telegram count |

### How People Find iPredict

1. **Referral links** — existing users share links, earn real ETH from referred bets
2. **X/Twitter** — regular posts about market outcomes, leaderboard standings, new markets
3. **Fuel community** — Discord, Telegram, Fuel Forum, developer forums, Twitter Spaces
4. **Ecosystem directory** — listed on the Fuel app ecosystem page
5. **GitHub** — developers discover it through the open-source codebase
6. **Fuel events** — demos at Fuel community calls, hackathons, and builder events

---

## Open Source Contribution

Everything is MIT-licensed. The Fuel developer community gets:

- **Pari-mutuel math patterns** — fee calculation, proportional payouts, pool management in Sway
- **Multi-contract auth patterns** — inter-contract authorization across 5 interconnected modules using ContractId-based access control
- **Gamification patterns** — points, rankings, sorted leaderboard maintenance in Sway
- **SRC-20/SRC-3 integration patterns** — multi-minter model, conditional minting based on game outcomes
- **Full-stack reference app** — Next.js 14 + fuels-ts SDK + Vitest testing suite

These aren't toy examples. This is production code that real users interact with. Other builders can fork it, learn from it, and build on top of it.

---

## The Bigger Picture

Even at modest adoption, iPredict creates compounding value for the Fuel ecosystem:

1. **Daily active users.** Prediction markets are time-sensitive. People come back to check countdowns, odds shifts, and new markets. That's organic daily engagement — exactly what Fuel needs as it grows post-mainnet.
2. **ETH demand on Fuel.** Every bet requires ETH on Fuel. More users = more bridged ETH = more liquidity in the ecosystem. Simple.
3. **Developer signal.** A working, open-source prediction market proves Fuel can handle real DeFi applications beyond swaps and lending. That attracts more builders.
4. **FuelVM showcase.** iPredict demonstrates parallel execution, native asset handling, and Sway's safety guarantees in a consumer-facing product — the kind of proof that marketing decks can't provide.
5. **Organic content.** Every resolved market generates community discussion. "Who predicted ETH at $10K?" is content that writes itself.
6. **Network effects.** As more Fuel projects launch, the value of shared market data, reputation scores, and referral networks goes up — for everyone.
7. **Ecosystem maturity signal.** A full-featured prediction market tells the broader crypto community that Fuel's ecosystem is maturing and ready for diverse applications.
