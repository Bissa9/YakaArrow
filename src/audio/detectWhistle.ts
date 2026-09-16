export type WhistleSample = {
  active: boolean
  hz: number
  speed: number
  level: number
  hearing: boolean
}

export type WhistleGate = {
  active: boolean
}

const MIN_HZ = 520
const MAX_HZ = 4800
const LOW_SPEED_HZ = 780
const HIGH_SPEED_HZ = 3100

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function rmsFromWave(wave: Uint8Array) {
  let sum = 0
  for (let i = 0; i < wave.length; i++) {
    const n = ((wave[i] ?? 128) - 128) / 128
    sum += n * n
  }
  return Math.sqrt(sum / wave.length)
}

export function detectWhistle(
  freq: Uint8Array,
  wave: Uint8Array,
  sampleRate: number,
  fftSize: number,
  gate: WhistleGate,
): WhistleSample {
  const rms = rmsFromWave(wave)
  const binHz = sampleRate / fftSize
  const minBin = Math.max(1, Math.floor(MIN_HZ / binHz))
  const maxBin = Math.min(freq.length - 2, Math.floor(MAX_HZ / binHz))

  let peak = 0
  let peakBin = minBin
  let bandSum = 0
  let totalSum = 0

  for (let i = 1; i < freq.length; i++) {
    const v = freq[i] ?? 0
    totalSum += v
    if (i >= minBin && i <= maxBin) {
      bandSum += v
      if (v > peak) {
        peak = v
        peakBin = i
      }
    }
  }

  const y0 = freq[peakBin - 1] ?? peak
  const y1 = peak
  const y2 = freq[peakBin + 1] ?? peak
  const denom = 2 * (2 * y1 - y0 - y2)
  const delta = denom === 0 ? 0 : (y2 - y0) / denom
  const hz = (peakBin + delta) * binHz

  const bins = maxBin - minBin + 1
  const mean = bandSum / bins
  const peakLevel = peak / 255
  const purity = mean > 1 ? peak / mean : 0
  const bandRatio = totalSum > 1 ? bandSum / totalSum : 0
  const hearing = rms > 0.012 || peak > 18

  let strength = 0
  const loudEnough = peak > 36 || rms > 0.028
  const looksTonal = purity > 1.35 || (peak > 70 && bandRatio > 0.2)
  if (loudEnough && looksTonal && hz >= MIN_HZ) {
    const levelPart = clamp((Math.max(peakLevel, rms * 3) - 0.08) / 0.55, 0, 1)
    const purityPart = clamp((purity - 1.1) / 2.8, 0, 1)
    strength = levelPart * (0.4 + 0.6 * purityPart)
    if (peak > 110 && rms > 0.04) strength = Math.max(strength, 0.55)
  }

  let active = gate.active
  if (!active && strength > 0.22) active = true
  if (active && strength < 0.1) active = false
  gate.active = active

  const t = clamp((hz - LOW_SPEED_HZ) / (HIGH_SPEED_HZ - LOW_SPEED_HZ), 0, 1)
  const speed = active ? t * t * (3 - 2 * t) : 0

  return {
    active,
    hz: active ? hz : 0,
    speed,
    level: clamp(Math.max(rms * 4.2, peakLevel * 0.85), 0, 1),
    hearing,
  }
}
