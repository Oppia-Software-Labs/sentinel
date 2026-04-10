/**
 * MPP session lifecycle — see MATIAS.md (openSession, recordCharge, closeSession, killSession).
 */

export async function openSession(_agentId: string, _ownerId: string): Promise<string> {
  throw new Error('openSession not implemented')
}
