#!/usr/bin/env node
/**
 * Sentinel MCP Server  (@oppialabs/sentinel-mcp)
 *
 * Connects Claude Code (or any MCP client) to Sentinel's governance layer.
 * Every payment Claude wants to make goes through:
 *   agent voting (risk + cost + AI logic) → Soroban policy → dashboard
 *
 * Setup (one command):
 *   claude mcp add shieldpay -- npx @oppialabs/sentinel-mcp -e SENTINEL_API_KEY=sk_live_...
 *
 * Get your API key at: https://sentinel-dashboard-oppia//dashboard/settings
 *
 * Tools exposed:
 *   - request_payment   Submit a payment intent through governance
 *   - get_policy        Read current spend policy
 *   - get_transactions  See recent payment history
 *   - register_agent    Register a custom AI agent for consensus voting
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_URL  = process.env.SENTINEL_API_URL 
const API_KEY  = process.env.SENTINEL_API_KEY ?? ''
const AGENT_ID = process.env.SENTINEL_AGENT_ID ?? 'claude-code'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-sentinel-key': API_KEY,
  }
}

// ── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'shieldpay',
  version: '0.2.0',
})

// ── Tool: request_payment ─────────────────────────────────────────────────────

server.tool(
  'request_payment',
  'Submit a payment request through Sentinel governance. Agents vote, policy is checked on Soroban, and if approved the payment is executed. Optionally provide a resource_url to a real x402-protected endpoint — Sentinel will govern the payment and then fetch the paid resource automatically.',
  {
    vendor: z.string().describe('The service or API being paid (e.g. "xlm402-com", "openai-api"). If resource_url is provided this can be auto-derived.'),
    amount: z.number().positive().describe('Amount in USDC. If resource_url is provided the exact amount is read from the 402 response.'),
    task_description: z.string().describe('What you are doing and why this payment is needed. The AI governance agent reads this.'),
    asset_code: z.string().default('USDC').describe('Asset code (default: USDC)'),
    resource_url: z.string().url().optional().describe('Optional: a real x402-protected URL. Sentinel will probe it for payment requirements, govern the payment, then fetch and return the resource data.'),
    resource_method: z.enum(['GET', 'POST']).default('GET').describe('HTTP method for the resource (default GET)'),
    resource_body: z.record(z.unknown()).optional().describe('Optional JSON body for POST resources'),
  },
  async ({ vendor, amount, task_description, asset_code, resource_url, resource_method, resource_body }) => {
    if (!API_KEY) {
      return {
        content: [{
          type: 'text',
          text: 'Error: SENTINEL_API_KEY is not configured.\n\nGet your key at https://sentinel-dashboard-oppia//dashboard/settings, then run:\n  claude mcp add shieldpay -- npx @oppialabs/sentinel-mcp -e SENTINEL_API_KEY=sk_live_...',
        }],
        isError: true,
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/proxy/settle`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          intent: {
            agentId: AGENT_ID,
            vendor,
            amount,
            assetCode: asset_code,
            taskDescription: task_description,
          },
          resourceUrl: resource_url,
          resourceMethod: resource_method,
          resourceBody: resource_body,
        }),
      })

      const data = await res.json().catch(() => ({})) as Record<string, unknown>

      if (!res.ok) {
        const errVotes = (data as any).votes as Array<{ agentId: string; decision: string; reason: string }> | undefined
        const votesSummary = errVotes?.length
          ? '\n\nAgent votes:\n' + errVotes.map(v => `  ${v.decision === 'approve' ? '✓' : '✗'}  ${v.agentId}: ${v.reason}`).join('\n')
          : ''
        return {
          content: [{
            type: 'text',
            text: `Sentinel returned HTTP ${res.status}: ${(data as any).error ?? JSON.stringify(data)}${votesSummary}`,
          }],
          isError: true,
        }
      }

      const decision       = (data as any).decision       as string
      const reason         = (data as any).reason         as string | undefined
      const txId           = (data as any).sorobanTxId    as string | undefined
      const stellarTxHash  = (data as any).stellarTxHash  as string | undefined
      const x402TxHash     = (data as any).x402TxHash     as string | undefined
      const escrowId       = (data as any).escrowId       as string | undefined
      const votes          = (data as any).votes          as Array<{ agentId: string; decision: string; reason: string }> | undefined
      const resourceStatus = (data as any).resourceStatus as number | undefined
      const resourceData   = (data as any).resourceData
      const x402Error      = (data as any).x402Error      as string | undefined
      const escrowError    = (data as any).escrowError    as string | undefined

      const votesSummary = votes?.length
        ? '\n\nAgent votes:\n' + votes.map(v => `  ${v.decision === 'approve' ? '✓' : '✗'}  ${v.agentId}: ${v.reason}`).join('\n')
        : ''

      if (decision === 'approve') {
        const resourceSection = resourceData
          ? `\n\nResource response (HTTP ${resourceStatus}):\n${JSON.stringify(resourceData, null, 2).slice(0, 2000)}`
          : ''

        const x402Section = x402Error
          ? `\n\n⚠ x402 payment sent but resource error: ${x402Error}`
          : (x402TxHash ? `  x402 tx      : https://stellar.expert/explorer/testnet/tx/${x402TxHash}` : '')

        return {
          content: [{
            type: 'text',
            text: [
              `✓ Payment approved by Sentinel governance`,
              `  vendor       : ${vendor}`,
              `  amount       : ${amount} ${asset_code}`,
              txId          ? `  soroban id   : ${txId}` : '',
              stellarTxHash ? `  governance tx: https://stellar.expert/explorer/testnet/tx/${stellarTxHash}` : '',
              escrowId      ? `  escrow       : https://stellar.expert/explorer/testnet/contract/${escrowId}` : '',
              escrowError   ? `  ⚠ escrow err : ${escrowError}` : '',
              x402Section,
              votesSummary,
              resourceSection,
            ].filter(Boolean).join('\n'),
          }],
        }
      } else {
        return {
          content: [{
            type: 'text',
            text: [
              `✗ Payment REJECTED by Sentinel governance`,
              `  vendor    : ${vendor}`,
              `  amount    : ${amount} ${asset_code}`,
              `  reason    : ${reason ?? 'no reason provided'}`,
              escrowId   ? `  escrow    : https://stellar.expert/explorer/testnet/contract/${escrowId}` : '',
              votesSummary,
              '',
              'The payment was blocked. Do not proceed with this action.',
            ].filter(Boolean).join('\n'),
          }],
          isError: true,
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{
          type: 'text',
          text: `Failed to reach Sentinel at ${API_URL}: ${message}`,
        }],
        isError: true,
      }
    }
  },
)

// ── Tool: get_policy ──────────────────────────────────────────────────────────

server.tool(
  'get_policy',
  'Read the current spend policy — daily/hourly limits, per-task cap, blocked vendors. Check this before attempting large payments.',
  {},
  async () => {
    if (!API_KEY) {
      return {
        content: [{ type: 'text', text: 'Policy unavailable — SENTINEL_API_KEY not configured.' }],
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/me/policy`, {
        headers: authHeaders(),
      })

      if (!res.ok) {
        return {
          content: [{ type: 'text', text: `Failed to fetch policy: HTTP ${res.status}` }],
          isError: true,
        }
      }

      const { policy } = await res.json()

      if (!policy) {
        return {
          content: [{ type: 'text', text: 'No policy set — all payments will use default limits.' }],
        }
      }

      const toUsdc = (stroops: string | null) =>
        stroops ? `$${(parseInt(stroops) / 10_000_000).toFixed(2)} USDC` : 'unlimited'

      return {
        content: [{
          type: 'text',
          text: [
            'Current spend policy:',
            `  max per task  : ${toUsdc(policy.max_per_task)}`,
            `  max per hour  : ${toUsdc(policy.max_per_hour)}`,
            `  max per day   : ${toUsdc(policy.max_per_day)}`,
            `  blocked vendors: ${(policy.blocked_vendors as string[] | null)?.join(', ') || 'none'}`,
            `  alert threshold: ${toUsdc(policy.alert_threshold)}`,
          ].join('\n'),
        }],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{ type: 'text', text: `Failed to fetch policy: ${message}` }],
        isError: true,
      }
    }
  },
)

// ── Tool: get_transactions ────────────────────────────────────────────────────

server.tool(
  'get_transactions',
  'Get recent payment transactions for this agent, including governance decisions and agent votes.',
  {
    limit: z.number().int().min(1).max(50).default(10).describe('Number of recent transactions to return'),
  },
  async ({ limit }) => {
    if (!API_KEY) {
      return {
        content: [{ type: 'text', text: 'Transactions unavailable — SENTINEL_API_KEY not configured.' }],
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/me/transactions?limit=${limit}`, {
        headers: authHeaders(),
      })

      if (!res.ok) {
        return {
          content: [{ type: 'text', text: `Failed to fetch transactions: HTTP ${res.status}` }],
          isError: true,
        }
      }

      const { transactions } = await res.json()

      if (!transactions || transactions.length === 0) {
        return {
          content: [{ type: 'text', text: 'No transactions found.' }],
        }
      }

      const rows = (transactions as any[]).map(tx => {
        const status = tx.status === 'approved' ? '✓' : tx.status === 'rejected' ? '✗' : '⏳'
        const amount = `$${Number(tx.amount).toFixed(2)} ${tx.asset_code ?? 'USDC'}`
        const date   = new Date(tx.created_at).toLocaleTimeString()
        return `  ${status}  [${date}]  ${amount}  →  ${tx.vendor ?? 'unknown'}  (${tx.status})`
      })

      return {
        content: [{
          type: 'text',
          text: `Last ${transactions.length} transactions:\n\n` + rows.join('\n'),
        }],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{ type: 'text', text: `Failed to fetch transactions: ${message}` }],
        isError: true,
      }
    }
  },
)

// ── Tool: register_agent ──────────────────────────────────────────────────────

server.tool(
  'register_agent',
  'Register a custom AI agent that votes on every payment. The agent is powered by an LLM (OpenAI or Anthropic) with your API key and system prompt. Sentinel hosts it — no server needed.',
  {
    agent_id: z.string().describe('Unique agent identifier (lowercase, hyphens allowed). E.g. "compliance-checker"'),
    provider: z.enum(['openai', 'anthropic']).describe('LLM provider to use'),
    api_key: z.string().describe('Your API key for the provider'),
    model: z.string().default('gpt-4o-mini').describe('Model to use (e.g. "gpt-4o-mini", "claude-sonnet-4-20250514")'),
    system_prompt: z.string().describe('Instructions for the agent. E.g. "Reject gaming purchases. Only approve cloud services and dev tools."'),
    description: z.string().optional().describe('Short description of what this agent does'),
  },
  async ({ agent_id, provider, api_key, model, system_prompt, description }) => {
    if (!API_KEY) {
      return {
        content: [{
          type: 'text',
          text: 'Error: SENTINEL_API_KEY is not configured.',
        }],
        isError: true,
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/agents`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          agentId: agent_id,
          type: 'hosted',
          provider,
          apiKey: api_key,
          model,
          systemPrompt: system_prompt,
          description: description ?? `${provider} ${model} agent`,
        }),
      })

      const data = await res.json().catch(() => ({})) as Record<string, unknown>

      if (!res.ok) {
        return {
          content: [{
            type: 'text',
            text: `Failed to register agent: ${(data as any).error ?? `HTTP ${res.status}`}`,
          }],
          isError: true,
        }
      }

      return {
        content: [{
          type: 'text',
          text: [
            `Agent "${agent_id}" registered successfully.`,
            `  provider : ${provider}`,
            `  model    : ${model}`,
            `  type     : hosted (Sentinel runs it for you)`,
            '',
            'The agent will now vote on every payment request.',
          ].join('\n'),
        }],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{
          type: 'text',
          text: `Failed to reach Sentinel at ${API_URL}: ${message}`,
        }],
        isError: true,
      }
    }
  },
)

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
