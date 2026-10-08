export type PeerRole = 'host' | 'viewer'

export function requestedPeerRole(value: unknown): PeerRole {
  return value === 'host' ? 'host' : 'viewer'
}
