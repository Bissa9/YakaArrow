import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import * as THREE from 'three'
import { useWhistle } from './audio/useWhistle'
import { useInput } from './input/useInput'
import { Experience } from './scene/Experience'
import { Hud, StartScreen } from './ui/Overlay'

export default function App() {
  const { live, ui, mic, message, enable } = useWhistle()
  const input = useInput()
  const [started, setStarted] = useState(false)

  const enter = useCallback(() => {
    setStarted(true)
  }, [])

  const enterWithMic = useCallback(() => {
    setStarted(true)
    void enable()
  }, [enable])

  const lockPointer = useCallback(
    (event: { target: EventTarget | null }) => {
      if (!started) return
      const el = event.target as HTMLElement | null
      void el?.requestPointerLock?.()
    },
    [started],
  )

  return (
    <div className="app">
      <Canvas
        dpr={[1, 1.15]}
        shadows={false}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{ fov: 58, near: 0.12, far: 76, position: [0, 4.4, 12] }}
        onCreated={({ gl }) => {
          gl.setClearColor('#1c0e08')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.22
        }}
        onPointerDown={lockPointer}
      >
        <Experience started={started} whistle={live} input={input} />
      </Canvas>
      {started ? (
        <Hud ui={ui} mic={mic} message={message} />
      ) : (
        <StartScreen
          pending={mic === 'pending'}
          onWhistle={enterWithMic}
          onKeyboard={enter}
        />
      )}
    </div>
  )
}
