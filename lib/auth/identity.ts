import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000

type TokenBase = {
  roomId: string
  expiresAt: number
}

export type InviteToken = TokenBase & {
  kind: 'invite'
}

export type AccessToken = TokenBase & {
  kind: 'access'
  userId: string
  displayName: string
  canManageRoom: boolean
}

export type AppIdentity = {
  user: {
    id: string
    displayName: string
    displayTag: string
    avatarUrl: null
  }
  source: 'token'
  token: AccessToken
}

export type RoomAccess = AppIdentity & {
  roomId: string
  role: 'owner' | 'member'
}

export class AccessError extends Error {
  public readonly status: 400 | 401 | 403 | 404

  constructor(
    status: 400 | 401 | 403 | 404,
    message: string,
  ) {
    super(message)
    this.status = status
  }
}

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET precisa ter pelo menos 32 caracteres')
  }
  return value
}

function signature(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function encode(payload: InviteToken | AccessToken) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${signature(encoded)}`
}

function decode(token: string): InviteToken | AccessToken {
  const [encoded, received, extra] = token.split('.')
  if (!encoded || !received || extra) throw new AccessError(401, 'Token inválido')

  const expected = signature(encoded)
  const receivedBytes = Buffer.from(received)
  const expectedBytes = Buffer.from(expected)
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) {
    throw new AccessError(401, 'Token inválido')
  }

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    throw new AccessError(401, 'Token inválido')
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    !('kind' in payload) ||
    !('roomId' in payload) ||
    !('expiresAt' in payload) ||
    typeof payload.roomId !== 'string' ||
    typeof payload.expiresAt !== 'number'
  ) {
    throw new AccessError(401, 'Token inválido')
  }
  if (payload.expiresAt <= Date.now()) throw new AccessError(401, 'Esta sessão expirou')
  if (payload.kind !== 'invite' && payload.kind !== 'access') throw new AccessError(401, 'Token inválido')
  return payload as InviteToken | AccessToken
}

export function normalizeDisplayName(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 24)
}

export function createRoomId() {
  return randomBytes(12).toString('base64url')
}

export function createInviteToken(roomId: string, expiresAt: number) {
  return encode({ kind: 'invite', roomId, expiresAt })
}

export function readInviteToken(token: string) {
  const payload = decode(token)
  if (payload.kind !== 'invite') throw new AccessError(401, 'Convite inválido')
  return payload
}

export function createAccessToken(input: {
  roomId: string
  expiresAt: number
  displayName: string
  canManageRoom: boolean
}) {
  const displayName = normalizeDisplayName(input.displayName)
  if (displayName.length < 2) throw new AccessError(400, 'Informe um nome com pelo menos 2 caracteres')
  const payload: AccessToken = {
    kind: 'access',
    roomId: input.roomId,
    expiresAt: input.expiresAt,
    userId: randomBytes(16).toString('base64url'),
    displayName,
    canManageRoom: input.canManageRoom,
  }
  return { token: encode(payload), payload }
}

export function readAccessToken(token: string) {
  const payload = decode(token)
  if (payload.kind !== 'access') throw new AccessError(401, 'Sessão inválida')
  if (
    typeof payload.userId !== 'string' ||
    typeof payload.displayName !== 'string' ||
    typeof payload.canManageRoom !== 'boolean'
  ) {
    throw new AccessError(401, 'Sessão inválida')
  }
  return payload
}

function identityFromToken(payload: AccessToken): AppIdentity {
  return {
    user: {
      id: payload.userId,
      displayName: payload.displayName,
      displayTag: payload.displayName,
      avatarUrl: null,
    },
    source: 'token',
    token: payload,
  }
}

export async function resolveIdentity(request?: Request): Promise<AppIdentity | null> {
  const authorization = request?.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  try {
    return identityFromToken(readAccessToken(authorization.slice(7).trim()))
  } catch (error) {
    if (error instanceof AccessError) return null
    throw error
  }
}

export async function requireIdentity(request?: Request) {
  const authorization = request?.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) throw new AccessError(401, 'Sessão obrigatória')
  return identityFromToken(readAccessToken(authorization.slice(7).trim()))
}

export async function requireRoomAccess(
  request: Request | undefined,
  roomId?: string,
  ownerOnly = false,
): Promise<RoomAccess> {
  const identity = await requireIdentity(request)
  const requestedRoomId = roomId || identity.token.roomId
  if (requestedRoomId !== identity.token.roomId) throw new AccessError(403, 'Você não tem acesso a esta sala')
  if (ownerOnly && !identity.token.canManageRoom) {
    throw new AccessError(403, 'Somente quem criou a sessão pode realizar esta ação')
  }
  return {
    ...identity,
    roomId: requestedRoomId,
    role: identity.token.canManageRoom ? 'owner' : 'member',
  }
}

export function accessErrorResponse(error: unknown) {
  if (error instanceof AccessError) return { status: error.status, message: error.message }
  return null
}
