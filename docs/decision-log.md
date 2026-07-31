# Decision Log

Record material decisions here.

| Date | Decision | Reason | Revisit |
|---|---|---|---|
| 2026-07-21 | Start as an operating-evidence product, not an RWA issuance/trading service. | Keeps the personal-project scope technically demonstrable and avoids handling funds, investment solicitation, or real investor data. | Before any external pilot. |
| 2026-07-21 | Use GIWA testnet for hashes, approval attestations, and asset state only. | GASOK requires native chain and wallet relevance; minimal onchain data reduces privacy and regulatory exposure. | Before Phase 3/mainnet. |
| 2026-07-21 | Apply to DeFi/RWA and GIWA-native Ideas. | The product is RWA infrastructure whose primary UX is GIWA Wallet verification. | At application submission. |
| 2026-07-31 | Pivot from RWA Release Gate to AI-assisted on-chain AssetOps. | The prior buyer, market, and chain rationale were unclear. The new MVP controls an action that is itself on-chain: AI proposal → deterministic policy → owner wallet → GIWA receipt. | After first user interviews. |
| 2026-07-31 | Complete one GIWA Sepolia Test ETH E2E with a test-only CLI wallet. | Controller deployment, policy registration, funding, payment execution, and duplicate-proposal rejection are now evidence, not planned claims. | Before browser-wallet validation. |
