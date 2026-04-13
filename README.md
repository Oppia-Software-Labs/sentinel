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

Autonomous agents can burn API and on-chain budget in loops, retry storms, or bad deploys. Documented incidents run to **tens of thousands of USD in days**. Sentinel + ShieldPay aim to **block or throttle before settlement**, with alerts and operator controls (e.g. kill-switch) where the product specifies them.

## Features (MVP target)

| Area | Description |
| --- | --- |
| **@oppialabs/sentinel-sdk** | Shared types, policy engine, consensus coordinator, agent registry (**no escrow**) |
| **ShieldPay API** | Trustless Work escrow (fund / release / refund), proxy `/verify` · `/settle` to the hosted facilitator, MPP session hooks, built-in voting agents |
| **MCP Server** | 4 tools for Claude Code: `request_payment`, `get_policy`, `get_transactions`, `register_agent` |
| **Dashboard** | Next.js UI, Supabase Realtime for transactions, votes, MPP sessions, policies, agents |
| **x402** | x402 v2, `exact` scheme, Stellar testnet/mainnet via hosted facilitator |
| **Hosted Agents** | LLM-backed consensus agents (OpenAI / Anthropic) with encrypted key storage |
| **Notifications** | Webhook (HMAC-SHA256) + Email via Resend; 5 event types |
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

3. **Build the workspace** (compiles `@oppialabs/sentinel-sdk` and Next apps)

   ```bash
   npm run build
   ```

4. **Configure environment variables**

   Each app has its own `.env.example` — copy it to `.env.local` and fill in the values:

   ```bash
   cp apps/shieldpay-api/.env.example apps/shieldpay-api/.env.local
   cp apps/dashboard/.env.example apps/dashboard/.env.local
   cp apps/shieldpay-mcp/.env.example apps/shieldpay-mcp/.env.local
   ```

   | File | Purpose |
   | --- | --- |
   | `apps/shieldpay-api/.env.local` | Facilitator URL + API key, Trustless Work, Supabase service role, Soroban contract |
   | `apps/dashboard/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `apps/shieldpay-mcp/.env.local` | `SHIELDPAY_API_URL`, `SHIELDPAY_OWNER_ID`, `SHIELDPAY_AGENT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

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

### MCP server setup (Claude Code)

The MCP server exposes ShieldPay to Claude Code as 4 callable tools.

1. **Build and start**

   ```bash
   # production
   npm run build -w shieldpay-mcp
   npm run start -w shieldpay-mcp

   # or development (watch mode)
   npm run dev -w shieldpay-mcp
   ```

2. **Required env vars** (in `apps/shieldpay-mcp/.env.local`)

   ```env
   SHIELDPAY_API_URL=http://localhost:4000
   SHIELDPAY_OWNER_ID=<your_owner_id>
   SHIELDPAY_AGENT_ID=<your_agent_id>
   SUPABASE_URL=<your_supabase_url>
   SUPABASE_ANON_KEY=<your_supabase_anon_key>
   ```

3. **Wire into Claude Code** — register with the Claude Code CLI:

   ```bash
   claude mcp add shieldpay \
     --scope user \
     -e SHIELDPAY_API_URL=http://localhost:4000 \
     -e SHIELDPAY_OWNER_ID=<your_owner_id> \
     -e SHIELDPAY_AGENT_ID=claude-code \
     -e SUPABASE_URL=<your_supabase_url> \
     -e SUPABASE_ANON_KEY=<your_supabase_anon_key> \
     -- node <absolute_path_to_sentinel>/apps/shieldpay-mcp/dist/index.js
   ```

   Verify it connected: `claude mcp get shieldpay`

   Available MCP tools: `request_payment`, `get_policy`, `get_transactions`, `register_agent`.

## API endpoints

### ShieldPay API (`apps/shieldpay-api`, port 4000)

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/proxy/verify` | POST | Policy-only check; forwards to OZ Relayer if approved |
| `/api/proxy/settle` | POST | Full consensus + policy + escrow + x402 settlement. Supports `resourceUrl` for auto-fetch |
| `/api/agents` | GET | List agents for an owner (`?ownerId=`) |
| `/api/agents` | POST | Register agent (custom HTTP endpoint or hosted LLM) |
| `/api/agents` | DELETE | Deactivate an agent |
| `/api/agents/risk` | POST | Built-in risk agent (retry storm / velocity detection) |
| `/api/agents/cost` | POST | Built-in cost agent (daily / hourly / per-tx caps) |
| `/api/agents/logic` | POST | Built-in logic agent (LLM semantic validation via OpenAI) |
| `/api/agents/hosted` | POST | Invoke a registered hosted LLM agent |
| `/api/agents/test` | POST | Validate LLM config (API key + sample run) before registration |
| `/api/mpp` | POST | MPP session lifecycle: `open`, `charge`, `close`, `kill`, `kill_all` |
| `/api/notifications/dispatch` | POST | Internal notification dispatch (webhook + email) |
| `/api/openapi` | GET | OpenAPI 3.0 spec |

### Dashboard API (`apps/dashboard`, port 3000)

Browser-side proxies + UI helpers:

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/agents` | POST / DELETE | Proxy to ShieldPay agent routes |
| `/api/policy` | POST | Mirror policy to Supabase |
| `/api/kill` | POST | Trigger kill-all MPP sessions |
| `/api/notifications/config` | GET / POST / DELETE | Manage notification configs |
| `/api/notifications/test` | POST | Test-dispatch a notification |

## Repository architecture

[Turborepo](https://turbo.build/repo) + **npm workspaces**. Clear **package boundaries**:

| Layer | Location | Responsibility |
| --- | --- | --- |
| **On-chain governance** | `contracts/sentinel-governance` | Soroban contract (Rust, `soroban-sdk`): policy, quorum, agent registry, verdicts. **Not** an npm workspace; build and deploy with the Soroban/Stellar toolchain. |
| **Governance library** | `packages/sentinel-sdk` | Types, `verify` / `evaluate`, `SorobanClient`, policy, consensus, Supabase mirror. Invokes the contract over RPC. **No** Trustless Work, **no** HTTP to the x402 facilitator. |
| **Payments API** | `apps/shieldpay-api` | HTTP entry from agents. Calls `@oppialabs/sentinel-sdk`, then **escrow** (Trustless Work), **facilitator** (`/verify`, `/settle`), **MPP** routes, built-in voting agents. |
| **MCP Server** | `apps/shieldpay-mcp` | MCP server for Claude Code. Exposes ShieldPay as 4 tools. |
| **Dashboard** | `apps/dashboard` | Next.js UI + Supabase Realtime (browser client only). |

**Dependency rule:** `apps/*` may depend on `packages/sentinel-sdk`. The SDK **must not** depend on `apps/*` or call Trustless Work / facilitator URLs (those stay in ShieldPay API). The contract crate under `contracts/` is independent of npm workspaces.

```
                    ┌─────────────────────────────────────┐
                    │       apps/shieldpay-api            │
  Agents ──HTTP──►  │  proxy · escrow · facilitator · MPP │
                    └──────────────┬──────────────────────┘
                                   │ import
                                   ▼
                    ┌─────────────────────────────────────┐
                    │     packages/sentinel-sdk           │
                    │  types · soroban · policy ·         │
                    │  consensus · supabase mirror        │
                    └──────────────┬──────────────────────┘
                                   │ RPC / transactions
                                   ▼
                    ┌─────────────────────────────────────┐
                    │ contracts/sentinel-governance        │
                    │ Soroban wasm (testnet / deploy)      │
                    └─────────────────────────────────────┘

          ┌────────────────────────┬────────────────────────┐
          ▼                        ▼
   apps/dashboard            Supabase
   (Realtime UI)            (Postgres mirror)

   apps/shieldpay-mcp
   (MCP tools for Claude Code)
```

## Directory layout

```
sentinel/
├── package.json                 # workspaces, turbo scripts, packageManager
├── turbo.json
├── tsconfig.json
├── package-lock.json
├── .gitignore
├── README.md
│
├── supabase/
│   └── migrations/
│       ├── 20260410120000_initial_schema.sql
│       ├── 20260410130000_mpp_sessions_lifecycle_columns.sql
│       ├── 20260410140000_transactions_add_soroban_tx_id.sql
│       ├── 20260410150000_mpp_sessions_owner_id_to_text.sql
│       └── 20260410160000_owner_id_to_text.sql
│
├── contracts/
│   └── sentinel-governance/     # Soroban smart contract (Rust cdylib)
│       ├── Cargo.toml           # soroban-sdk 25.x
│       └── src/
│           ├── lib.rs           # contract entry
│           ├── types.rs
│           ├── errors.rs
│           └── test.rs
│
├── packages/
│   └── sentinel-sdk/            # @oppialabs/sentinel-sdk — publishable-style package
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts         # verify(), evaluate(), re-exports
│           ├── types.ts         # shared domain types
│           ├── soroban/         # SorobanClient, loadSorobanConfig
│           ├── policy/          # evaluatePolicy (engine)
│           ├── consensus/       # coordinator, registry, quorum
│           └── supabase/        # mirrorTransaction, mirrorVotes, mirrorAgent, mirrorPolicy
│
└── apps/
    ├── shieldpay-api/           # Next.js 15, port 4000
    │   ├── .env.example
    │   ├── README.md            # API docs (endpoints, env vars)
    │   └── src/
    │       ├── app/
    │       │   ├── docs/page.tsx            # Swagger UI
    │       │   └── api/
    │       │       ├── openapi/route.ts     # OpenAPI spec
    │       │       ├── proxy/verify/route.ts
    │       │       ├── proxy/settle/route.ts
    │       │       ├── agents/route.ts      # register + list + deactivate agents
    │       │       ├── agents/risk/route.ts
    │       │       ├── agents/cost/route.ts
    │       │       ├── agents/logic/route.ts
    │       │       ├── agents/hosted/route.ts
    │       │       ├── agents/test/route.ts
    │       │       ├── mpp/route.ts
    │       │       └── notifications/dispatch/route.ts
    │       └── lib/
    │           ├── escrow/trustless-work.ts # fund / release / refund
    │           ├── mpp/session-manager.ts   # MPP lifecycle + Supabase mirror
    │           └── supabase/server.ts       # service role client
    │
    ├── shieldpay-mcp/           # MCP server for Claude Code
    │   ├── package.json
    │   ├── .env.example
    │   └── src/
    │       └── index.ts         # 4 MCP tools
    │
    └── dashboard/               # Next.js 15, port 3000
        └── .env.example
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

### MCP server

| Command | Description |
| --- | --- |
| `npm run build -w shieldpay-mcp` | Compile MCP server |
| `npm run start -w shieldpay-mcp` | Run compiled MCP server |
| `npm run dev -w shieldpay-mcp` | Run MCP server in watch mode |

## Technology stack

### Applications & tooling

| Technology | Role |
| --- | --- |
| **Next.js 15** | App Router for `shieldpay-api` and `dashboard` |
| **React 19** | UI |
| **TypeScript 5.7** | Shared typing across workspaces |
| **Turborepo** | Task orchestration |
| **npm workspaces** | `@oppialabs/sentinel-sdk` linked via `file:../../packages/sentinel-sdk` |

### Governance & data

| Technology | Role |
| --- | --- |
| **Soroban (`contracts/sentinel-governance`)** | On-chain policy, quorum, agent registry, verdicts; invoked by `@oppialabs/sentinel-sdk` over RPC |
| **Supabase** | Postgres + Realtime for transactions, votes, sessions, policies |
| **Trustless Work** | Escrow API used **from ShieldPay API** after Sentinel approves (fund / release / refund) |
| **@stellar/mpp** | MPP flows on Stellar (with compatible `@stellar/stellar-sdk` / `mppx` peers) |
| **Resend** | Email delivery for notifications |
| **OpenAI / Anthropic** | Hosted LLM agents (`gpt-4o-mini`, `claude-*` models) for consensus voting |

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
              @oppialabs/sentinel-sdk: verify (policy) or evaluate (policy + consensus)
                      ↓
              Soroban contract (`contracts/sentinel-governance`) via RPC / txs
                      ↓
              If reject → response to agent (no escrow)
              If approve → ShieldPay: Trustless Work fund-escrow
                      ↓
              HTTPS → hosted x402 facilitator (/verify or /settle as designed)
                      ↓
              Stellar settlement → ShieldPay: release or refund escrow
```

## Environment configuration

- **API template:** [`apps/shieldpay-api/.env.example`](./apps/shieldpay-api/.env.example)
- **Dashboard template:** [`apps/dashboard/.env.example`](./apps/dashboard/.env.example)
- **MCP template:** [`apps/shieldpay-mcp/.env.example`](./apps/shieldpay-mcp/.env.example)
- **Facilitator docs:** [Built on Stellar x402](https://developers.stellar.org/docs/build/agentic-payments/x402/built-on-stellar)

Required groups:

1. **ShieldPay API** — facilitator base URL + API key, Trustless Work, Supabase service role, `STELLAR_NETWORK`, optional notification vars.
2. **Dashboard** — public Supabase URL and anon key only.
3. **MCP Server** — `SHIELDPAY_API_URL`, `SHIELDPAY_OWNER_ID`, `SHIELDPAY_AGENT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Documentation for contributors

| Doc | Purpose |
| --- | --- |
| [apps/shieldpay-api/README.md](./apps/shieldpay-api/README.md) | ShieldPay API endpoint docs |
| [apps/shieldpay-mcp/README.md](./apps/shieldpay-mcp/README.md) | MCP server setup and tool reference |

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
