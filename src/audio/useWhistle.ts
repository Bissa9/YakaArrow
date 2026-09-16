import { useCallback, useEffect, useRef, useState } from 'react'
import { detectWhistle, type WhistleSample } from './detectWhistle'

export type MicState = 'idle' | 'pending' | 'on' | 'denied' | 'error'

export type LiveWhistle = WhistleSample

const silent: LiveWhistle = { active: false, hz: 0, speed: 0, level: 0, hearing: false }

function frameBlocksMic() {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

export function useWhistle() {
  const live = useRef<LiveWhistle>({ ...silent })
  const [ui, setUi] = useState<LiveWhistle>(silent)
  const [mic, setMic] = useState<MicState>('idle')
  const [message, setMessage] = useState('')
  const cleanupRef = useRef<(() => void) | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const quietSince = useRef<number | null>(null)

  const enable = useCallback(async () => {
    if (cleanupRef.current) return
    if (!window.isSecureContext) {
      setMic('error')
      setMessage(
        'The browser blocked the mic because this page is not HTTPS. Open the preview in its own tab, or run npm run dev on your computer.',
      )
      return
    }
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
          autoGainControl: true,
        },
      })
      const ctx = new AudioContext()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.45
      source.connect(analyser)

      const freq = new Uint8Array(analyser.frequencyBinCount)
      const wave = new Uint8Array(analyser.fftSize)
      const gate = { active: false }
      let raf = 0
      let lastUi = 0
      quietSince.current = performance.now()

      const tick = (now: number) => {
        analyser.getByteFrequencyData(freq)
        analyser.getByteTimeDomainData(wave)
        const sample = detectWhistle(freq, wave, ctx.sampleRate, analyser.fftSize, gate)
        live.current = sample

        if (sample.hearing) quietSince.current = null
        else if (quietSince.current === null) quietSince.current = now

        if (now - lastUi > 90) {
          lastUi = now
          setUi(sample)
          if (!sample.hearing && quietSince.current !== null && now - quietSince.current > 2500) {
            setMessage(
              frameBlocksMic()
                ? 'This preview frame is not receiving mic audio. Open the page in its own browser tab, or run it locally.'
                : 'Mic is open, but no audio is arriving. Check the browser’s microphone permission for this site.',
            )
          } else if (sample.hearing) {
            setMessage('')
          }
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      cleanupRef.current = () => {
        cancelAnimationFrame(raf)
        source.disconnect()
        void ctx.close()
        ctxRef.current = null
        stream.getTracks().forEach((track) => track.stop())
        live.current = { ...silent }
        cleanupRef.current = null
      }

      setMic('on')
      if (frameBlocksMic()) {
        setMessage('If whistling does nothing, open this page in its own tab — preview frames often block the mic.')
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMic('denied')
        setMessage(
          frameBlocksMic()
            ? 'Microphone blocked in this frame. Open the preview in a new tab and Allow, or hold Space.'
            : 'Microphone blocked. Allow it for this site, or hold Space to fly.',
        )
      } else {
        setMic('error')
        setMessage('Could not open the microphone. Hold Space to fly, or open the game in a local browser tab.')
      }
    }
  }, [])

  useEffect(() => {
    const resume = () => {
      const ctx = ctxRef.current
      if (ctx && ctx.state === 'suspended') void ctx.resume()
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      cleanupRef.current?.()
    }
  }, [])

  return { live, ui, mic, message, enable }
}
