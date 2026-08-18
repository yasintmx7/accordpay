# AccordPay

AccordPay is a non-custodial B2B invoice-settlement application for Arc Testnet. A buyer approves Arc USDC, creates an invoice, and escrows its full value in one contract call. The supplier can claim a payout that grows linearly from the configured starting amount at funding to the full invoice value at maturity.

## What is included

- Next.js 16 App Router frontend with an EIP-6963 browser-wallet connection
- Responsive desktop tables and purpose-built mobile invoice cards
- Invoice search, status filters, overdue detection, sorting, and CSV export
- Dashboard pipeline charts, invoice activity timelines, downloadable receipts, and local due-date reminders
- Circle user-controlled wallet onboarding surface for email, Google, and PIN configuration
- Circle Bridge Kit flow for moving testnet USDC from Ethereum Sepolia to Arc Testnet
- CPN-gated supplier payout preferences that never simulate a completed fiat payment
- Approved AccordPay brand assets for the header, homepage, favicon, and app icon
- Copyable invoice identifiers with safe handling for long addresses and hashes
- Viem reads, writes, receipt validation, and event decoding
- Solidity escrow contract using OpenZeppelin `SafeERC20` and `ReentrancyGuard`
- Atomic `createAndFundInvoice` flow plus separate create/fund actions
- 80 Hardhat contract tests covering lifecycle, access control, timestamps, and accounting
- Arc Testnet deployment module and live network verification script
- Pinned local Solidity 0.8.24 compiler for reproducible builds
- Official Arc Testnet USDC ERC-20 interface at `0x3600000000000000000000000000000000000000`

## Arc USDC model

Arc uses one USDC balance through two interfaces:

- Native USDC uses 18 decimals for gas accounting and native value transfers.
- The ERC-20 USDC interface uses 6 decimals for approvals, `transferFrom`, and application transfers.

AccordPay uses only the 6-decimal ERC-20 interface for invoice amounts. The frontend warns users to keep extra testnet USDC for gas.

## Requirements

- Node.js 22 or newer
- npm
- MetaMask, Rabby, Coinbase Wallet, or another EIP-1193 browser wallet
- Arc Testnet USDC from the Circle Faucet

## Local setup

```bash
npm install
cp .env.example .env
npm run check
npm run dev
```

On Windows Command Prompt, use `copy .env.example .env` instead of `cp`.

Open `http://localhost:3000`. The frontend displays a deployment prompt until `NEXT_PUBLIC_ACCORDPAY_ADDRESS` is set. After deploying the dynamic-settlement contract, set `NEXT_PUBLIC_DYNAMIC_EARLY_SETTLEMENT=true`; leave it false for older fixed-payout deployments.

## Commands

```bash
npm run dev              # Start the frontend
npm run lint             # ESLint
npm run typecheck        # TypeScript check
npm run build            # Production frontend build
npm run contract:compile # Compile Solidity
npm run contract:test    # Run the contract suite
npm run deploy:arc       # Deploy AccordPay to Arc Testnet
npm run arc:check        # Verify Arc, USDC, and optional AccordPay deployment
npm run check            # Run all local quality gates
```

## Optional Circle integrations

The browser-wallet flow works without Circle credentials. To activate user-controlled wallet onboarding, configure `NEXT_PUBLIC_CIRCLE_APP_ID` plus a server-side `CIRCLE_API_KEY` from your Circle Developer Console. Never prefix the API key with `NEXT_PUBLIC_`.

Crosschain funding uses Circle Bridge Kit and keeps the safer two-step lifecycle: bridge USDC to Arc, confirm arrival, then fund the invoice. The included flow supports Ethereum Sepolia to Arc Testnet.

CPN payouts remain disabled by default. Set `NEXT_PUBLIC_CPN_ENABLED=true` only after Circle grants access and the server-side quote, payment, recipient-verification, and webhook services are implemented. AccordPay never labels a mock payout as a real payment.

## Deploy to Arc Testnet

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Deployment requires a dedicated test wallet funded by the [Circle Faucet](https://faucet.circle.com/). Never use a production wallet or mainnet funds.

## Verified build

The completed source passes ESLint, TypeScript checking, all 80 contract tests, a clean Solidity compile, the Next.js 16.3 production build, a production dependency audit, and live Arc Testnet/USDC interface checks.

## Security

This is unaudited hackathon software for Arc Testnet only. Testnet USDC has no financial value. Review [docs/SECURITY.md](docs/SECURITY.md) before deploying or demonstrating the application.

## Official sources

The exact network, token, and compatibility references used by this repository are recorded in [docs/OFFICIAL_REFERENCES.md](docs/OFFICIAL_REFERENCES.md).
