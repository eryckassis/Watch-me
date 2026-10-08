import { accessErrorResponse, requireRoomAccess } from '@/lib/auth/identity'
import { roomJson, roomOptions } from '@/lib/api/room-cors'
import { ACTIVE_PEER_MS, activePeers, ensureRoom } from '@/lib/room/store'

export async function POST(request: Request) {
  try {
    const access = await requireRoomAccess(request)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    const { peerId, live } = await request.json().catch(() => ({}))
    if (typeof peerId !== 'string') {
      return roomJson(request, { error: 'peerId obrigatório' }, { status: 400 })
    }

    const now = Date.now()
    const peer = room.peers.get(peerId)
    if (!peer || peer.userId !== access.user.id) {
      return roomJson(
        request,
        { error: 'Peer não pertence à sua sessão' },
        { status: 403 },
      )
    }
    if (live && peer.role !== 'host') {
      return roomJson(
        request,
        { error: 'Entre no modo de transmissão antes de iniciar' },
        { status: 403 },
      )
    }

    const anotherHostIsLive = live && activePeers(room, now).some((candidate) =>
      candidate.peerId !== peerId &&
      candidate.role === 'host' &&
      candidate.status === 'live' &&
      candidate.lastSeenAt >= now - ACTIVE_PEER_MS,
    )
    if (anotherHostIsLive) {
      return roomJson(
        request,
        { error: 'Outra pessoa já está transmitindo nesta sala' },
        { status: 409 },
      )
    }

    peer.status = live ? 'live' : 'active'
    peer.lastSeenAt = now
    return roomJson(request, { ok: true })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) {
      return roomJson(
        request,
        { error: access.message },
        { status: access.status },
      )
    }
    console.error('[room] Heartbeat failed', error)
    return roomJson(
      request,
      { error: 'Não foi possível atualizar a sala' },
      { status: 503 },
    )
  }
}

export const OPTIONS = roomOptions
