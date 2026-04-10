import * as StellarSdk from '@stellar/stellar-sdk'
import type {
  SorobanConfig,
  PolicyResult,
  RegisteredAgent,
  ConsensusConfig,
  AgentVote,
  PaymentIntent,
} from '../types.js'

const BASE_FEE = '1000000'
const TX_TIMEOUT = 30

export interface VerdictResponse {
  txId: string
  decision: 'approve' | 'reject'
  consensusResult: string
  policyDecision: string
  amount: number
  vendor: string
  timestamp: number
}

export interface SpendTrackerResponse {
  hourTotal: number
  hourStart: number
  dayTotal: number
  dayStart: number
}

export class SorobanClient {
  private server: StellarSdk.rpc.Server
  private contract: StellarSdk.Contract
  private keypair: StellarSdk.Keypair
  private networkPassphrase: string

  constructor(config: SorobanConfig) {
    this.server = new StellarSdk.rpc.Server(config.rpcUrl)
    this.contract = new StellarSdk.Contract(config.contractId)
    this.keypair = StellarSdk.Keypair.fromSecret(config.operatorSecret)
    this.networkPassphrase = config.networkPassphrase
  }

  private async getAccount(): Promise<StellarSdk.Account> {
    const pubkey = this.keypair.publicKey()
    const account = await this.server.getAccount(pubkey)
    return account
  }

  private async simulateRead(operation: StellarSdk.xdr.Operation): Promise<StellarSdk.rpc.Api.SimulateTransactionSuccessResponse> {
    const account = await this.getAccount()
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(TX_TIMEOUT)
      .build()

    const sim = await this.server.simulateTransaction(tx)
    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`)
    }
    return sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
  }

  private async submitTx(operation: StellarSdk.xdr.Operation): Promise<StellarSdk.rpc.Api.GetSuccessfulTransactionResponse> {
    const account = await this.getAccount()
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(TX_TIMEOUT)
      .build()

    const prepared = await this.server.prepareTransaction(tx)
    prepared.sign(this.keypair)

    const sendResult = await this.server.sendTransaction(prepared)
    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction submission failed: ${sendResult.errorResult?.toXDR('base64')}`)
    }

    let getResult = await this.server.getTransaction(sendResult.hash)
    while (getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND) {
      await new Promise(r => setTimeout(r, 1000))
      getResult = await this.server.getTransaction(sendResult.hash)
    }

    if (getResult.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed on-chain`)
    }

    return getResult as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse
  }

  // ── Read functions (simulation, no gas) ──────────────────────────

  async verifyPolicy(ownerAddress: string, amount: number, vendor: string): Promise<PolicyResult> {
    try {
      const op = this.contract.call(
        'verify_policy',
        new StellarSdk.Address(ownerAddress).toScVal(),
        StellarSdk.nativeToScVal(amount, { type: 'i128' }),
        StellarSdk.nativeToScVal(vendor, { type: 'symbol' }),
      )
      await this.simulateRead(op)
      return { allowed: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      let rule: string | undefined
      if (message.includes('7')) rule = 'blocked_vendors'
      else if (message.includes('8')) rule = 'max_per_task'
      else if (message.includes('9')) rule = 'max_per_hour'
      else if (message.includes('10')) rule = 'max_per_day'
      return { allowed: false, reason: message, rule }
    }
  }

  async getAgents(ownerAddress: string): Promise<RegisteredAgent[]> {
    const op = this.contract.call(
      'get_agents',
      new StellarSdk.Address(ownerAddress).toScVal(),
    )
    const sim = await this.simulateRead(op)
    return this.parseAgentList(sim)
  }

  async getConsensus(ownerAddress: string): Promise<ConsensusConfig> {
    const op = this.contract.call(
      'get_consensus',
      new StellarSdk.Address(ownerAddress).toScVal(),
    )
    const sim = await this.simulateRead(op)
    return this.parseConsensusConfig(sim)
  }

  async getSpendTracker(ownerAddress: string): Promise<SpendTrackerResponse> {
    const op = this.contract.call(
      'get_spend_tracker',
      new StellarSdk.Address(ownerAddress).toScVal(),
    )
    const sim = await this.simulateRead(op)
    return this.parseSpendTracker(sim)
  }

  // ── Write functions (on-chain transaction) ───────────────────────

  async evaluate(
    ownerAddress: string,
    intent: PaymentIntent,
    votes: AgentVote[],
  ): Promise<VerdictResponse> {
    const intentScVal = StellarSdk.nativeToScVal(
      {
        agent_id: intent.agentId,
        amount: BigInt(Math.round(intent.amount)),
        asset_code: intent.assetCode,
        vendor: intent.vendor,
      },
      {
        type: {
          agent_id: ['symbol'],
          amount: ['i128'],
          asset_code: ['symbol'],
          vendor: ['symbol'],
        } as any,
      },
    )

    const votesScVal = StellarSdk.nativeToScVal(
      votes.map(v => ({
        agent_id: v.agentId,
        decision: v.decision,
        reason: v.reason,
      })),
      {
        type: [
          {
            agent_id: ['symbol'],
            decision: ['symbol'],
            reason: ['string'],
          },
        ] as any,
      },
    )

    const op = this.contract.call(
      'evaluate',
      new StellarSdk.Address(ownerAddress).toScVal(),
      intentScVal,
      votesScVal,
    )

    const result = await this.submitTx(op)
    return this.parseVerdictResult(result)
  }

  async setPolicy(
    ownerAddress: string,
    rules: {
      maxPerTask: number
      maxPerHour: number
      maxPerDay: number
      blockedVendors: string[]
      alertThreshold: number
    },
  ): Promise<void> {
    const rulesScVal = StellarSdk.nativeToScVal(
      {
        max_per_task: BigInt(rules.maxPerTask),
        max_per_hour: BigInt(rules.maxPerHour),
        max_per_day: BigInt(rules.maxPerDay),
        blocked_vendors: rules.blockedVendors,
        alert_threshold: BigInt(rules.alertThreshold),
      },
      {
        type: {
          max_per_task: ['i128'],
          max_per_hour: ['i128'],
          max_per_day: ['i128'],
          blocked_vendors: [['symbol']],
          alert_threshold: ['i128'],
        } as any,
      },
    )

    const op = this.contract.call(
      'set_policy',
      new StellarSdk.Address(ownerAddress).toScVal(),
      rulesScVal,
    )
    await this.submitTx(op)
  }

  async registerAgent(
    ownerAddress: string,
    agentId: string,
    info: {
      agentType: 'shieldpay' | 'custom'
      endpoint: string
      description: string
      isActive: boolean
    },
  ): Promise<void> {
    const infoScVal = StellarSdk.nativeToScVal(
      {
        agent_type: info.agentType,
        endpoint: info.endpoint,
        description: info.description,
        is_active: info.isActive,
      },
      {
        type: {
          agent_type: ['symbol'],
          endpoint: ['string'],
          description: ['string'],
          is_active: ['bool'],
        } as any,
      },
    )

    const op = this.contract.call(
      'register_agent',
      new StellarSdk.Address(ownerAddress).toScVal(),
      StellarSdk.nativeToScVal(agentId, { type: 'symbol' }),
      infoScVal,
    )
    await this.submitTx(op)
  }

  async setConsensus(
    ownerAddress: string,
    config: {
      quorum: 'majority' | 'unanimous' | 'any'
      timeoutMs: number
      agentIds: string[]
    },
  ): Promise<void> {
    const quorumSymbol = config.quorum === 'unanimous' ? 'unanimou' : config.quorum

    const configScVal = StellarSdk.nativeToScVal(
      {
        quorum: quorumSymbol,
        timeout_ms: config.timeoutMs,
        agent_ids: config.agentIds,
      },
      {
        type: {
          quorum: ['symbol'],
          timeout_ms: ['u32'],
          agent_ids: [['symbol']],
        } as any,
      },
    )

    const op = this.contract.call(
      'set_consensus',
      new StellarSdk.Address(ownerAddress).toScVal(),
      configScVal,
    )
    await this.submitTx(op)
  }

  // ── Parsers ──────────────────────────────────────────────────────

  private parseAgentList(sim: StellarSdk.rpc.Api.SimulateTransactionSuccessResponse): RegisteredAgent[] {
    if (!sim.result?.retval) return []
    const scVal = sim.result.retval
    const native = StellarSdk.scValToNative(scVal)
    if (!Array.isArray(native)) return []
    return native.map((a: any) => ({
      agentId: String(a.agent_id ?? a.agentId ?? ''),
      type: String(a.agent_type ?? a.agentType ?? 'custom') as 'shieldpay' | 'custom',
      endpoint: String(a.endpoint ?? ''),
      description: String(a.description ?? ''),
      isActive: Boolean(a.is_active ?? a.isActive ?? true),
    }))
  }

  private parseConsensusConfig(sim: StellarSdk.rpc.Api.SimulateTransactionSuccessResponse): ConsensusConfig {
    if (!sim.result?.retval) {
      throw new Error('Consensus not configured for this owner')
    }
    const native = StellarSdk.scValToNative(sim.result.retval) as any
    const quorumRaw = String(native.quorum ?? 'majority')
    const quorum = quorumRaw === 'unanimou' ? 'unanimous' : quorumRaw
    return {
      quorum: quorum as 'majority' | 'unanimous' | 'any',
      timeoutMs: Number(native.timeout_ms ?? native.timeoutMs ?? 5000),
      agents: (native.agent_ids ?? native.agentIds ?? []).map(String),
    }
  }

  private parseSpendTracker(sim: StellarSdk.rpc.Api.SimulateTransactionSuccessResponse): SpendTrackerResponse {
    if (!sim.result?.retval) {
      return { hourTotal: 0, hourStart: 0, dayTotal: 0, dayStart: 0 }
    }
    const native = StellarSdk.scValToNative(sim.result.retval) as any
    return {
      hourTotal: Number(native.hour_total ?? 0),
      hourStart: Number(native.hour_start ?? 0),
      dayTotal: Number(native.day_total ?? 0),
      dayStart: Number(native.day_start ?? 0),
    }
  }

  private parseVerdictResult(result: StellarSdk.rpc.Api.GetSuccessfulTransactionResponse): VerdictResponse {
    const retval = result.returnValue
    if (!retval) {
      throw new Error('No return value from evaluate transaction')
    }
    const native = StellarSdk.scValToNative(retval) as any
    return {
      txId: String(native.tx_id ?? ''),
      decision: String(native.decision ?? 'reject') as 'approve' | 'reject',
      consensusResult: String(native.consensus_result ?? ''),
      policyDecision: String(native.policy_decision ?? ''),
      amount: Number(native.amount ?? 0),
      vendor: String(native.vendor ?? ''),
      timestamp: Number(native.timestamp ?? 0),
    }
  }
}

export function createSorobanClient(config: SorobanConfig): SorobanClient {
  return new SorobanClient(config)
}
