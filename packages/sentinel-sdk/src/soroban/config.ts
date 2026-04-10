import type { SorobanConfig } from '../types.js'

export function loadSorobanConfig(overrides?: Partial<SorobanConfig>): SorobanConfig {
  return {
    rpcUrl: overrides?.rpcUrl ?? process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    networkPassphrase: overrides?.networkPassphrase ?? process.env.STELLAR_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015',
    contractId: overrides?.contractId ?? process.env.SENTINEL_CONTRACT_ID ?? '',
    operatorSecret: overrides?.operatorSecret ?? process.env.SENTINEL_OPERATOR_SECRET ?? '',
  }
}
