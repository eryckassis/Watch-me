import { accessErrorResponse, requireRoomAccess } from '@/lib/auth/identity'
import { roomJson, roomOptions } from '@/lib/api/room-cors'
import { requestedPeerRole } from '@/lib/room/peer-role'
import { activePeers, ensureRoom } from '@/lib/room/store'

export async function POST(request: Request) {
  try {
    const access = await requireRoomAccess(request)
    const body = await request.json().catch(() => ({}))
    const peerId = typeof body.peerId === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(body.peerId) ? body.peerId : crypto.randomUUID()
    const role = requestedPeerRole(body.role)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    const existingPeer = room.peers.get(peerId)
    if (existingPeer && existingPeer.userId !== access.user.id) return roomJson(request, { error: 'Este peerId já pertence a outra sessão' }, { status: 403 })
    room.peers.set(peerId, {
      peerId,
      userId: access.user.id,
      role,
      status: 'active',
      displayName: access.user.displayName,
      lastSeenAt: Date.now(),
    })
    return roomJson(request, { roomId: access.roomId, peerId, role, isLive: activePeers(room).some((peer) => peer.role === 'host' && peer.status === 'live') })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[room] Session registration failed', error)
    return roomJson(request, { error: 'Não foi possível entrar na sala' }, { status: 503 })
  }
}

export async function GET(request: Request) {
  try {
    const access = await requireRoomAccess(request)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    const peers = activePeers(room)
    const host = peers.find((peer) => peer.role === 'host' && peer.status === 'live') || peers.find((peer) => peer.role === 'host') || null
    return roomJson(request, { roomId: access.roomId, isLive: host?.status === 'live', host, peers: peers.filter((peer) => peer.role === 'viewer') })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[room] Session lookup failed', error)
    return roomJson(request, { error: 'Não foi possível consultar a sala' }, { status: 503 })
  }
}

export const OPTIONS = roomOptions
