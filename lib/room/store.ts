export type PeerRole = 'host' | 'viewer'
export type PeerStatus = 'active' | 'live' | 'offline'

export type RoomPeer = {
  peerId: string
  userId: string
  role: PeerRole
  status: PeerStatus
  displayName: string
  lastSeenAt: number
}

export type RoomSignal = {
  id: number
  roomId: string
  fromPeerId: string
  toPeerId: string
  signalType: 'offer' | 'answer' | 'ice'
  payload: unknown
  createdAt: number
}

export type RoomChannel = {
  roomId: string
  slug: string
  name: string
  category: string
  description: string
  avatar: string | null
}

export type RoomState = {
  roomId: string
  expiresAt: number
  peers: Map<string, RoomPeer>
  signals: RoomSignal[]
  nextSignalId: number
  channel: RoomChannel
}

type RoomStore = Map<string, RoomState>

const globalStore = globalThis as typeof globalThis & { screenGoleRooms?: RoomStore }
const rooms = globalStore.screenGoleRooms || new Map<string, RoomState>()
globalStore.screenGoleRooms = rooms

export const ACTIVE_PEER_MS = 7_000
const STALE_PEER_MS = 30_000
const SIGNAL_TTL_MS = 2 * 60 * 1000

export function cleanupRooms(now = Date.now()) {
  for (const [roomId, room] of rooms) {
    if (room.expiresAt <= now) {
      rooms.delete(roomId)
      continue
    }
    for (const [peerId, peer] of room.peers) {
      if (peer.lastSeenAt < now - STALE_PEER_MS) room.peers.delete(peerId)
    }
    room.signals = room.signals.filter((signal) => signal.createdAt >= now - SIGNAL_TTL_MS)
  }
}

export function getRoom(roomId: string) {
  cleanupRooms()
  return rooms.get(roomId) || null
}

export function ensureRoom(roomId: string, expiresAt: number) {
  cleanupRooms()
  const current = rooms.get(roomId)
  if (current) return current
  const room: RoomState = {
    roomId,
    expiresAt,
    peers: new Map(),
    signals: [],
    nextSignalId: 1,
    channel: {
      roomId,
      slug: roomId,
      name: 'Mesa temporária',
      category: 'Transmissões',
      description: 'Sessão disponível por 24 horas',
      avatar: null,
    },
  }
  rooms.set(roomId, room)
  return room
}

export function activePeers(room: RoomState, now = Date.now()) {
  return [...room.peers.values()]
    .filter((peer) => peer.status !== 'offline' && peer.lastSeenAt >= now - ACTIVE_PEER_MS)
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
}

export function addSignal(room: RoomState, signal: Omit<RoomSignal, 'id' | 'roomId' | 'createdAt'>) {
  const row: RoomSignal = {
    ...signal,
    id: room.nextSignalId,
    roomId: room.roomId,
    createdAt: Date.now(),
  }
  room.nextSignalId += 1
  room.signals.push(row)
  return row
}
