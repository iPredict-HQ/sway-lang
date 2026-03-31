# iPredict — Budget Proposal

## $50,000 USD | Fuel Network Ecosystem Grant | 6-Month Plan

### The short version

The hard part is done. 1,845 lines of Sway, 196 tests, full Next.js frontend, all contract logic complete — built without a single dollar of funding. This $50,000 takes a working MVP and turns it into a production-grade mainnet product on Fuel with real users, a professional security audit, and a thriving community. No research risk. No "figuring it out." Just execution at scale.

---

## How the Money Gets Spent

### Phase 1 — Security, Audit & Testnet ($20,000)

*Released after Milestones 1 and 2 are verified (Months 1–2)*

| Item | Cost | Why |
|------|------|-----|
| Professional security audit | $8,000 | Engage a Sway/FuelVM-specialized auditor for a formal contract audit of all 5 modules |
| Extended test suite development | $3,000 | Property-based testing, fuzz testing with cargo-fuzz, edge case coverage for pari-mutuel math |
| Formal verification tooling | $1,500 | Static analysis tools, custom invariant checkers, coverage reporting |
| CI/CD & DevOps infrastructure | $2,000 | GitHub Actions matrix builds, automated deployment pipeline, monitoring dashboards |
| Testnet deployment & beta testing | $1,500 | Beta user incentives, bug bounty rewards for testnet testers |
| Technical specification & documentation | $2,000 | Formal contract spec, state machine diagrams, deployment runbooks |
| Technical content creation | $2,000 | Blog posts on building pari-mutuel settlement in Sway, FuelVM architecture deep-dives |
| **Phase 1 Total** | **$20,000** | |

### Phase 2 — Mainnet Launch & Features ($18,000)

*Released after Milestones 3 and 4 are verified (Months 3–4)*

| Item | Cost | Why |
|------|------|-----|
| Mainnet deployment & gas costs | $2,000 | Contract deployment, initialization transactions, initial market creation |
| Production hosting (12 months) | $2,400 | Vercel Pro, custom domain (ipredict.fuel), SSL, CDN |
| Monitoring & analytics infrastructure | $2,000 | Event indexing, error monitoring (Sentry), uptime alerts, Fuel GraphQL integration |
| User-created markets feature | $3,000 | Market proposal system, admin approval queue, category filtering, search |
| Analytics dashboard | $2,500 | Real-time platform stats: TVL, volume, unique bettors, fee revenue, market performance |
| Frontend performance optimization | $2,100 | Bundle splitting, SSR optimization, sub-2-second load times, mobile UX audit |
| Oracle integration research | $2,000 | Pyth/Redstone price feed integration prototype for automated market resolution |
| Emergency response tooling | $2,000 | Admin pause capability, circuit breakers, automated alerts for anomalous activity |
| **Phase 2 Total** | **$18,000** | |

### Phase 3 — Growth, Community & Ecosystem ($12,000)

*Released after Milestones 5 and 6 are verified (Months 5–6)*

| Item | Cost | Why |
|------|------|-----|
| Referral growth campaign | $2,500 | Landing pages, referral leaderboard, guided onboarding, tracking analytics |
| Developer documentation | $2,000 | API reference for all contracts, fork guide, integration guide, contributing guide |
| Community building | $2,000 | Discord/Telegram setup and moderation, Twitter Spaces, Fuel community engagement |
| Ecosystem partnerships | $1,500 | DAO outreach, integration with other Fuel projects, Fuel ecosystem directory listing |
| Open source infrastructure | $1,500 | Issue templates, "good first issue" labeling, contributor onboarding, code review process |
| Contingency & operational | $2,500 | Unexpected infrastructure costs, gas price fluctuations, tooling upgrades |
| **Phase 3 Total** | **$12,000** | |

---

## By Category

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

---

## What Was Already Built — For Free

This is what exists before any grant money touches the project:

| Deliverable | Status |
|-------------|--------|
| 5 Sway modules (1,845 lines) — prediction market, token, leaderboard, referrals, shared library | Done |
| 59 contract integration tests with fuels-rs SDK | Done |
| 137 frontend tests with Vitest + React Testing Library | Done |
| Full Next.js 14 frontend (30+ components, 7 routes) | Done |
| Fuel Wallet integration (Fuel Wallet + Fuelet) | Done |
| Seed markets with betting enabled | Done |
| CI/CD pipeline on GitHub Actions | Done |

400+ hours of self-funded development. Zero external funding. The grant doesn't pay for R&D — it pays for professional auditing, mainnet deployment, and scaling to real users.

---

## Is This Efficient?

| Metric | Value |
|--------|-------|
| Code already written (no grant needed) | 1,845 lines Sway + full frontend + 196 tests |
| Cost per milestone | ~$8,333 |
| Infrastructure runway | 12+ months of hosting and tooling |
| Hours already invested for free | 400+ |
| Professional audit included | Yes — formal Sway/FuelVM audit |

For $50,000, you get a project that's already 60% done reaching 100% — with a professional security audit, mainnet deployment, full ecosystem integration, and a community growth engine. That's a strong return on investment for the Fuel ecosystem.

---

## How iPredict Stays Alive After the Grant

This isn't a "build it and walk away" situation:

- **Low overhead.** Smart contracts run themselves on FuelVM. The only recurring cost is frontend hosting (~$200/month for production-grade infrastructure).
- **Built-in revenue.** The 2% fee on every bet generates platform income proportional to usage. At 5,000 ETH equivalent in monthly volume, fees cover all infrastructure with margin.
- **Open source contributions.** Community developers reduce maintenance load while growing adoption.
- **Token utility expansion.** IPREDICT staking and governance features add engagement loops that don't require funding.
- **Integration partnerships.** Other Fuel projects plugging into iPredict market data and referral networks creates mutual value.
- **Follow-on funding.** If traction warrants it, Series A or follow-up ecosystem grants are on the table based on demonstrated metrics.

---

## What the Money Will NOT Be Used For

- Not for non-Fuel work
- Not for inflating metrics or gaming numbers
- Not for token speculation or market manipulation
- Not for personal expenses unrelated to the project
- Not for hiring full-time employees (contractor/specialist engagement only)
- Not for activities that violate Fuel Foundation guidelines
