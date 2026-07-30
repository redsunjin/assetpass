# GIWA Sepolia testnet runbook

This runbook deploys **only** the demo-only, evidence-only registry. It never uses a wallet with real assets or a private key that was shared in chat.

## Preconditions

- A newly created, test-only EVM wallet has GIWA Sepolia Test ETH from the official faucet.
- Three public test-wallet addresses are available for issuer, reviewer, and auditor roles. They may be the same wallet for a private demo, but separate wallets make the approval flow credible.
- The user has explicitly approved the testnet deployment and broadcasts.
- Copy `.env.example` to a local `.env` file and fill it locally. Do not commit it.

## Local verification

```bash
scripts/agent-harness.sh
forge build
```

## Dry-run deployment

```bash
set -a && source .env && set +a
forge script contracts/script/DeployAssetRegistry.s.sol:DeployAssetRegistry \
  --rpc-url https://sepolia-rpc.giwa.io
```

## Broadcast deployment

Only after the preceding dry run and explicit approval:

```bash
set -a && source .env && set +a
forge script contracts/script/DeployAssetRegistry.s.sol:DeployAssetRegistry \
  --rpc-url https://sepolia-rpc.giwa.io --broadcast
```

Record the deployed address in `ASSET_PASSPORT_REGISTRY`, then update `app/config.js` with the same public address.

## Initialize the three fictional assets

```bash
set -a && source .env && set +a
forge script contracts/script/InitializeDemoAssets.s.sol:InitializeDemoAssets \
  --rpc-url https://sepolia-rpc.giwa.io
```

Broadcast the initializer only with explicit approval. It registers `demo-solar-001`, `demo-invoice-002`, and `demo-building-003`; it records hashes only, never source documents or value.

## Review and public verification

1. Use the reviewer test wallet to call `reviewLatestDocument` for the two submitted demo documents.
2. Use the issuer test wallet to call `markDisclosed` for an approved document.
3. Record the transaction hashes in the demo notes and show them through the GIWA Sepolia explorer.
4. Serve the static app: `python3 -m http.server --directory . 4173`, then open `http://localhost:4173/app/`.

`app/config.js` intentionally remains in pre-deployment mode until a public registry address is recorded.
