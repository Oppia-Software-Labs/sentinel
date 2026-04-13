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

// scValToNative converts ScvString to Buffer/Uint8Array, not a JS string
function decodeScvString(val: unknown): string {
  if (val instanceof Uint8Array) return new TextDecoder().decode(val)
  if (Buffer.isBuffer(val)) return val.toString('utf8')
  return String(val ?? '')
}

export interface VerdictResponse {
  txId: string          // Contract internal counter ID (e.g. "0000000000000008")
  stellarTxHash: string // Real Stellar transaction hash (for stellar.expert)
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

/**
 * On-chain writes use `*_rel` contract methods: they require auth from the **contract admin**
 * (the address passed to `__constructor` at deploy). That must be the same account as
 * `SENTINEL_OPERATOR_SECRET` so the operator can relay policy/agents/consensus/evaluate for any owner.
 */
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
      const detail = (getResult as any).resultXdr?.toXDR?.('base64') ?? JSON.stringify(getResult)
      const diag = this.gatherFailedInvokeDiagnostics(getResult as unknown as Record<string, unknown>)
      const msg = diag ? `${detail} | ${diag}` : detail
      throw new Error(`Transaction failed on-chain: ${msg}`)
    }

    return getResult as StellarSdk.rpc.Api.GetSuccessfulTransactionResponse
  }

  /** Decode diagnostic events from getTransaction + transaction meta (v3/v4 Soroban meta). */
  private gatherFailedInvokeDiagnostics(getResult: Record<string, unknown>): string {
    const chunks: string[] = []
    const top = getResult.diagnosticEventsXdr as StellarSdk.xdr.DiagnosticEvent[] | undefined
    const fromTop = this.formatDiagnosticEventList(top)
    if (fromTop) chunks.push(fromTop)

    const meta = getResult.resultMetaXdr as StellarSdk.xdr.TransactionMeta | undefined
    if (!meta) return chunks.join(' | ')

    try {
      const sw = meta.switch()
      if (sw === 3) {
        const sm = meta.v3().sorobanMeta()
        if (sm) {
          const de = sm.diagnosticEvents() ?? []
          const s = this.formatDiagnosticEventList(de)
          if (s) chunks.push(s)
          const rv = sm.returnValue()
          if (rv) {
            try {
              chunks.push(`returnValue: ${String(StellarSdk.scValToNative(rv))}`)
            } catch {
              /* skip */
            }
          }
        }
      } else if (sw === 4) {
        const v4 = meta.v4()
        const de = v4.diagnosticEvents() ?? []
        const s = this.formatDiagnosticEventList(de)
        if (s) chunks.push(s)
        const sm = v4.sorobanMeta()
        if (sm) {
          const rv = sm.returnValue()
          if (rv) {
            try {
              chunks.push(`returnValue: ${String(StellarSdk.scValToNative(rv))}`)
            } catch {
              /* skip */
            }
          }
        }
      }
    } catch {
      /* skip */
    }

    return chunks.filter(Boolean).join(' | ')
  }

  private formatDiagnosticEventList(events: StellarSdk.xdr.DiagnosticEvent[] | undefined): string {
    if (!events?.length) return ''
    const parts: string[] = []
    for (const evt of events) {
      try {
        const ce = evt.event()
        const v0 = ce.body().value()
        const topicStr = (v0.topics() ?? []).map((t) => {
          try {
            return String(StellarSdk.scValToNative(t))
          } catch {
            return ''
          }
        }).filter(Boolean)
        let dataStr = ''
        try {
          const d = v0.data()
          if (d) dataStr = String(StellarSdk.scValToNative(d))
        } catch {
          /* skip */
        }
        if (topicStr.length || dataStr) parts.push([...topicStr, dataStr].filter(Boolean).join(' '))
      } catch {
        /* skip */
      }
    }
    return parts.join('; ')
  }

  // ── Read functions (simulation, no gas) ──────────────────────────

  async verifyPolicy(ownerAddress: string, amount: number, vendor: string): Promise<PolicyResult> {
    try {
      const op = this.contract.call(
        'verify_policy',
        new StellarSdk.Address(ownerAddress).toScVal(),
        StellarSdk.nativeToScVal(BigInt(Math.round(amount * 10_000_000)), { type: 'i128' }),
        StellarSdk.nativeToScVal(vendor.replace(/-/g, '_'), { type: 'symbol' }),
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
    const xdr = StellarSdk.xdr
    const makeSymbol = (s: string) => xdr.ScVal.scvSymbol(s)
    const makeString = (s: string) => xdr.ScVal.scvString(s)
    const makeI128 = (n: bigint) =>
      xdr.ScVal.scvI128(
        new xdr.Int128Parts({
          hi: xdr.Int64.fromString(String(n >> 64n)),
          lo: xdr.Uint64.fromString(String(BigInt.asUintN(64, n))),
        }),
      )

    const stroops = BigInt(Math.round(intent.amount * 10_000_000))
    const vendor = intent.vendor.replace(/-/g, '_')
    const agentId = intent.agentId.replace(/-/g, '_')

    // Build IntentData ScVal as a sorted scvMap (Soroban requires alphabetical key order)
    const intentScVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({ key: makeSymbol('agent_id'),   val: makeSymbol(agentId) }),
      new xdr.ScMapEntry({ key: makeSymbol('amount'),     val: makeI128(stroops) }),
      new xdr.ScMapEntry({ key: makeSymbol('asset_code'), val: makeSymbol(intent.assetCode) }),
      new xdr.ScMapEntry({ key: makeSymbol('vendor'),     val: makeSymbol(vendor) }),
    ])

    // Build Vec<VoteData>
    const voteEntries = votes.map(v =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({ key: makeSymbol('agent_id'), val: makeSymbol(v.agentId.replace(/-/g, '_')) }),
        new xdr.ScMapEntry({ key: makeSymbol('decision'), val: makeSymbol(v.decision) }),
        new xdr.ScMapEntry({ key: makeSymbol('reason'),   val: makeString(v.reason ?? '') }),
      ]),
    )
    const votesScVal = xdr.ScVal.scvVec(voteEntries)

    const op = this.contract.call(
      'evaluate_rel',
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
      'set_policy_rel',
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
          agent_type: ['symbol', 'symbol'],
          endpoint:   ['symbol', 'string'],
          description:['symbol', 'string'],
          is_active:  ['symbol', 'bool'],
        } as any,
      },
    )

    console.log('[registerAgent] ownerAddress:', ownerAddress, 'agentId:', agentId)
    const ownerScVal = new StellarSdk.Address(ownerAddress).toScVal()
    const op = this.contract.call(
      'register_agent_rel',
      ownerScVal,
      StellarSdk.nativeToScVal(agentId.replace(/-/g, '_'), { type: 'symbol' }),
      infoScVal,
    )
    await this.submitTx(op)
  }

  async removeAgent(ownerAddress: string, agentId: string): Promise<void> {
    const op = this.contract.call(
      'remove_agent_rel',
      new StellarSdk.Address(ownerAddress).toScVal(),
      StellarSdk.nativeToScVal(agentId.replace(/-/g, '_'), { type: 'symbol' }),
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
    const xdr = StellarSdk.xdr
    const quorumSymbol = config.quorum === 'unanimous' ? 'unanimou' : config.quorum

    const configScVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('agent_ids'),
        val: xdr.ScVal.scvVec(config.agentIds.map(id => xdr.ScVal.scvSymbol(id))),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('quorum'),
        val: xdr.ScVal.scvSymbol(quorumSymbol),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('timeout_ms'),
        val: xdr.ScVal.scvU32(config.timeoutMs),
      }),
    ])

    const op = this.contract.call(
      'set_consensus_rel',
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
    return native.map((a: any) => {
      const endpoint = decodeScvString(a.endpoint)
      // agent_id is the map key in the contract, not a struct field — infer from endpoint as fallback
      const agentId = String(a.agent_id ?? a.agentId ?? endpoint.split('/').pop() ?? '')
      return {
        agentId,
        type: String(a.agent_type ?? a.agentType ?? 'custom') as 'shieldpay' | 'custom',
        endpoint,
        description: decodeScvString(a.description),
        isActive: Boolean(a.is_active ?? a.isActive ?? true),
      }
    })
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
    const stellarTxHash = (result as any).txHash ?? (result as any).hash ?? ''

    if (!retval) {
      throw new Error('No return value from evaluate transaction')
    }

    const native = StellarSdk.scValToNative(retval) as any

    // Contract may return just a symbol ('approve'/'reject') instead of a full struct
    if (typeof native === 'string') {
      return {
        txId: stellarTxHash,
        stellarTxHash,
        decision: native === 'approve' ? 'approve' : 'reject',
        consensusResult: native,
        policyDecision: 'approve',
        amount: 0,
        vendor: '',
        timestamp: Date.now(),
      }
    }

    return {
      txId: String(native.tx_id ?? stellarTxHash),
      stellarTxHash,
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
