type LocalPreviewElement = Pick<HTMLVideoElement, 'srcObject' | 'muted' | 'volume'>
type PeerConnectionTracks = Pick<RTCPeerConnection, 'addTrack' | 'getSenders'>

export function attachSilentLocalPreview(
  video: LocalPreviewElement,
  stream: MediaStream,
) {
  video.srcObject = stream
  video.muted = true
  video.volume = 0
}

export async function syncBroadcastTracks(
  connection: PeerConnectionTracks,
  stream: MediaStream,
) {
  const audioTracks = stream.getAudioTracks()
  if (!audioTracks.length) {
    throw new Error('A transmissão não contém uma faixa de áudio')
  }

  const currentTracks = new Set(stream.getTracks())
  for (const sender of connection.getSenders()) {
    if (sender.track && !currentTracks.has(sender.track)) {
      await sender.replaceTrack(null)
    }
  }

  const sentTracks = new Set(
    connection
      .getSenders()
      .map((sender) => sender.track)
      .filter((track): track is MediaStreamTrack => Boolean(track)),
  )
  for (const track of currentTracks) {
    if (!sentTracks.has(track)) connection.addTrack(track, stream)
  }

  const missingAudio = audioTracks.some(
      (track) =>
        !connection.getSenders().some((sender) => sender.track === track),
  )
  if (missingAudio) {
    throw new Error('A faixa de áudio não foi adicionada à transmissão')
  }
}
