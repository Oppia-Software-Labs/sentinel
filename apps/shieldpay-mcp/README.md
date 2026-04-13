# Sentinel MCP Server (`@oppialabs/sentinel-mcp`)

MCP server that exposes Sentinel governance and payment tooling to MCP clients (Claude Code, Cursor, etc.) over stdio.

The server provides 4 tools:

1. `request_payment` — run a payment request through Sentinel governance (consensus + policy), with optional x402 resource fetch.
2. `get_policy` — read current spending policy.
3. `get_transactions` — fetch recent governed transactions.
4. `register_agent` — register a hosted voting agent (OpenAI/Anthropic) in Sentinel.

## Requirements

- Node.js 20+
- A Sentinel API key (`x-sentinel-key`), available from: https://app.sentinel.xyz/dashboard/settings

## Environment variables

Create `apps/shieldpay-mcp/.env` (or set env vars in your MCP client config):

```env
# Required
SENTINEL_API_KEY=sk_live_...

# Optional
SENTINEL_API_URL=
SENTINEL_AGENT_ID=claude-code
```

Defaults in code:

- `SENTINEL_AGENT_ID` defaults to `claude-code`

## Local development

From repo root:

```bash
npm install
npm run dev -w shieldpay-mcp
```

Build + run:

```bash
npm run build -w shieldpay-mcp
npm run start -w shieldpay-mcp
```

## MCP client setup

### Claude Code

Install from npm:

```bash
claude mcp add shieldpay -- npx @oppialabs/sentinel-mcp -e SENTINEL_API_KEY=sk_live_...
```

Or run local build:

```bash
claude mcp add shieldpay \
  --scope user \
  -e SENTINEL_API_KEY=sk_live_... \
  -e SENTINEL_API_URL=http://localhost:4000 \
  -e SENTINEL_AGENT_ID=claude-code \
  -- node /absolute/path/to/sentinel/apps/shieldpay-mcp/dist/index.js
```

## Tool details

### `request_payment`

Submits a payment intent to:

- `POST /api/proxy/settle`

Inputs:

- `vendor` (string)
- `amount` (number, USDC)
- `task_description` (string)
- `asset_code` (string, default `USDC`)
- `resource_url` (optional URL to x402-protected resource)
- `resource_method` (`GET` or `POST`, default `GET`)
- `resource_body` (optional JSON object for POST)

Returns approved/rejected decision, vote summaries, tx/escrow metadata, and optional fetched resource payload.

### `get_policy`

Reads policy from:

- `GET /api/me/policy`

Formats limits and blocked vendors for quick operator review.

### `get_transactions`

Reads transaction history from:

- `GET /api/me/transactions?limit=...` (`1-50`, default `10`)

Returns a compact timeline of recent approved/rejected requests.

### `register_agent`

Registers a hosted LLM voting agent via:

- `POST /api/agents`

Inputs:

- `agent_id`
- `provider` (`openai` or `anthropic`)
- `api_key`
- `model` (default `gpt-4o-mini`)
- `system_prompt`
- `description` (optional)

## Error behavior

- Missing `SENTINEL_API_KEY` returns explicit tool errors.
- Upstream API failures are returned with status details.
- For rejected payments, vote reasons are included when available.
