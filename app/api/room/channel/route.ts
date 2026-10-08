import { accessErrorResponse, requireRoomAccess } from '@/lib/auth/identity'
import { roomJson, roomOptions } from '@/lib/api/room-cors'
import { ensureRoom } from '@/lib/room/store'

export async function GET(request: Request) {
  try {
    const access = await requireRoomAccess(request)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    return roomJson(request, { channel: room.channel })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[room] Channel lookup failed', error)
    return roomJson(request, { error: 'Não foi possível carregar o canal' }, { status: 503 })
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireRoomAccess(request, undefined, true)
    const room = ensureRoom(access.roomId, access.token.expiresAt)
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
    const category = typeof body.category === 'string' ? body.category.trim().slice(0, 32) : ''
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 100) : ''
    const avatar = body.avatar === null ? null : typeof body.avatar === 'string' ? body.avatar : undefined
    if (name.length < 2 || category.length < 2) return roomJson(request, { error: 'Nome e categoria precisam ter pelo menos 2 caracteres' }, { status: 400 })
    if (avatar !== undefined && avatar !== null && (!/^data:image\/(png|jpeg|webp);base64,/.test(avatar) || avatar.length > 1_000_000)) return roomJson(request, { error: 'A imagem precisa ser PNG, JPEG ou WebP e ter até 700 KB' }, { status: 413 })
    room.channel = { ...room.channel, name, category, description, ...(avatar !== undefined ? { avatar } : {}) }
    return roomJson(request, { channel: room.channel })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[room] Channel update failed', error)
    return roomJson(request, { error: 'Não foi possível salvar o canal' }, { status: 503 })
  }
}

export const OPTIONS = roomOptions
