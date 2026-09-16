import { useCallback, useEffect, useRef, useState } from 'react'
import { detectWhistle, type WhistleSample } from './detectWhistle'

export type MicState = 'idle' | 'pending' | 'on' | 'denied' | 'error'

export type LiveWhistle = WhistleSample

const silent: LiveWhistle = { active: false, hz: 0, speed: 0, level: 0 }

export function useWhistle() {
  const live = useRef<LiveWhistle>({ ...silent })
  const [ui, setUi] = useState<LiveWhistle>(silent)
  const [mic, setMic] = useState<MicState>('idle')
  const [message, setMessage] = useState('')
  const cleanupRef = useRef<(() => void) | null>(null)

  const enable = useCallback(async () => {
    if (cleanupRef.current) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setMic('error')
      setMessage('This browser cannot read the microphone.')
      return
    }

    setMic('pending')
    setMessage('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const ctx = new AudioContext()
      if (ctx.state === 'suspended') await ctx.resume()

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.62
      source.connect(analyser)

      const freq = new Uint8Array(analyser.frequencyBinCount)
      const gate = { active: false }
      let raf = 0
      let lastUi = 0

      const tick = (now: number) => {
        analyser.getByteFrequencyData(freq)
        const sample = detectWhistle(freq, ctx.sampleRate, analyser.fftSize, gate)
        live.current = sample
        if (now - lastUi > 110) {
          lastUi = now
          setUi(sample)
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      cleanupRef.current = () => {
        cancelAnimationFrame(raf)
        source.disconnect()
        void ctx.close()
        stream.getTracks().forEach((track) => track.stop())
        live.current = { ...silent }
        cleanupRef.current = null
      }

      setMic('on')
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMic('denied')
        setMessage('Microphone blocked. Hold Space to fly instead.')
      } else {
        setMic('error')
        setMessage('Could not open the microphone. Hold Space to fly instead.')
      }
    }
  }, [])

  useEffect(() => {
    return () => cleanupRef.current?.()
  }, [])

  return { live, ui, mic, message, enable }
}
