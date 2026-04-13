# @sentinel/sdk

TypeScript SDK for **Sentinel / ShieldPay**: evaluate payment intents against on-chain policy, run multi-agent consensus via Soroban, and optionally mirror results to Supabase.

## Install

```bash
npm install @sentinel/sdk
```

Peer-style dependencies are bundled as normal dependencies (`@stellar/stellar-sdk`, `@supabase/supabase-js`, `axios`, `zod`). Use Node 18+ with native ESM (`"type": "module"` in consuming apps) or a bundler that resolves ESM.

## Build from source (monorepo)

```bash
npm run build -w @sentinel/sdk
```

Published artifacts live under `dist/`.

## Configuration

`loadSorobanConfig()` reads `STELLAR_RPC_URL`, `STELLAR_NETWORK_PASSPHRASE`, `SENTINEL_CONTRACT_ID`, and `SENTINEL_OPERATOR_SECRET` when set; you can also pass a `SorobanConfig` object directly.

## Usage

Configure Soroban access, then:

```ts
import { verify, evaluate, loadSorobanConfig } from '@sentinel/sdk'

const soroban = loadSorobanConfig() // or pass your own SorobanConfig

const check = await verify(intent, { ownerId, soroban })
if (!check.allowed) {
  console.log(check.reason)
}

const result = await evaluate(intent, {
  ownerId,
  soroban,
  supabase, // optional: mirror transactions
})
```

Exports include policy evaluation (`evaluatePolicy`), consensus (`runConsensus`, `evaluateQuorum`), Soroban helpers (`createSorobanClient`, `loadSorobanConfig`), agent registry utilities, and Supabase mirroring helpers. See `src/index.ts` for the full public API.

## Repository

Source and issues: [github.com/Oppia-Software-Labs/sentinel](https://github.com/Oppia-Software-Labs/sentinel) (`packages/sentinel-sdk`).

## License

MIT
