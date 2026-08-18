# AccordPay V2 integrations

## Ready now

- Search invoices by ID, wallet, reference hash, or description hash
- Filter by lifecycle status or overdue state
- Sort by amount, creation time, or due date
- Export the current filtered invoice view as CSV
- Dashboard status and settlement-volume charts
- Onchain-derived activity timeline
- Downloadable text receipt and Arcscan contract link
- Device-local browser due-date reminders while AccordPay is open
- Responsive cards below the desktop-table breakpoint
- Ethereum Sepolia to Arc Testnet USDC bridging through Circle Bridge Kit
- Two-step bridge-then-fund safety flow
- Email, Google, PIN, and browser-wallet onboarding choices
- CPN payout preference UI with access gating

## Requires credentials or approval

- Circle user-controlled wallet creation requires a Circle App ID, a server-side API key, authentication configuration, and a secure user/session backend.
- Google sign-in requires an approved OAuth client ID.
- CPN quotes, recipients, payments, and webhook tracking require Circle approval and server-side signing/authentication.

The project deliberately does not fake these restricted operations. No Circle or CPN secret is exposed to the browser bundle.
