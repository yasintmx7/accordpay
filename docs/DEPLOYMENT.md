# Arc Testnet Deployment

## 1. Prepare a test wallet

Use a dedicated wallet that holds no mainnet assets. Add Arc Testnet with these official values:

| Setting | Value |
| --- | --- |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| Currency | `USDC` |
| Explorer | `https://testnet.arcscan.app` |

Request testnet USDC from `https://faucet.circle.com/`. Arc uses this same USDC balance to pay deployment gas.

## 2. Configure the project

```bash
npm install
cp .env.example .env
```

Set only the server-side deployment key:

```dotenv
ARC_TESTNET_DEPLOYER_PRIVATE_KEY=0xYOUR_TEST_WALLET_PRIVATE_KEY
```

Never prefix the private key with `NEXT_PUBLIC_`. Never commit `.env`.

## 3. Validate locally

```bash
npm run contract:compile
npm run contract:test
npm run lint
npm run typecheck
npm run build
npm run arc:check
```

The network check verifies chain ID `5042002`, code at the official USDC interface, and 6 ERC-20 decimals.

## 4. Deploy

```bash
npm run deploy:arc
```

The Ignition parameters file passes the official Arc Testnet USDC interface to the `AccordPay` constructor. Copy the deployed AccordPay address into `.env`:

```dotenv
NEXT_PUBLIC_ACCORDPAY_ADDRESS=0xDEPLOYED_ACCORDPAY_ADDRESS
NEXT_PUBLIC_DYNAMIC_EARLY_SETTLEMENT=true
```

Restart the frontend after changing a `NEXT_PUBLIC_` value because Next.js embeds public values at build time.

## 5. Verify the deployment

```bash
npm run arc:check
```

When `NEXT_PUBLIC_ACCORDPAY_ADDRESS` is set, the script checks that code exists at the address and that `getSettlementToken()` returns the official Arc Testnet USDC interface.

## 6. Demonstrate the lifecycle

1. Connect the buyer wallet on Arc Testnet.
2. Create and fund an invoice. If allowance is insufficient, the wallet first requests an exact USDC approval.
3. Connect the supplier wallet and open the invoice.
4. Settle early before the due date, or settle the full amount at/after maturity.
5. Open each transaction on Arcscan from the confirmation link.

The buyer and supplier both need extra testnet USDC for their own gas fees.
