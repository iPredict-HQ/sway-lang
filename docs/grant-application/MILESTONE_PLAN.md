# iPredict — Milestone Plan

## 6 Months. 6 Milestones. MVP to Mainnet.

### Where we are right now

The MVP is done. Five Sway modules (1,845 lines) with complete market logic, 196 tests green, full Next.js frontend with Fuel Wallet integration, and seed markets with betting enabled. This plan covers what comes next: professional security auditing, testnet beta, mainnet deployment, feature expansion, and building a thriving community around Fuel's first full-featured prediction market.

---

## Milestone 1: Harden & Audit

**Timeline:** Month 1
**Budget:** $10,000 (20%)
**Goal:** Make the contracts bulletproof through expanded testing and professional security review.

### 1A — Expand the Test Suite (Weeks 1–2)

The test suite is solid, but mainnet-ready means going further:

- Property-based tests for the pari-mutuel math
  - Total payouts never exceed total pool (the critical invariant)
  - Fee calculations stay consistent across all bet sizes
  - Cancel refunds return exactly what was deposited
- Stress tests for the edge cases that matter
  - Markets with maximum bettors (capacity limits)
  - Minimum bet amounts and rounding behavior in integer-only arithmetic
  - Concurrent bets in parallel execution scenarios
  - Single-bettor markets (what happens when only one person bets?)
- Achieve 95%+ branch coverage on all 5 Sway modules
- Publish the coverage report

**Deliverable:** 150+ contract tests passing, coverage report published.

### 1B — Professional Security Audit (Weeks 2–4)

This is a $50K project handling real user funds. Professional auditing is non-negotiable:

- Engage a Sway/FuelVM-specialized security auditor
- Formal review of all 5 contract modules with focus on:
  - Authorization: every `msg_sender()` and ContractId check is correct
  - Integer safety: no overflow scenarios in pari-mutuel math
  - ETH conservation: contract balance always covers all outstanding bets
  - Fee math: accumulation stays consistent across bet/claim/cancel paths
  - Inter-contract call safety: no unauthorized cross-contract access
- Address all findings and document remediations
- Add emergency-pause capability so admin can freeze betting if issues arise
- Document the safety guarantees FuelVM and Sway provide (no reentrancy, type safety, ownership model)

**Deliverable:** Audit report published, all findings addressed, emergency-pause implemented.

### 1C — Formal Specification (Week 4)

- Write formal contract spec (function signatures, preconditions, postconditions, state transitions)
- State machine diagrams for market lifecycle
- Document inter-contract dependency graph and authorization model
- Create deployment runbook with step-by-step verification

**Deliverable:** Formal specification document committed to repo.

### Milestone 1 — Proof of Delivery

| What | Evidence |
|------|----------|
| Extended tests | Test run output showing 150+ tests + coverage report |
| Security audit | Published audit report with findings and remediations |
| Emergency pause | Demonstrated pause/unpause functionality |
| Formal spec | Specification document in repo |

---

## Milestone 2: Testnet Launch

**Timeline:** Month 2
**Budget:** $8,000 (16%)
**Goal:** Deploy to Fuel testnet, run a structured beta program, and gather real user feedback.

### 2A — Testnet Deployment (Week 5)

- Deploy all contracts to Fuel testnet
- Run the initialization sequence (wire up inter-contract dependencies, authorize minters)
- Verify every function via direct contract calls on Fuel Explorer
- Create the first batch of test markets — 10-15 interesting prediction questions

**Deliverable:** Contracts live on Fuel testnet, initial markets created.

### 2B — Beta Testing Program (Weeks 5–7)

- Recruit 30-50 beta testers from the Fuel community
- Structured testing scenarios: place bets, claim rewards, use referrals, check leaderboard
- Bug bounty for critical findings during beta
- Collect feedback via structured forms and community channels
- Iterate on UX based on beta feedback

**Deliverable:** Beta test report with findings, UX improvements shipped.

### 2C — Infrastructure Hardening (Week 8)

- Set up production monitoring: event indexing, error tracking, uptime alerts
- Optimize frontend for testnet performance (caching, batch queries)
- Implement transaction retry logic for failed submissions
- Set up automated deployment pipeline from GitHub to testnet

**Deliverable:** Monitoring dashboard live, CI/CD pipeline deploying to testnet.

### Milestone 2 — Proof of Delivery

| What | Evidence |
|------|----------|
| Testnet contracts | Contract addresses on Fuel Explorer (testnet) |
| Beta program | Beta test report with user count and findings |
| Monitoring | Screenshots of monitoring dashboards |
| CI/CD | GitHub Actions pipeline deploying to testnet |

---

## Milestone 3: Mainnet Deploy

**Timeline:** Month 3
**Budget:** $8,000 (16%)
**Goal:** Deploy to Fuel mainnet and launch with real markets accepting real ETH.

### 3A — Mainnet Deployment (Week 9)

This is launch day.

- Deploy all contracts to Fuel mainnet
- Run the initialization sequence with production configuration
- Verify every function via direct contract calls on Fuel Explorer
- Post-deployment smoke tests (every public function gets called and verified)
- Set up mainnet monitoring: bet events, TVL, fee accumulation

**Deliverable:** Contracts live on Fuel mainnet, verified and monitored.

### 3B — Initial Markets & Soft Launch (Weeks 9–10)

- Create 10-20 high-interest prediction markets across multiple categories
- Categories: Crypto, Tech, Sports, Politics, Pop Culture
- Announce soft launch to beta testers and Fuel community
- Monitor for issues during first 48 hours of real-money operation

**Deliverable:** 10-20 live markets accepting real ETH bets.

### 3C — Frontend Production Hardening (Weeks 11–12)

- Deploy frontend to production domain
- Performance optimization: bundle splitting, lazy loading, SSR where beneficial
- Mobile UX audit and fixes (target: perfect mobile experience)
- Error handling improvements: clear messages, retry options, transaction status tracking
- Network detection and alerts for wallet configuration

**Deliverable:** Production frontend live, mobile-optimized, sub-2-second loads.

### Milestone 3 — Proof of Delivery

| What | Evidence |
|------|----------|
| Mainnet contracts | Contract addresses on Fuel Explorer (mainnet) |
| Live markets | Screenshot/video of markets accepting real bets |
| Frontend | Production URL with Lighthouse performance score |
| Monitoring | Dashboard showing real mainnet activity |

---

## Milestone 4: Feature Expansion

**Timeline:** Month 4
**Budget:** $8,000 (16%)
**Goal:** Ship the features that turn early adopters into power users.

### 4A — User-Created Markets (Weeks 13–14)

Right now, only the admin can create markets. That needs to change:

- Build a market proposal system — users submit questions through the frontend
- Admin review queue — proposals get approved or rejected before going live
- Market categories: Crypto, Sports, Politics, Tech, Pop Culture, Community
- Market search and filtering
- Sorting: trending, newest, ending soon, most volume

**Deliverable:** Users can propose markets, admin can approve them, categories and search working.

### 4B — Analytics Dashboard (Weeks 15–16)

Numbers tell the story:

- Platform-wide analytics: total volume, active markets, unique bettors, fee revenue, TVL
- Per-user analytics on the profile page: win rate over time, favorite categories, earnings history
- Market analytics: volume charts, odds movement, bettor count over time
- Exportable data for transparency reports

**Deliverable:** Analytics dashboard live with real data.

### 4C — Oracle Integration Prototype (Week 16)

- Research and prototype Pyth/Redstone price feed integration
- Build proof-of-concept for automated market resolution using oracle data
- Document integration path for post-grant oracle-based resolution

**Deliverable:** Oracle integration POC with documentation.

### Milestone 4 — Proof of Delivery

| What | Evidence |
|------|----------|
| User-created markets | Video demo: proposal → approval → live market |
| Analytics | Screenshot of dashboard with real data |
| Oracle POC | Working prototype with documentation |

---

## Milestone 5: Growth & Referrals

**Timeline:** Month 5
**Budget:** $8,000 (16%)
**Goal:** Activate the growth engine and scale the user base.

### 5A — Referral Campaign (Weeks 17–18)

The referral system is built into the contracts already. Now we make it impossible to ignore:

- Referral landing pages with unique links and tracking
- Referral leaderboard (top referrers by earnings and count)
- Guided onboarding flow for referred users (walk them through their first bet)
- Referral analytics dashboard for each user

**Deliverable:** Referral system fully activated with landing pages and tracking.

### 5B — Community Growth (Weeks 19–20)

- Launch official Discord and Telegram communities
- Hosting weekly prediction market discussions
- Partner with Fuel community influencers and content creators
- Run prediction market events tied to real-world happenings (crypto events, sports, tech launches)
- Create shareable content: "Market of the Week," leaderboard highlights, winning predictions

**Deliverable:** Active community channels, regular content cadence.

### 5C — Ecosystem Partnerships (Week 20)

- Integrate with Fuel DEXes for IPREDICT token trading
- Partner with Fuel DAOs to explore prediction markets as governance tools
- Cross-promote with other Fuel ecosystem projects
- Developer outreach: help other builders integrate with iPredict's on-chain data

**Deliverable:** At least 2 partnership integrations or collaborations.

### Milestone 5 — Proof of Delivery

| What | Evidence |
|------|----------|
| Referral campaign | Landing pages live, referral analytics showing activity |
| Community | Discord/Telegram links with member counts |
| Partnerships | Partnership announcements or integration demos |

---

## Milestone 6: Open Source & Ecosystem

**Timeline:** Month 6
**Budget:** $8,000 (16%)
**Goal:** Turn iPredict into a proper open-source project and cement its place in the Fuel ecosystem.

### 6A — Developer Documentation (Week 21)

If other devs can't fork it, extend it, or learn from it, it's not truly open source:

- Full developer docs: how to fork and deploy your own prediction market on Fuel
- API reference for all 5 Sway modules (every public and read-only function)
- Integration guide for building on top of iPredict (reading market data, placing bets programmatically)
- Contributing guide with coding standards and PR process
- 15+ GitHub issues labeled "good first issue" and "help wanted"

**Deliverable:** Developer documentation published, GitHub ready for contributors.

### 6B — Community & Content (Weeks 22–23)

- Publish technical blog series: "Building a Pari-Mutuel Prediction Market in Sway"
- Create video tutorials for developers wanting to build on Fuel
- Host a Fuel Twitter Space about prediction markets and DeFi on Fuel
- Submit iPredict to the Fuel ecosystem directory
- Present at a Fuel community call or event

**Deliverable:** Blog series published, ecosystem listing submitted, community event completed.

### 6C — Post-Grant Roadmap (Week 24)

Plan for life after the grant:

- Publish the post-grant roadmap (oracle-based resolution, multi-asset betting, IPREDICT utility, mobile app)
- Document the revenue model and path to self-sustainability
- Write a retrospective: "Building a Prediction Market on Fuel — What Worked and What We Learned"
- Evaluate follow-up funding opportunities based on traction metrics
- Set 12-month projected milestones

**Deliverable:** Post-grant roadmap published, retrospective written.

### Milestone 6 — Proof of Delivery

| What | Evidence |
|------|----------|
| Developer docs | Published documentation (repo docs or external site) |
| Content | Blog post URLs, video links |
| Ecosystem listing | Listing URL on Fuel ecosystem page |
| Roadmap | Published roadmap document |
| Retrospective | Published case study |

---

## What Could Go Wrong (And How We Handle It)

| Risk | Chance | Impact | Plan B |
|------|--------|--------|--------|
| Smart contract vulnerability | Low | High | Professional audit in Milestone 1, emergency-pause capability, Sway's type safety prevents common exploit classes |
| Low user adoption at launch | Medium | Medium | Referral incentives (real ETH earnings), community push in Milestone 5, partnership with Fuel ecosystem projects |
| Fuel network issues | Low | Medium | Transaction retry logic, clear "pending" states in UI, coordination with Fuel team |
| Market resolution disputes | Medium | Low | Clear criteria in market descriptions, admin dispute process, oracle integration planned for post-grant |
| Audit findings require major refactoring | Low | Medium | 1,845 lines is manageable scope; Sway's compiler catches most issues pre-deployment; budget includes remediation time |
| Open source contributors don't show up | Medium | Low | Good docs + labeled issues + active maintainer. If nobody shows up immediately, organic growth follows product traction |

---

## After the Grant — Where iPredict Goes Next

The 6-month plan gets us to mainnet with real users and a growing community. After that, the roadmap expands:

1. **Oracle-based resolution** — automated outcomes from Pyth/Redstone data feeds, removing admin dependency
2. **Multi-asset betting** — accept any Fuel-native asset alongside ETH
3. **IPREDICT token utility** — staking for reduced fees, governance votes on market approval
4. **Mobile app** — native iOS and Android experience
5. **Multi-outcome markets** — beyond YES/NO, proper multi-choice pari-mutuel distribution
6. **Cross-chain integration** — leverage Fuel's bridging for cross-chain market participation
7. **SDK for developers** — npm package for integrating iPredict markets into any Fuel app
8. **DAO governance markets** — prediction markets as decision-making tools for Fuel-based DAOs
