import type { AgentVote } from '../types.js'

export function evaluateQuorum(
  votes: AgentVote[],
  mode: 'majority' | 'unanimous' | 'any',
): 'approve' | 'reject' {
  if (votes.length === 0) return 'reject'

  const approveCount = votes.filter(v => v.decision === 'approve').length

  switch (mode) {
    case 'majority':
      return approveCount > votes.length / 2 ? 'approve' : 'reject'
    case 'unanimous':
      return approveCount === votes.length ? 'approve' : 'reject'
    case 'any':
      return approveCount > 0 ? 'approve' : 'reject'
    default:
      return 'reject'
  }
}
