import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AccessError,
  createAccessToken,
  createInviteToken,
  readAccessToken,
  readInviteToken,
} from './identity.ts'

process.env.SESSION_SECRET = 'screen-gole-test-secret-with-at-least-32-characters'

test('creates verifiable invite and access tokens with one expiry', () => {
  const expiresAt = Date.now() + 60_000
  const invite = readInviteToken(createInviteToken('room-1', expiresAt))
  const access = createAccessToken({
    roomId: invite.roomId,
    expiresAt: invite.expiresAt,
    displayName: '  Ada   Lovelace  ',
    canManageRoom: false,
  })

  assert.equal(invite.roomId, 'room-1')
  assert.equal(readAccessToken(access.token).displayName, 'Ada Lovelace')
  assert.equal(readAccessToken(access.token).expiresAt, expiresAt)
})

test('rejects expired and modified tokens', () => {
  const expired = createInviteToken('room-1', Date.now() - 1)
  assert.throws(() => readInviteToken(expired), AccessError)

  const valid = createInviteToken('room-1', Date.now() + 60_000)
  assert.throws(() => readInviteToken(`${valid}x`), AccessError)
})
