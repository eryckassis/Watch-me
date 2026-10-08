import assert from 'node:assert/strict'
import {
  attachSilentLocalPreview,
  syncBroadcastTracks,
} from '../lib/media/broadcast-routing.ts'
import {
  canStartProcessAudioFromPcm,
  measureF32StereoPcm,
} from '../lib/media/pcm-signal.ts'
import { requestedPeerRole } from '../lib/room/peer-role.ts'

const audioTrack = { kind: 'audio', enabled: true }
const videoTrack = { kind: 'video', enabled: true }
const staleTrack = { kind: 'video', enabled: true }
const stream = {
  getTracks: () => [videoTrack, audioTrack],
  getAudioTracks: () => [audioTrack],
}
const preview = { srcObject: null, muted: false, volume: 1 }

attachSilentLocalPreview(preview, stream)
assert.equal(preview.srcObject, stream)
assert.equal(preview.muted, true)
assert.equal(preview.volume, 0)

const senders = [
  {
    track: staleTrack,
    async replaceTrack(track) {
      this.track = track
    },
  },
]
const connection = {
  getSenders: () => senders,
  addTrack(track, outboundStream) {
    assert.equal(outboundStream, stream)
    const sender = { track, async replaceTrack(nextTrack) { this.track = nextTrack } }
    senders.push(sender)
    return sender
  },
}

await syncBroadcastTracks(connection, stream)
assert.equal(senders[0].track, null)
assert.ok(senders.some((sender) => sender.track === videoTrack))
assert.ok(senders.some((sender) => sender.track === audioTrack))
assert.equal(requestedPeerRole('host'), 'host')
assert.equal(requestedPeerRole('viewer'), 'viewer')
assert.equal(requestedPeerRole('owner'), 'viewer')
await assert.rejects(
  syncBroadcastTracks(connection, {
    getTracks: () => [videoTrack],
    getAudioTracks: () => [],
  }),
  /não contém uma faixa de áudio/,
)

const silentPcm = new Float32Array(480 * 2)
const tonePcm = new Float32Array(480 * 2)
for (let frame = 0; frame < 480; frame += 1) {
  const sample = Math.sin((2 * Math.PI * 440 * frame) / 48_000) * 0.25
  tonePcm[frame * 2] = sample
  tonePcm[frame * 2 + 1] = sample
}
const silentSignal = measureF32StereoPcm(new Uint8Array(silentPcm.buffer))
const audibleSignal = measureF32StereoPcm(new Uint8Array(tonePcm.buffer))
assert.equal(silentSignal.hasSignal, false)
assert.equal(silentSignal.peak, 0)
assert.equal(canStartProcessAudioFromPcm(new Uint8Array(silentPcm.buffer)), true)
assert.equal(audibleSignal.hasSignal, true)
assert.ok(audibleSignal.peak > 0.2)

console.log(
  JSON.stringify({
    check: 'broadcast-routing',
    previewMuted: preview.muted,
    outboundAudio: true,
    silentAppCanStart: canStartProcessAudioFromPcm(
      new Uint8Array(silentPcm.buffer),
    ),
    audiblePcmAccepted: audibleSignal.hasSignal,
    memberCanRequestHost: true,
  }),
)
