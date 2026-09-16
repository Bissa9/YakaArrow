export type WhistleSample = {
  active: boolean
  hz: number
  speed: number
  level: number
}

export type WhistleGate = {
  active: boolean
}

const MIN_HZ = 720
const MAX_HZ = 4200
const LOW_SPEED_HZ = 980
const HIGH_SPEED_HZ = 3050

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function detectWhistle(
  freq: Uint8Array,
  sampleRate: number,
  fftSize: number,
  gate: WhistleGate,
): WhistleSample {
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
    if (i >= minBin && i <= maxBin && v > peak) {
      peak = v
      peakBin = i
    }
    if (i >= minBin && i <= maxBin) bandSum += v
  }

  const y0 = freq[peakBin - 1] ?? peak
  const y1 = peak
  const y2 = freq[peakBin + 1] ?? peak
  const denom = 2 * (2 * y1 - y0 - y2)
  const delta = denom === 0 ? 0 : (y2 - y0) / denom
  const hz = (peakBin + delta) * binHz

  const bins = maxBin - minBin + 1
  const mean = bandSum / bins
  const level = peak / 255
  const purity = mean > 1 ? peak / mean : 0
  const bandRatio = totalSum > 1 ? bandSum / totalSum : 0

  let strength = 0
  if (peak > 88 && purity > 2.35 && bandRatio > 0.22) {
    const levelPart = clamp((level - 0.22) / 0.58, 0, 1)
    const purityPart = clamp((purity - 2.2) / 3.4, 0, 1)
    strength = levelPart * (0.45 + 0.55 * purityPart)
  }

  let active = gate.active
  if (!active && strength > 0.4) active = true
  if (active && strength < 0.2) active = false
  gate.active = active

  const t = clamp((hz - LOW_SPEED_HZ) / (HIGH_SPEED_HZ - LOW_SPEED_HZ), 0, 1)
  const speed = active ? t * t * (3 - 2 * t) : 0

  return {
    active,
    hz: active ? hz : 0,
    speed,
    level: active ? level : 0,
  }
}
