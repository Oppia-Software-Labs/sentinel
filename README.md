<h1 align="center">Sentinel + ShieldPay</h1>

<p align="center">
  <strong>Governance and payments for AI agents on x402 and MPP (Stellar)</strong>
</p>

<p align="center">
  Multi-agent consensus · Spend policies · Escrow · x402 facilitator · Real-time dashboard
</p>

---

## Overview

**Sentinel** is the governance layer. It answers whether a payment is allowed: multi-agent voting, spend rules (policy), and a clear **approve** or **reject** outcome. **It does not move funds** or call Trustless Work.

**ShieldPay** is the payments layer. After Sentinel approves, it **funds escrow** (Trustless Work), proxies HTTP to the **hosted x402 facilitator** (OpenZeppelin + Stellar on `channels.openzeppelin.com`), forwards **verify** / **settle**, releases or refunds escrow as needed, and coordinates MPP-style session logic for the MVP.

Together they form one stack; either piece can be discussed on its own for integrators.

## The problem

Autonomous agents can burn API and on-chain budget in loops, retry storms, or bad deploys. Documented incidents run to **tens of thousands of USD in days**. Sentinel + ShieldPay aim to **block or throttle before settlement**, with alerts (e.g. Slack) and operator controls (e.g. kill-switch) where the product specifies them.

## Features (MVP target)

| Area | Description |
| --- | --- |
| **@sentinel/sdk** | Shared types, policy engine, consensus coordinator, agent registry (**no escrow**) |
| **ShieldPay API** | Trustless Work escrow (fund / release / refund), proxy `/verify` · `/settle` to the hosted facilitator, MPP session hooks |
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

## Repository architecture

[Turborepo](https://turbo.build/repo) + **npm workspaces**. Clear **package boundaries**:

| Layer | Location | Responsibility |
| --- | --- | --- |
| **Governance library** | `packages/sentinel-sdk` | Types, `verify` / `evaluate`, policy, consensus, Supabase reads/writes for governance data. **No** Trustless Work, **no** HTTP to the x402 facilitator. |
| **Payments API** | `apps/shieldpay-api` | HTTP entry from agents. Calls `@sentinel/sdk`, then **escrow** (Trustless Work), **facilitator** (`/verify`, `/settle`), **MPP** routes, built-in voting agents. |
| **Dashboard** | `apps/dashboard` | Next.js UI + Supabase Realtime (browser client only). |
| **Demo** | `apps/demo` | CLI scripts; consumes types / SDK as needed. |

**Dependency rule:** `apps/*` may depend on `packages/sentinel-sdk`. The SDK **must not** depend on `apps/*` or call Trustless Work / facilitator URLs (those stay in ShieldPay API).

```
                    ┌─────────────────────────────────────┐
                    │       apps/shieldpay-api            │
  Agents ──HTTP──►  │  proxy · escrow · facilitator · MPP │
                    └──────────────┬──────────────────────┘
                                   │ import
                                   ▼
                    ┌─────────────────────────────────────┐
                    │     packages/sentinel-sdk           │
                    │  types · policy · consensus · DB    │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   apps/dashboard            Supabase                  (no TW / x402
   (Realtime UI)            (Postgres)                    in SDK)
```

## Directory layout

```
sentinel/
├── package.json                 # workspaces, turbo scripts, packageManager
├── turbo.json
├── tsconfig.json
├── package-lock.json
├── .env.example                 # copy sections → apps/*/.env.local
├── .gitignore
│
├── SENTINEL_CONTEXT.md          # full product + technical context (source of truth)
├── MATIAS.md                    # ShieldPay API + monorepo owner tasks
├── SANTIAGO.md                  # @sentinel/sdk + migrations
├── FABIAN.md                    # dashboard + demo
├── README.md
│
├── supabase/
│   └── migrations/              # SQL (RLS, Realtime); e.g. initial schema
│
├── packages/
│   └── sentinel-sdk/            # @sentinel/sdk — publishable-style package
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts         # public exports
│           ├── types.ts         # shared domain types (team contract)
│           ├── consensus/       # coordinator, registry, quorum (Santiago)
│           └── policy/          # engine.ts (Santiago)
│
└── apps/
    ├── shieldpay-api/           # Next.js 15, port 4000
    │   ├── package.json
    │   ├── next.config.ts
    │   ├── tsconfig.json
    │   └── src/
    │       ├── app/
    │       │   ├── layout.tsx
    │       │   ├── page.tsx
    │       │   └── api/
    │       │       ├── proxy/
    │       │       │   ├── verify/route.ts   # policy shortcut + forward /verify
    │       │       │   └── settle/route.ts   # evaluate + escrow + /settle
    │       │       └── mpp/route.ts          # MPP + kill-switch (WIP)
    │       └── lib/
    │           ├── escrow/
    │           │   └── trustless-work.ts     # fund / release / refund
    │           ├── agents/                   # risk, cost, logic (WIP)
    │           ├── mpp/
    │           │   └── session-manager.ts  # MPP lifecycle (WIP)
    │           └── supabase/
    │               └── server.ts             # service role client
    │
    ├── dashboard/               # Next.js 15, port 3000
    │   ├── package.json
    │   ├── next.config.ts
    │   └── src/
    │       ├── app/
    │       │   ├── layout.tsx
    │       │   ├── page.tsx
    │       │   ├── globals.css
    │       │   └── dashboard/
    │       │       └── page.tsx
    │       ├── components/
    │       └── lib/
    │           └── supabase/
    │               └── client.ts             # anon + Realtime
    │
    └── demo/
        ├── package.json
        ├── tsconfig.json
        ├── loop-agent.ts
        └── protected-agent.ts
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
| **Trustless Work** | Escrow API used **from ShieldPay API** after Sentinel approves (fund / release / refund) |
| **@stellar/mpp** | MPP flows on Stellar (with compatible `@stellar/stellar-sdk` / `mppx` peers) |

### Payments (x402)

| Item | Detail |
| --- | --- |
| **Hosted facilitator** | `https://channels.openzeppelin.com/x402/testnet` (testnet) |
| **Endpoints** | `/verify`, `/settle`, `/supported` (x402 v2) |
| **Auth** | `Authorization: Bearer <OZ_RELAYER_API_KEY>` |

Self-hosting a Relayer + plugin is optional; see [OpenZeppelin facilitator guide](https://docs.openzeppelin.com/relayer/1.4.x/guides/stellar-x402-facilitator-guide).

## Runtime flow (high level)

```
Agent  →  HTTP  →  ShieldPay API (proxy)
                      ↓
              @sentinel/sdk: verify (policy) or evaluate (policy + consensus)
                      ↓
              If reject → response to agent (no escrow)
              If approve → ShieldPay: Trustless Work fund-escrow
                      ↓
              HTTPS → hosted x402 facilitator (/verify or /settle as designed)
                      ↓
              Stellar settlement → ShieldPay: release or refund escrow
```

## Environment configuration

- **Template:** [`.env.example`](./.env.example)
- **Facilitator docs:** [Built on Stellar x402](https://developers.stellar.org/docs/build/agentic-payments/x402/built-on-stellar)

Required groups:

1. **ShieldPay API** — facilitator base URL + API key, Trustless Work, Supabase service role, `STELLAR_NETWORK`, optional `SLACK_WEBHOOK_URL`.
2. **Dashboard** — public Supabase URL and anon key only.

## Documentation for contributors

| Doc | Purpose |
| --- | --- |
| [SENTINEL_CONTEXT.md](./SENTINEL_CONTEXT.md) | Vision, architecture diagrams, Supabase schema, env, links |
| [MATIAS.md](./MATIAS.md) | ShieldPay API, escrow module, facilitator, MPP |
| [SANTIAGO.md](./SANTIAGO.md) | `@sentinel/sdk`, migrations, policy, consensus |
| [FABIAN.md](./FABIAN.md) | Dashboard UI, demo scripts, judge-facing polish |

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
