import {
  accessErrorResponse,
  createAccessToken,
  createInviteToken,
  readInviteToken,
} from '@/lib/auth/identity'
import { roomJson, roomOptions } from '@/lib/api/room-cors'
import { ensureRoom } from '@/lib/room/store'

type Context = { params: Promise<{ token: string }> }

export async function POST(request: Request, { params }: Context) {
  try {
    const { token } = await params
    const invite = readInviteToken(token)
    const body = await request.json().catch(() => ({}))
    const access = createAccessToken({
      roomId: invite.roomId,
      expiresAt: invite.expiresAt,
      displayName: body.name,
      canManageRoom: false,
    })
    ensureRoom(invite.roomId, invite.expiresAt)

    return roomJson(request, {
      accessToken: access.token,
      roomId: invite.roomId,
      expiresAt: new Date(invite.expiresAt).toISOString(),
      inviteUrl: new URL(`/invite/${createInviteToken(invite.roomId, invite.expiresAt)}`, request.url).toString(),
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
    console.error('[sessions] Invite acceptance failed', error)
    return roomJson(request, { error: 'Não foi possível aceitar o convite' }, { status: 500 })
  }
}

export const OPTIONS = roomOptions
