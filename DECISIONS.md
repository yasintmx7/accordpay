# Decisions

- Next.js and TypeScript selected for robust frontend architecture and type safety.
- Viem selected for browser-wallet discovery, typed reads/writes, and receipt decoding.
- No Circle API keys are used, adhering strictly to non-custodial and security guidelines.
- Browser-wallet model is implemented; no private key enters the frontend.
- USDC-only MVP to focus on stable B2B settlement.
- No milestones in the first contract version to keep the MVP scoped and deliverable.
- No crosschain integration until the Arc core flow works perfectly.
- Invoice amounts always use Arc's 6-decimal ERC-20 USDC interface; native 18-decimal units are reserved for gas accounting.
- Atomic create-and-fund is the default UX so a successful invoice cannot remain accidentally unfunded.
