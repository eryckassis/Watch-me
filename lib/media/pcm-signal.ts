export type PcmSignalMeasurement = {
  peak: number
  rms: number
  hasSignal: boolean
}

const DEFAULT_SIGNAL_THRESHOLD = 0.0001

export function canStartProcessAudioFromPcm(raw: Uint8Array) {
  return raw.byteLength >= 8 && raw.byteLength % 8 === 0
}

export function measureF32StereoPcm(
  raw: Uint8Array,
  signalThreshold = DEFAULT_SIGNAL_THRESHOLD,
): PcmSignalMeasurement {
  const sampleCount = Math.floor(raw.byteLength / 4)
  if (!sampleCount) return { peak: 0, rms: 0, hasSignal: false }

  const view = new DataView(raw.buffer, raw.byteOffset, sampleCount * 4)
  let peak = 0
  let squareSum = 0
  let finiteSamples = 0

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = view.getFloat32(index * 4, true)
    if (!Number.isFinite(sample)) continue
    const amplitude = Math.abs(sample)
    peak = Math.max(peak, amplitude)
    squareSum += sample * sample
    finiteSamples += 1
  }

  const rms = finiteSamples ? Math.sqrt(squareSum / finiteSamples) : 0
  return {
    peak,
    rms,
    hasSignal: peak >= signalThreshold,
  }
}
