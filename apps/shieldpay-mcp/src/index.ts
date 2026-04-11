/**
 * ShieldPay MCP Server
 *
 * Connects Claude Code (or any MCP client) to ShieldPay's governance layer.
 * Every payment Claude wants to make goes through:
 *   escrow → agent voting (risk + cost + AI logic) → Soroban → dashboard
 *
 * Tools exposed:
 *   - request_payment   Submit a payment intent through governance
 *   - get_policy        Read current spend policy so Claude knows its limits
 *   - get_transactions  See recent payment history
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const SHIELDPAY_URL = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'
const OWNER_ID      = process.env.SHIELDPAY_OWNER_ID ?? ''
const AGENT_ID      = process.env.SHIELDPAY_AGENT_ID ?? 'claude-code'

// Supabase for reading policy + transactions (optional — graceful if not set)
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null

// ── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'shieldpay',
  version: '0.1.0',
})

// ── Tool: request_payment ─────────────────────────────────────────────────────

server.tool(
  'request_payment',
  'Submit a payment request through ShieldPay governance. Agents vote, policy is checked on Soroban, and if approved the payment is executed. Optionally provide a resource_url to a real x402-protected endpoint — ShieldPay will govern the payment and then fetch the paid resource automatically.',
  {
    vendor: z.string().describe('The service or API being paid (e.g. "xlm402-com", "openai-api"). If resource_url is provided this can be auto-derived.'),
    amount: z.number().positive().describe('Amount in USDC. If resource_url is provided the exact amount is read from the 402 response.'),
    task_description: z.string().describe('What you are doing and why this payment is needed. The AI governance agent reads this.'),
    asset_code: z.string().default('USDC').describe('Asset code (default: USDC)'),
    resource_url: z.string().url().optional().describe('Optional: a real x402-protected URL. ShieldPay will probe it for payment requirements, govern the payment, then fetch and return the resource data.'),
    resource_method: z.enum(['GET', 'POST']).default('GET').describe('HTTP method for the resource (default GET)'),
    resource_body: z.record(z.unknown()).optional().describe('Optional JSON body for POST resources'),
  },
  async ({ vendor, amount, task_description, asset_code, resource_url, resource_method, resource_body }) => {
    if (!OWNER_ID) {
      return {
        content: [{
          type: 'text',
          text: 'Error: SHIELDPAY_OWNER_ID is not configured. Add it to the MCP server env.',
        }],
        isError: true,
      }
    }

    try {
      const res = await fetch(`${SHIELDPAY_URL}/api/proxy/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: {
            agentId: AGENT_ID,
            ownerId: OWNER_ID,
            vendor,
            amount,
            assetCode: asset_code,
            taskDescription: task_description,
          },
          ownerId: OWNER_ID,
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
            text: `ShieldPay returned HTTP ${res.status}: ${(data as any).error ?? JSON.stringify(data)}${votesSummary}`,
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
              `✓ Payment approved by ShieldPay governance`,
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
              `✗ Payment REJECTED by ShieldPay governance`,
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
          text: `Failed to reach ShieldPay at ${SHIELDPAY_URL}: ${message}\n\nIs ShieldPay running? Start it with: npm run dev:api`,
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
    if (!supabase || !OWNER_ID) {
      return {
        content: [{
          type: 'text',
          text: 'Policy unavailable — Supabase not configured or SHIELDPAY_OWNER_ID not set.',
        }],
      }
    }

    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('owner_id', OWNER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return {
        content: [{ type: 'text', text: 'No policy found for this owner.' }],
      }
    }

    const toUsdc = (stroops: string | null) =>
      stroops ? `$${(parseInt(stroops) / 10_000_000).toFixed(2)} USDC` : 'unlimited'

    return {
      content: [{
        type: 'text',
        text: [
          'Current spend policy:',
          `  max per task  : ${toUsdc(data.max_per_task)}`,
          `  max per hour  : ${toUsdc(data.max_per_hour)}`,
          `  max per day   : ${toUsdc(data.max_per_day)}`,
          `  blocked vendors: ${(data.blocked_vendors as string[] | null)?.join(', ') || 'none'}`,
          `  alert threshold: ${toUsdc(data.alert_threshold)}`,
        ].join('\n'),
      }],
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
    if (!supabase || !OWNER_ID) {
      return {
        content: [{
          type: 'text',
          text: 'Transactions unavailable — Supabase not configured or SHIELDPAY_OWNER_ID not set.',
        }],
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('owner_id', OWNER_ID)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return {
        content: [{ type: 'text', text: `Error fetching transactions: ${error.message}` }],
        isError: true,
      }
    }

    if (!data || data.length === 0) {
      return {
        content: [{ type: 'text', text: 'No transactions found.' }],
      }
    }

    const rows = (data as any[]).map(tx => {
      const status = tx.status === 'approved' ? '✓' : tx.status === 'rejected' ? '✗' : '⏳'
      const amount = `$${Number(tx.amount).toFixed(2)} ${tx.asset_code ?? 'USDC'}`
      const date   = new Date(tx.created_at).toLocaleTimeString()
      return `  ${status}  [${date}]  ${amount}  →  ${tx.vendor ?? 'unknown'}  (${tx.status})`
    })

    return {
      content: [{
        type: 'text',
        text: `Last ${data.length} transactions:\n\n` + rows.join('\n'),
      }],
    }
  },
)

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
