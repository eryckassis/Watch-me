import { accessErrorResponse, requireRoomAccess } from '@/lib/auth/identity'
import { roomJson, roomOptions } from '@/lib/api/room-cors'
import { ensureRoom } from '@/lib/room/store'

export async function POST(request: Request) {
  try {
    const access = await requireRoomAccess(request)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    const { peerId } = await request.json().catch(() => ({}))
    if (typeof peerId !== 'string') return roomJson(request, { error: 'peerId obrigatório' }, { status: 400 })
    const peer = room.peers.get(peerId)
    if (!peer || peer.userId !== access.user.id) return roomJson(request, { error: 'Peer não pertence à sua sessão' }, { status: 403 })
    room.peers.delete(peerId)
    return roomJson(request, { ok: true })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[room] Leave failed', error)
    return roomJson(request, { error: 'Não foi possível sair da sala' }, { status: 503 })
  }
}

export const OPTIONS = roomOptions
