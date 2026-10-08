import {
  SESSION_TTL_MS,
  accessErrorResponse,
  createAccessToken,
  createInviteToken,
  createRoomId,
} from '@/lib/auth/identity'
import { roomJson, roomOptions } from '@/lib/api/room-cors'
import { ensureRoom } from '@/lib/room/store'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const roomId = createRoomId()
    const expiresAt = Date.now() + SESSION_TTL_MS
    const access = createAccessToken({ roomId, expiresAt, displayName: body.name, canManageRoom: true })
    const inviteToken = createInviteToken(roomId, expiresAt)
    ensureRoom(roomId, expiresAt)

    return roomJson(request, {
      accessToken: access.token,
      roomId,
      expiresAt: new Date(expiresAt).toISOString(),
      inviteUrl: new URL(`/invite/${inviteToken}`, request.url).toString(),
      user: {
        id: access.payload.userId,
        displayName: access.payload.displayName,
        displayTag: access.payload.displayName,
        avatarUrl: null,
      },
    })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return roomJson(request, { error: access.message }, { status: access.status })
    console.error('[session] Could not start session', error)
    return roomJson(request, { error: 'Não foi possível criar a sessão' }, { status: 500 })
  }
}

export const OPTIONS = roomOptions
