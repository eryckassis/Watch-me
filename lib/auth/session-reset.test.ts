import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldResetSession } from './session-reset.ts'

test('resets only when a 24-hour session actually expired', () => {
  assert.equal(shouldResetSession(401, 'Esta sessão expirou'), true)
  assert.equal(shouldResetSession(401, 'Sessão inválida'), false)
  assert.equal(shouldResetSession(503, 'Falha temporária'), false)
})
