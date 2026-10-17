import assert from 'node:assert/strict'
import test from 'node:test'
import { inviteTokenFromAppUrl, toAppInviteUrl } from './invite-url.ts'

test('converts an internal invite URL to the Screen Gole app protocol', () => {
  assert.equal(
    toAppInviteUrl('http://localhost:10000/invite/example-token'),
    'screen-gole://invite/example-token',
  )
})

test('reads the invite token only from a valid Screen Gole app URL', () => {
  assert.equal(inviteTokenFromAppUrl('screen-gole://invite/example-token'), 'example-token')
  assert.equal(inviteTokenFromAppUrl('https://screen-gole.vercel.app/invite/example-token'), null)
  assert.equal(
    inviteTokenFromAppUrl('screen-gole://other/example-token'),
    null,
  )
})
