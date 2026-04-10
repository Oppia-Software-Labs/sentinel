import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'ShieldPay API',
    version: '1.0.0',
    description: 'AI agent payment governance — proxy x402, escrow, MPP sessions, and built-in voting agents.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local dev' }],
  tags: [
    { name: 'Proxy', description: 'x402 payment proxy with Soroban policy enforcement' },
    { name: 'Agents', description: 'Built-in voting agents + agent registry' },
    { name: 'MPP', description: 'Multi-party payment session lifecycle' },
  ],
  paths: {
    '/api/proxy/verify': {
      post: {
        tags: ['Proxy'],
        summary: 'Verify a payment intent',
        description: 'Runs Soroban policy check, then forwards to OZ Relayer /verify if allowed.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProxyRequest' },
              example: {
                ownerId: 'GXXX...',
                intent: { agentId: 'my-agent', ownerId: 'GXXX...', amount: 5, assetCode: 'USDC', vendor: 'openai', taskDescription: 'Generate embeddings' },
              },
            },
          },
        },
        responses: {
          200: { description: 'Allowed — relayer response forwarded' },
          402: { description: 'Rejected by Soroban policy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          502: { description: 'Policy check or relayer error' },
        },
      },
    },
    '/api/proxy/settle': {
      post: {
        tags: ['Proxy'],
        summary: 'Settle a payment',
        description: 'Full consensus + policy evaluation. If approved: funds escrow → forwards to OZ Relayer → releases escrow. If any step fails: refunds escrow.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProxyRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment settled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sorobanTxId: { type: 'string' },
                    escrowId: { type: 'string' },
                    decision: { type: 'string', enum: ['approve'] },
                  },
                },
              },
            },
          },
          402: { description: 'Rejected by consensus or policy' },
          502: { description: 'Escrow or relayer error' },
        },
      },
    },
    '/api/agents': {
      get: {
        tags: ['Agents'],
        summary: 'List registered agents',
        parameters: [{ name: 'ownerId', in: 'query', required: true, schema: { type: 'string' }, description: 'Stellar public key of the owner' }],
        responses: {
          200: {
            description: 'List of agents',
            content: { 'application/json': { schema: { type: 'object', properties: { agents: { type: 'array', items: { $ref: '#/components/schemas/RegisteredAgent' } } } } } },
          },
        },
      },
      post: {
        tags: ['Agents'],
        summary: 'Register a custom agent',
        description: 'Registers an HTTP agent endpoint in Soroban. The endpoint will be called during consensus with { intent, context } and must return { decision, reason }.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterAgentRequest' },
              example: {
                ownerId: 'GXXX...',
                agentId: 'my-langchain-agent',
                endpoint: 'https://my-company.com/agent',
                description: 'Custom risk agent built with LangChain',
                type: 'custom',
              },
            },
          },
        },
        responses: {
          200: { description: 'Agent registered', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, agentId: { type: 'string' }, endpoint: { type: 'string' } } } } } },
          400: { description: 'Missing required fields' },
          500: { description: 'Soroban error' },
        },
      },
    },
    '/api/agents/risk': {
      post: {
        tags: ['Agents'],
        summary: 'Risk agent vote',
        description: 'Detects retry storms, velocity loops, and anomalous payment spikes.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentInput' } } } },
        responses: { 200: { description: 'Vote', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentOutput' } } } } },
      },
    },
    '/api/agents/cost': {
      post: {
        tags: ['Agents'],
        summary: 'Cost agent vote',
        description: 'Enforces daily, hourly, and per-transaction USDC spend caps.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentInput' } } } },
        responses: { 200: { description: 'Vote', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentOutput' } } } } },
      },
    },
    '/api/agents/logic': {
      post: {
        tags: ['Agents'],
        summary: 'Logic agent vote',
        description: 'Validates intent coherence: vendor, asset code, amount, task description.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentInput' } } } },
        responses: { 200: { description: 'Vote', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentOutput' } } } } },
      },
    },
    '/api/mpp': {
      post: {
        tags: ['MPP'],
        summary: 'MPP session actions',
        description: 'Manage multi-party payment sessions. Actions: open, charge, close, kill, kill_all.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MppRequest' },
              examples: {
                open: { summary: 'Open session', value: { action: 'open', agentId: 'agent-1', ownerId: 'GXXX...' } },
                charge: { summary: 'Record charge', value: { action: 'charge', sessionId: 'uuid', amount: 10 } },
                close: { summary: 'Close session', value: { action: 'close', sessionId: 'uuid' } },
                kill: { summary: 'Kill session', value: { action: 'kill', sessionId: 'uuid', reason: 'Anomaly detected' } },
                kill_all: { summary: 'Kill all sessions (kill-switch)', value: { action: 'kill_all', ownerId: 'GXXX...' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Action result',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { type: 'object', properties: { sessionId: { type: 'string' } } },
                    { type: 'object', properties: { ok: { type: 'boolean' } } },
                  ],
                },
              },
            },
          },
          400: { description: 'Missing or invalid parameters' },
          500: { description: 'Session error' },
        },
      },
    },
  },
  components: {
    schemas: {
      PaymentIntent: {
        type: 'object',
        required: ['agentId', 'ownerId', 'amount', 'assetCode', 'vendor'],
        properties: {
          agentId: { type: 'string' },
          ownerId: { type: 'string', description: 'Stellar public key (G...)' },
          amount: { type: 'number' },
          assetCode: { type: 'string', example: 'USDC' },
          vendor: { type: 'string', example: 'openai' },
          taskDescription: { type: 'string' },
        },
      },
      ProxyRequest: {
        type: 'object',
        required: ['intent', 'ownerId'],
        properties: {
          intent: { $ref: '#/components/schemas/PaymentIntent' },
          ownerId: { type: 'string' },
        },
      },
      AgentInput: {
        type: 'object',
        required: ['intent', 'context'],
        properties: {
          intent: { $ref: '#/components/schemas/PaymentIntent' },
          context: {
            type: 'object',
            properties: {
              totalSpentToday: { type: 'number' },
              totalSpentHour: { type: 'number' },
            },
          },
        },
      },
      AgentOutput: {
        type: 'object',
        properties: {
          decision: { type: 'string', enum: ['approve', 'reject'] },
          reason: { type: 'string' },
        },
      },
      RegisteredAgent: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          type: { type: 'string', enum: ['shieldpay', 'custom'] },
          endpoint: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      RegisterAgentRequest: {
        type: 'object',
        required: ['ownerId', 'agentId', 'endpoint'],
        properties: {
          ownerId: { type: 'string' },
          agentId: { type: 'string' },
          endpoint: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['shieldpay', 'custom'], default: 'custom' },
        },
      },
      MppRequest: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['open', 'charge', 'close', 'kill', 'kill_all'] },
          sessionId: { type: 'string' },
          agentId: { type: 'string' },
          ownerId: { type: 'string' },
          amount: { type: 'number' },
          reason: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(spec)
}
