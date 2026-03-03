# iPredict — Deployment Guide

## Prerequisites

- [fuelup](https://docs.fuel.network/guides/installation/) — Fuel toolchain manager (installs `forc`, `fuel-core`)
- [Node.js](https://nodejs.org/) 20+ with npm
- [Fuel Wallet](https://wallet.fuel.network/) browser extension (for testing)
- A funded Fuel testnet account

### Install Fuel Toolchain

```bash
# Install fuelup
curl -fsSL https://install.fuel.network | sh

# Install latest toolchain
fuelup toolchain install latest
fuelup default latest

# Verify installation
forc --version    # Sway compiler
fuel-core --version  # Local node
```

### Admin Wallet

- **Address:** `0x...` (your admin wallet address)
- **Private Key:** Stored in environment variable — **NEVER commit to repo**

```bash
# Set up admin key:
export ADMIN_PRIVATE_KEY="0x..."
```

### Fund Account on Testnet

Use the Fuel testnet faucet:
- Visit [faucet.fuel.network](https://faucet.fuel.network/)
- Enter your wallet address
- Receive testnet ETH

---

## Step 1: Build All Contracts

```bash
cd contracts

# Build all contracts in the workspace
forc build

# Verify build output
ls -la */out/debug/*.bin
```

Expected output:
- `prediction_market/out/debug/prediction_market.bin`
- `ipredict_token/out/debug/ipredict_token.bin`
- `referral_registry/out/debug/referral_registry.bin`
- `leaderboard/out/debug/leaderboard.bin`

---

## Step 2: Deploy Contracts to Testnet

Deploy in the correct dependency order:

### 2a. Deploy IPredictToken (no dependencies)

```bash
forc deploy --testnet \
  --path ipredict_token \
  --signing-key $ADMIN_PRIVATE_KEY
# → Returns TOKEN_CONTRACT_ID (0x...)
```

### 2b. Deploy Leaderboard (no dependencies)

```bash
forc deploy --testnet \
  --path leaderboard \
  --signing-key $ADMIN_PRIVATE_KEY
# → Returns LEADERBOARD_CONTRACT_ID (0x...)
```

### 2c. Deploy ReferralRegistry

```bash
forc deploy --testnet \
  --path referral_registry \
  --signing-key $ADMIN_PRIVATE_KEY
# → Returns REFERRAL_CONTRACT_ID (0x...)
```

### 2d. Deploy PredictionMarket (depends on all 3)

```bash
forc deploy --testnet \
  --path prediction_market \
  --signing-key $ADMIN_PRIVATE_KEY
# → Returns MARKET_CONTRACT_ID (0x...)
```

---

## Step 3: Initialize Contracts

Initialize via a script or the Fuel TypeScript SDK. Create an `initialize.ts` script:

```typescript
import { Provider, Wallet } from 'fuels';
import { PredictionMarketContract } from './frontend/src/sway-api/contracts';
import { IpredictTokenContract } from './frontend/src/sway-api/contracts';
import { LeaderboardContract } from './frontend/src/sway-api/contracts';
import { ReferralRegistryContract } from './frontend/src/sway-api/contracts';

const PROVIDER_URL = 'https://testnet.fuel.network/v1/graphql';
const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY!;

// Contract IDs from deployment
const MARKET_ID = '0x...';
const TOKEN_ID = '0x...';
const REFERRAL_ID = '0x...';
const LEADERBOARD_ID = '0x...';

async function main() {
  const provider = new Provider(PROVIDER_URL);
  const wallet = Wallet.fromPrivateKey(ADMIN_KEY, provider);

  // 3a. Initialize IPredictToken
  const token = new IpredictTokenContract(TOKEN_ID, wallet);
  await token.functions.initialize('IPREDICT', 'IPRED', 9).call();
  console.log('Token initialized');

  // 3b. Initialize Leaderboard
  const leaderboard = new LeaderboardContract(LEADERBOARD_ID, wallet);
  await leaderboard.functions
    .initialize({ bits: MARKET_ID }, { bits: REFERRAL_ID })
    .call();
  console.log('Leaderboard initialized');

  // 3c. Initialize ReferralRegistry
  const referral = new ReferralRegistryContract(REFERRAL_ID, wallet);
  await referral.functions
    .initialize(
      { bits: MARKET_ID },
      { bits: TOKEN_ID },
      { bits: LEADERBOARD_ID }
    )
    .call();
  console.log('ReferralRegistry initialized');

  // 3d. Initialize PredictionMarket
  const market = new PredictionMarketContract(MARKET_ID, wallet);
  await market.functions
    .initialize(
      { bits: TOKEN_ID },
      { bits: REFERRAL_ID },
      { bits: LEADERBOARD_ID }
    )
    .call();
  console.log('PredictionMarket initialized');

  // Step 4: Authorize Minters
  await token.functions.set_minter({ bits: MARKET_ID }).call();
  await token.functions.set_minter({ bits: REFERRAL_ID }).call();
  console.log('Minters authorized');
}

main().catch(console.error);
```

Run with:
```bash
npx ts-node initialize.ts
```

---

## Step 4: Create Seed Markets

```typescript
// Add to initialize.ts or create seed-markets.ts

async function seedMarkets() {
  const provider = new Provider(PROVIDER_URL);
  const wallet = Wallet.fromPrivateKey(ADMIN_KEY, provider);
  const market = new PredictionMarketContract(MARKET_ID, wallet);

  const markets = [
    {
      question: 'Will Bitcoin reach $100k by March 2026?',
      image_url: '/images/markets/bitcoin.png',
      duration: 2592000,  // 30 days
    },
    {
      question: 'Will Ethereum flip Bitcoin in market cap?',
      image_url: '/images/markets/crypto-event.png',
      duration: 7776000,  // 90 days
    },
    {
      question: 'Will FIFA 2026 final be held in MetLife Stadium?',
      image_url: '/images/markets/football.png',
      duration: 5184000,  // 60 days
    },
  ];

  for (const m of markets) {
    const { value } = await market.functions
      .create_market(m.question, m.image_url, m.duration)
      .call();
    console.log(`Created market #${value}`);
  }
}
```

---

## Step 5: Generate Frontend Bindings

```bash
cd frontend

# Generate typed TypeScript bindings from compiled contracts
npx fuels build
# Output → src/sway-api/contracts/
```

This reads the contract ABIs from `contracts/*/out/debug/*-abi.json` and generates fully-typed TypeScript classes.

---

## Step 6: Deploy Frontend

### 6a. Configure Environment

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local` with deployed contract IDs:

```env
NEXT_PUBLIC_FUEL_PROVIDER_URL=https://testnet.fuel.network/v1/graphql
NEXT_PUBLIC_MARKET_CONTRACT_ID=0x...
NEXT_PUBLIC_TOKEN_CONTRACT_ID=0x...
NEXT_PUBLIC_REFERRAL_CONTRACT_ID=0x...
NEXT_PUBLIC_LEADERBOARD_CONTRACT_ID=0x...
NEXT_PUBLIC_ADMIN_ADDRESS=0x...
```

### 6b. Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 6c. Run Tests

```bash
npm test
# Should show 45+ passing tests
```

### 6d. Production Build

```bash
npm run build
# Verify all pages generated successfully
```

### 6e. Deploy to Vercel

1. Connect GitHub repository to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add all `NEXT_PUBLIC_*` environment variables in Vercel dashboard
4. Deploy — Vercel auto-deploys on push to `main`

---

## Verification Checklist

After deployment, verify each feature end-to-end:

- [ ] Landing page loads with live stats
- [ ] Markets page shows seed markets
- [ ] Market detail page shows odds and betting panel
- [ ] Wallet connects via Fuel Wallet / Fuelet
- [ ] Placing a bet succeeds (check transaction on [app.fuel.network](https://app.fuel.network))
- [ ] Leaderboard shows rankings
- [ ] Profile page shows bet history after placing bets
- [ ] Admin page accessible only by admin wallet
- [ ] Resolving a market works
- [ ] Claiming rewards works (winner gets ETH + points + tokens)
- [ ] Referral registration works
- [ ] Social sharing generates correct URLs

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Contract not found` | Verify contract ID in `.env.local` matches deployed address |
| `Transaction reverted` | Check contract is initialized and caller has auth |
| `Insufficient funds` | Fund account via [faucet.fuel.network](https://faucet.fuel.network/) |
| `forc build fails` | Run `fuelup update` and ensure `fuelup default latest` |
| `Wallet not connecting` | Ensure Fuel Wallet extension is installed and on testnet |
| `npx fuels build fails` | Ensure contracts are compiled first (`forc build` in `contracts/`) |
| `TypeScript errors` | Regenerate bindings with `npx fuels build` after contract changes |
