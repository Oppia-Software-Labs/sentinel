<h1 align="center">Sentinel + ShieldPay</h1>

<p align="center">
  <strong>Governance and payments for AI agents on x402 and MPP (Stellar)</strong>
</p>

<p align="center">
  Multi-agent consensus · Spend policies · Escrow · x402 facilitator · Real-time dashboard
</p>

---

## Overview

**Sentinel** is the governance layer. It answers whether a payment is allowed: multi-agent voting, spend rules (policy), Trustless Work escrow during evaluation, and a clear **approve** or **reject** outcome.

**ShieldPay** is the payments layer. After Sentinel approves, it proxies HTTP to the **hosted x402 facilitator** (OpenZeppelin + Stellar on `channels.openzeppelin.com`), forwards **verify** / **settle**, and coordinates MPP-style session logic for the MVP.

Together they form one stack; either piece can be discussed on its own for integrators.

## The problem

Autonomous agents can burn API and on-chain budget in loops, retry storms, or bad deploys. Documented incidents run to **tens of thousands of USD in days**. Sentinel + ShieldPay aim to **block or throttle before settlement**, with alerts (e.g. Slack) and operator controls (e.g. kill-switch) where the product specifies them.

## Features (MVP target)

| Area | Description |
| --- | --- |
| **@sentinel/sdk** | Shared types, policy engine, consensus coordinator, escrow (Trustless Work), agent registry |
| **ShieldPay API** | Next.js API routes: proxy `/verify` · `/settle` to the hosted facilitator, MPP session hooks |
| **Dashboard** | Next.js UI, Supabase Realtime for transactions, votes, MPP sessions, policies, agents |
| **Demo** | Paired scripts: unprotected spend loop vs Sentinel-protected agent |
| **x402** | x402 v2, `exact` scheme, Stellar testnet/mainnet via hosted facilitator |
| **Data** | Supabase: policies, agents, consensus config, transactions, votes, MPP sessions |

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) **20+** (LTS recommended)
- [npm](https://www.npmjs.com/) **10+** (workspaces; root pins `packageManager` in `package.json`)
- [Supabase](https://supabase.com/) project (URL + anon key for dashboard, service role for API/SDK)
- **Facilitator API key** (testnet): [Generate testnet key](https://channels.openzeppelin.com/testnet/gen)

Optional:

- [Supabase CLI](https://supabase.com/docs/guides/cli) for `npm run supabase:start` / `npm run db:migrate` when using local or linked projects

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Oppia-Software-Labs/sentinel.git
   cd sentinel
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the workspace** (compiles `@sentinel/sdk` and Next apps)

   ```bash
   npm run build
   ```

4. **Configure environment variables**

   Copy values from [`.env.example`](./.env.example) into:

   | File | Purpose |
   | --- | --- |
   | `apps/shieldpay-api/.env.local` | Facilitator URL + API key, Trustless Work, Supabase service role, Slack webhook |
   | `apps/dashboard/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

   **Hosted facilitator (testnet)** — set at minimum:

   ```env
   OZ_RELAYER_URL=https://channels.openzeppelin.com/x402/testnet
   OZ_RELAYER_API_KEY=<your_key>
   ```

   Do **not** commit `.env` or `.env.local`. They are gitignored.

5. **Apply database migrations** (when migrations exist in `supabase/migrations/`)

   ```bash
   npm run supabase:start   # optional: local Supabase
   npm run db:migrate       # supabase db push
   ```

6. **Start development**

   ```bash
   npm run dev
   ```

   | App | Port | URL |
   | --- | --- | --- |
   | Dashboard | 3000 | [http://localhost:3000](http://localhost:3000) |
   | ShieldPay API | 4000 | [http://localhost:4000](http://localhost:4000) |

   Run a single app:

   ```bash
   npm run dev:dashboard
   npm run dev:api
   ```

### Demo scripts

```bash
npm run loop -w demo        # unprotected loop (stub / wiring TBD)
npm run protected -w demo   # Sentinel-aware agent (stub / wiring TBD)
```

## Project structure

Monorepo: [Turborepo](https://turbo.build/repo) + **npm workspaces**.

```
sentinel/
├── .env.example                 # Template for all env vars (copy into app .env.local)
├── turbo.json                   # Turbo pipeline (build, dev)
├── package.json                 # Root scripts + workspaces
├── tsconfig.json                # Base TypeScript config
│
├── supabase/
│   └── migrations/              # SQL migrations (e.g. initial schema)
│
├── packages/
│   └── sentinel-sdk/            # @sentinel/sdk
│       ├── src/
│       │   ├── types.ts         # Shared domain types (contract for all apps)
│       │   ├── index.ts
│       │   ├── consensus/       # Quorum, coordinator, registry (WIP)
│       │   ├── policy/          # Policy engine (WIP)
│       │   └── escrow/          # Trustless Work (WIP)
│       └── package.json
│
├── apps/
│   ├── shieldpay-api/           # Next.js 15 — API + proxy (port 4000)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/proxy/verify/route.ts
│   │       │   └── api/proxy/settle/route.ts
│   │       └── lib/
│   │           ├── agents/      # Risk, Cost, Logic agents (WIP)
│   │           ├── mpp/         # MPP session manager (WIP)
│   │           └── supabase/    # Server Supabase client
│   │
│   ├── dashboard/               # Next.js 15 — UI (port 3000)
│   │   └── src/
│   │       ├── app/dashboard/
│   │       ├── components/
│   │       └── lib/supabase/    # Browser Supabase client
│   │
│   └── demo/                    # CLI demo agents (tsx)
│       ├── loop-agent.ts
│       └── protected-agent.ts                   # dashboard + demo
└── README.md
```

## Available scripts

### Root

| Script | Description |
| --- | --- |
| `npm run dev` | Turbo `dev` (dashboard, shieldpay-api, SDK watch) |
| `npm run build` | Production build for all packages that define `build` |
| `npm run dev:api` | `turbo dev --filter=shieldpay-api` |
| `npm run dev:dashboard` | `turbo dev --filter=dashboard` |
| `npm run supabase:start` | `supabase start` |
| `npm run supabase:stop` | `supabase stop` |
| `npm run db:migrate` | `supabase db push` |

### Workspace examples

| Command | Description |
| --- | --- |
| `npm run loop -w demo` | Run `demo` package `loop` script |
| `npm run protected -w demo` | Run `demo` package `protected` script |

## Technology stack

### Applications & tooling

| Technology | Role |
| --- | --- |
| **Next.js 15** | App Router for `shieldpay-api` and `dashboard` |
| **React 19** | UI |
| **TypeScript 5.7** | Shared typing across workspaces |
| **Turborepo** | Task orchestration |
| **npm workspaces** | `@sentinel/sdk` linked via `file:../../packages/sentinel-sdk` |

### Governance & data

| Technology | Role |
| --- | --- |
| **Supabase** | Postgres + Realtime for transactions, votes, sessions, policies |
| **Trustless Work** | Escrow API (fund / release / refund) during governance |
| **@stellar/mpp** | MPP flows on Stellar (with compatible `@stellar/stellar-sdk` / `mppx` peers) |

### Payments (x402)

| Item | Detail |
| --- | --- |
| **Hosted facilitator** | `https://channels.openzeppelin.com/x402/testnet` (testnet) |
| **Endpoints** | `/verify`, `/settle`, `/supported` (x402 v2) |
| **Auth** | `Authorization: Bearer <OZ_RELAYER_API_KEY>` |

Self-hosting a Relayer + plugin is optional; see [OpenZeppelin facilitator guide](https://docs.openzeppelin.com/relayer/1.4.x/guides/stellar-x402-facilitator-guide).

## Architecture (high level)

```
Agent  →  HTTP  →  ShieldPay API (proxy)
                      ↓
              Sentinel (@sentinel/sdk): policy + consensus + escrow
                      ↓
              If approve → HTTPS to hosted x402 facilitator (/verify, /settle)
                      ↓
              Stellar settlement
```

## Environment configuration

- **Template:** [`.env.example`](./.env.example)
- **Facilitator docs:** [Built on Stellar x402](https://developers.stellar.org/docs/build/agentic-payments/x402/built-on-stellar)

Required groups:

1. **ShieldPay API** — facilitator base URL + API key, Trustless Work, Supabase service role, `STELLAR_NETWORK`, optional `SLACK_WEBHOOK_URL`.
2. **Dashboard** — public Supabase URL and anon key only.

## Contributing

1. Fork the repository and create a branch (`feature/…` or `fix/…`).
2. Keep changes scoped; match existing TypeScript and Next patterns.
3. Run `npm run build` before opening a PR.
4. Open a Pull Request against the main development branch.

## Links

- [Stellar — x402 on Stellar](https://developers.stellar.org/docs/build/agentic-payments/x402)
- [Built on Stellar facilitator](https://developers.stellar.org/docs/build/agentic-payments/x402/built-on-stellar)
- [Trustless Work](https://docs.trustlesswork.com)
- [Stellar MPP](https://developers.stellar.org/docs/build/agentic-payments/mpp)
- [Turborepo](https://turbo.build/repo/docs)
- [Next.js](https://nextjs.org/docs)

## Support

Open an issue on [GitHub](https://github.com/Oppia-Software-Labs/sentinel/issues) for bugs or integration questions.

---

<p align="center">
  Built by <strong>Oppia Labs</strong>
</p>
