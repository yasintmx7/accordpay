# AccordPay Product Specification

## Problem

B2B invoices can leave suppliers waiting weeks for payment while buyers receive little benefit for paying early.

## Solution

AccordPay escrows the full invoice value in Arc Testnet USDC. Before maturity, the supplier may take a transparent early-settlement amount and the discount returns to the buyer. At maturity, the supplier may claim the full amount.

## Roles

- Buyer: defines terms, approves USDC, and funds the invoice.
- Supplier: chooses early or maturity settlement and receives USDC.

## Onchain lifecycle

1. `createAndFundInvoice(...)`: atomically records terms and escrows the full amount.
2. `settleEarly(id)`: before the due date, the supplier receives the current linearly increasing payout; the remaining discount returns to the buyer.
3. `previewEarlySettlement(id)`: returns the exact supplier payout currently enforced by the contract.
3. `settleAtMaturity(id)`: supplier receives the full amount at or after the due date.

The contract also exposes separate `createInvoice`, `fundInvoice`, and `cancelInvoice` actions for workflows that do not require atomic creation and funding.

## Data model

The contract stores participant addresses, 6-decimal USDC amounts, timestamps, status, and hashes of the reference/description. Plain invoice text is intentionally kept offchain.

## Non-goals

- Custodial wallets or private-key storage
- Mainnet deployment
- Lending pools, speculative tokens, or NFTs
- Automatic offchain scheduling
- Crosschain transfers inside the escrow contract

## Success criteria

- All contract tests, lint, type-check, and production build pass.
- Arc network check confirms the official USDC interface.
- Buyer and supplier can complete the full lifecycle with separate browser wallets on Arc Testnet.
