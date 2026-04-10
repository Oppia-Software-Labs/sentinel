# ShieldPay API

HTTP gateway between AI agents and the Stellar payment infrastructure. All routes are `POST` (or `GET` where noted). Runs on **port 4000**.

Interactive docs: [`http://localhost:4000/docs`](http://localhost:4000/docs)

---

## Architecture summary

```
AI Agent
   │
   ▼
POST /api/proxy/verify  ──►  @sentinel/sdk verify()  ──►  Soroban policy check
POST /api/proxy/settle  ──►  @sentinel/sdk evaluate() ──►  Soroban consensus + policy
                                    │
                              Trustless Work (escrow)
                                    │
                              OZ Relayer (x402 facilitator)
                                    │
                              Stellar settlement
```

---

## Proxy routes

### `POST /api/proxy/verify`

**What it does:** Quick pre-flight check before a payment. Runs only the Soroban **policy** (no agent voting). If policy allows it, forwards the request to the OZ Relayer `/verify` endpoint.

**When to use it:** When the agent wants to validate a payment intent before committing. Cheaper than `/settle` — no escrow, no consensus.

**Request:**
```json
{
  "ownerId": "GXXX...",
  "intent": {
    "agentId": "my-agent",
    "ownerId": "GXXX...",
    "amount": 5,
    "assetCode": "USDC",
    "vendor": "openai",
    "taskDescription": "Generate embeddings for document"
  }
}
```

**Responses:**
- `200` — Policy approved, relayer responded OK
- `402` — Policy rejected the payment (reason in body)
- `502` — Soroban or relayer unreachable

---

### `POST /api/proxy/settle`

**What it does:** Full payment flow. Runs multi-agent **consensus + policy** on Soroban. If approved: funds a Trustless Work escrow, forwards to OZ Relayer `/settle`, and releases escrow on success. If the relayer fails, refunds escrow automatically.

**When to use it:** When the agent is ready to actually pay. This is the main payment endpoint.

**Request:** Same shape as `/verify`.

**Response `200`:**
```json
{
  "decision": "approve",
  "sorobanTxId": "abc123...",
  "escrowId": "CXXX..."
}
```

**Responses:**
- `200` — Payment settled, escrow released
- `402` — Rejected by consensus or policy (escrow never funded)
- `502` — Escrow or relayer error (escrow refunded automatically)

---

## Agent routes

Agents are HTTP microservices that **vote** on payment intents. Each one receives the intent + spend context and returns `approve` or `reject`. The consensus coordinator calls all registered agents in parallel during `/settle`.

**All agent endpoints share the same contract:**

**Request:**
```json
{
  "intent": {
    "agentId": "my-agent",
    "ownerId": "GXXX...",
    "amount": 5,
    "assetCode": "USDC",
    "vendor": "openai",
    "taskDescription": "Generate embeddings"
  },
  "context": {
    "totalSpentToday": 50,
    "totalSpentHour": 10
  }
}
```

**Response:**
```json
{ "decision": "approve", "reason": "No anomalous patterns detected" }
```

---

### `POST /api/agents/risk`

**What it does:** Detects anomalous payment patterns that suggest something is broken or malicious.

**Checks:**
1. **Retry storm** — rejects if the same request hits `X-Request-Count` times in a short window (default: 5)
2. **Velocity loop** — rejects if the hourly spend is an exact multiple of the payment amount (agent looping)
3. **Spike detection** — rejects if the payment is `RISK_VELOCITY_MULTIPLIER`x (default 3x) larger than the current hourly rate

---

### `POST /api/agents/cost`

**What it does:** Enforces USDC spend budgets at runtime, complementing the on-chain policy with real-time context.

**Checks:**
1. **Single payment cap** — rejects if `amount > COST_SINGLE_PAYMENT_CAP` (default: 50 USDC)
2. **Hourly cap** — rejects if `totalSpentHour + amount > COST_HOURLY_CAP` (default: 100 USDC)
3. **Daily cap** — rejects if `totalSpentToday + amount > COST_DAILY_CAP` (default: 500 USDC)

---

### `POST /api/agents/logic`

**What it does:** Validates that the payment intent makes semantic sense. Blocks obviously malformed or malicious intents before they reach the chain.

**Checks:**
1. **Vendor** — rejects if empty or in the suspicious vendor list (`test`, `null`, `admin`, etc.)
2. **Amount** — rejects if not a positive finite number
3. **Asset code** — rejects if not in `LOGIC_SUPPORTED_ASSETS` (default: `USDC,USDT,XLM`)
4. **Task description** — rejects if too short (< 5 chars) or contains injection patterns (`<script>`, `ignore previous instructions`, etc.)

---

### `GET /api/agents?ownerId=GXXX...`

**What it does:** Lists all agents registered in Soroban for a given owner (both ShieldPay built-in and custom).

---

### `POST /api/agents`

**What it does:** Registers a new agent in the Soroban contract. Once registered, the agent's endpoint will be called automatically during every `/settle` consensus round.

**This is how companies plug in their own agents** — built with LangChain, AutoGen, or any framework. They only need to expose an HTTP endpoint that accepts the agent input contract and returns `{ decision, reason }`.

**Request:**
```json
{
  "ownerId": "GXXX...",
  "agentId": "my-langchain-agent",
  "endpoint": "https://my-company.com/my-agent",
  "description": "Custom fraud detection agent",
  "type": "custom"
}
```

**Response:**
```json
{ "ok": true, "agentId": "my-langchain-agent", "endpoint": "https://my-company.com/my-agent" }
```

---

## MPP route

### `POST /api/mpp`

**What it does:** Manages Multi-Party Payment session lifecycle. Sessions track spend accumulation per agent and auto-kill when a configurable limit is exceeded. State is kept in-process and mirrored to Supabase (`mpp_sessions` table) for the dashboard.

All actions go through this single route via an `action` field.

---

**`open` — Start a new session**
```json
{ "action": "open", "agentId": "agent-1", "ownerId": "GXXX..." }
```
Response: `{ "sessionId": "uuid" }`

---

**`charge` — Record a spend against a session**
```json
{ "action": "charge", "sessionId": "uuid", "amount": 10 }
```
If `totalCharged >= MPP_SESSION_KILL_LIMIT` (default 100 USDC), the session is **auto-killed**.

---

**`close` — Normal session close**
```json
{ "action": "close", "sessionId": "uuid" }
```

---

**`kill` — Force kill a session**
```json
{ "action": "kill", "sessionId": "uuid", "reason": "Anomaly detected" }
```

---

**`kill_all` — Kill-switch (used by dashboard)**

Kills all active sessions, optionally filtered by owner.
```json
{ "action": "kill_all" }
{ "action": "kill_all", "ownerId": "GXXX..." }
```

---
