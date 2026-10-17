import { accessErrorResponse, requireRoomAccess } from '@/lib/auth/identity'
import { roomJson, roomOptions } from '@/lib/api/room-cors'
import { addSignal, ensureRoom } from '@/lib/room/store'

export async function POST(request: Request) {
  try {
    const access = await requireRoomAccess(request)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    const body = await request.json().catch(() => ({}))
    if (!['offer', 'answer', 'ice'].includes(body.type) || typeof body.fromPeerId !== 'string' || typeof body.toPeerId !== 'string' || !body.payload) return roomJson(request, { error: 'Sinal inválido' }, { status: 400 })
    if (JSON.stringify(body.payload).length > 20000) return roomJson(request, { error: 'Sinal grande demais' }, { status: 413 })
    const owner = room.peers.get(body.fromPeerId)
    if (!owner || owner.userId !== access.user.id) return roomJson(request, { error: 'peerId não pertence à sua sessão' }, { status: 403 })
    const target = room.peers.get(body.toPeerId)
    if (!target) return roomJson(request, { error: 'Peer de destino inválido' }, { status: 403 })
    addSignal(room, { fromPeerId: body.fromPeerId, toPeerId: body.toPeerId, signalType: body.type, payload: body.payload })
    return roomJson(request, { ok: true })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[room] Signal registration failed', error)
    return roomJson(request, { error: 'Não foi possível registrar o sinal' }, { status: 503 })
  }
}

export async function GET(request: Request) {
  try {
    const access = await requireRoomAccess(request)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    const url = new URL(request.url)
    const peerId = url.searchParams.get('peerId')
    const after = Math.max(0, Number(url.searchParams.get('after') || 0))
    if (!peerId) return roomJson(request, { error: 'peerId obrigatório' }, { status: 400 })
    const owner = room.peers.get(peerId)
    if (!owner || owner.userId !== access.user.id) return roomJson(request, { error: 'peerId não pertence à sua sessão' }, { status: 403 })
    const rows = room.signals.filter((signal) => signal.toPeerId === peerId && signal.id > after).slice(0, 200)
    return roomJson(request, { signals: rows })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[room] Signal lookup failed', error)
    return roomJson(request, { error: 'Não foi possível consultar os sinais' }, { status: 503 })
  }
}

export const OPTIONS = roomOptions
