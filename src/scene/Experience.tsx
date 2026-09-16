import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { LiveWhistle } from '../audio/useWhistle'
import type { InputState } from '../input/useInput'
import { FLY, HALL } from './constants'
import { Hall } from './Hall'
import { YakaArrow } from './YakaArrow'

const TRAIL = 18
const _dir = new THREE.Vector3()
const _velDir = new THREE.Vector3()
const _cam = new THREE.Vector3()
const _look = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _forward = new THREE.Vector3(0, 0, -1)
const _hover = new THREE.Vector3()

type Props = {
  started: boolean
  whistle: RefObject<LiveWhistle>
  input: RefObject<InputState>
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function headingToDir(yaw: number, pitch: number, out: THREE.Vector3) {
  const cp = Math.cos(pitch)
  out.set(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp)
  return out
}

export function Experience({ started, whistle, input }: Props) {
  const { camera } = useThree()
  const arrowRoot = useRef<THREE.Group>(null)
  const arrowInner = useRef<THREE.Group>(null)
  const glow = useRef<THREE.PointLight>(null)
  const pos = useRef(new THREE.Vector3(0, 3.5, 0))
  const vel = useRef(new THREE.Vector3())
  const heading = useRef({ yaw: 0, pitch: 0 })
  const spin = useRef(0)
  const speedNow = useRef(0)
  const trail = useMemo(() => {
    const positions = new Float32Array(TRAIL * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.LineBasicMaterial({
      color: 0xff2a14,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const line = new THREE.Line(geo, mat)
    line.frustumCulled = false
    return { line, positions, geo, mat }
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const root = arrowRoot.current
    const inner = arrowInner.current
    if (!root || !inner) return

    const w = whistle.current
    const k = input.current
    const micFly = Boolean(w?.active)
    const keyFly = Boolean(k?.space)
    const flying = micFly || keyFly
    const targetFactor = micFly ? (w?.speed ?? 0) : keyFly ? (k?.shift ? 0.92 : 0.48) : 0
    const targetSpeed = flying ? FLY.minSpeed + targetFactor * (FLY.maxSpeed - FLY.minSpeed) : 0
    speedNow.current += (targetSpeed - speedNow.current) * (1 - Math.exp(-(flying ? 3.4 : 5.2) * dt))

    if (started && k) {
      heading.current.yaw -= k.mx * 0.0031
      heading.current.pitch = clamp(heading.current.pitch - k.my * 0.0026, -0.52, 0.52)
      k.mx = 0
      k.my = 0
      if (k.left) heading.current.yaw += dt * 1.35
      if (k.right) heading.current.yaw -= dt * 1.35
      if (k.rise) heading.current.pitch = clamp(heading.current.pitch + dt * 1.05, -0.52, 0.52)
      if (k.dive) heading.current.pitch = clamp(heading.current.pitch - dt * 1.05, -0.52, 0.52)
    }

    if (!flying) {
      heading.current.yaw += dt * FLY.idleTurn
      heading.current.pitch += (0 - heading.current.pitch) * (1 - Math.exp(-0.55 * dt))
    }

    headingToDir(heading.current.yaw, heading.current.pitch, _dir)

    if (flying && speedNow.current > 0.05) {
      _velDir.copy(_dir).multiplyScalar(speedNow.current)
      vel.current.lerp(_velDir, 1 - Math.exp(-4.2 * dt))
    } else {
      vel.current.multiplyScalar(Math.exp(-3.4 * dt))
    }

    pos.current.addScaledVector(vel.current, dt)

    const hw = HALL.width / 2 - 1.05
    const hl = HALL.length / 2 - 1.05
    const minY = 1.15
    const maxY = HALL.height - 1.2
    let bounced = false
    if (pos.current.x > hw) {
      pos.current.x = hw
      vel.current.x = -Math.abs(vel.current.x)
      bounced = true
    } else if (pos.current.x < -hw) {
      pos.current.x = -hw
      vel.current.x = Math.abs(vel.current.x)
      bounced = true
    }
    if (pos.current.y > maxY) {
      pos.current.y = maxY
      vel.current.y = -Math.abs(vel.current.y)
      bounced = true
    } else if (pos.current.y < minY) {
      pos.current.y = minY
      vel.current.y = Math.abs(vel.current.y)
      bounced = true
    }
    if (pos.current.z > hl) {
      pos.current.z = hl
      vel.current.z = -Math.abs(vel.current.z)
      bounced = true
    } else if (pos.current.z < -hl) {
      pos.current.z = -hl
      vel.current.z = Math.abs(vel.current.z)
      bounced = true
    }
    if (bounced) {
      vel.current.multiplyScalar(FLY.bounce)
      const len = vel.current.length()
      if (len > 0.08) {
        heading.current.yaw = Math.atan2(vel.current.x, -vel.current.z)
        heading.current.pitch = Math.asin(clamp(vel.current.y / len, -1, 1))
        headingToDir(heading.current.yaw, heading.current.pitch, _dir)
      }
    }

    const wave = flying ? 0.16 : 1
    _hover.set(
      Math.sin(t * 0.85) * 0.09 * wave,
      Math.sin(t * 1.35) * 0.16 * wave,
      Math.cos(t * 1.05) * 0.08 * wave,
    )
    root.position.copy(pos.current).add(_hover)

    const moving = flying && speedNow.current > 0.6
    if (moving) {
      _q.setFromUnitVectors(_forward, _dir)
      root.quaternion.slerp(_q, 1 - Math.exp(-8 * dt))
      inner.rotation.set(0, 0, Math.sin(t * 4.5) * 0.04)
    } else {
      spin.current += dt * 0.7
      inner.rotation.set(Math.sin(t * 0.62) * 0.22, spin.current, Math.sin(t * 0.8) * 0.18)
    }

    const positions = trail.positions
    for (let i = TRAIL - 1; i > 0; i--) {
      const to = i * 3
      const from = (i - 1) * 3
      positions[to] = positions[from] ?? 0
      positions[to + 1] = positions[from + 1] ?? 0
      positions[to + 2] = positions[from + 2] ?? 0
    }
    positions[0] = root.position.x
    positions[1] = root.position.y
    positions[2] = root.position.z
    trail.geo.attributes.position.needsUpdate = true
    trail.mat.opacity = moving ? 0.28 + targetFactor * 0.45 : Math.max(0, trail.mat.opacity - dt * 1.8)

    if (glow.current) {
      glow.current.intensity = 1.4 + (moving ? 2.8 + targetFactor * 3.2 : 0.4 * (0.6 + Math.sin(t * 2) * 0.4))
    }

    if (!started) {
      camera.position.set(
        root.position.x + Math.sin(t * 0.11) * 8.4,
        root.position.y + 1.35,
        root.position.z + Math.cos(t * 0.11) * 8.4,
      )
      camera.lookAt(root.position)
      const cam = camera as THREE.PerspectiveCamera
      if (Math.abs(cam.fov - 58) > 0.05) {
        cam.fov = 58
        cam.updateProjectionMatrix()
      }
      return
    }

    const dist = 5.4 + Math.min(speedNow.current * 0.12, 3.2)
    _cam.copy(pos.current).addScaledVector(_dir, -dist)
    _cam.y += 1.55 + Math.min(speedNow.current * 0.03, 0.6)
    _cam.x = clamp(_cam.x, -hw + 0.4, hw - 0.4)
    _cam.y = clamp(_cam.y, minY + 0.4, maxY - 0.2)
    _cam.z = clamp(_cam.z, -hl + 0.4, hl - 0.4)
    camera.position.lerp(_cam, 1 - Math.exp(-FLY.follow * dt))
    _look.copy(pos.current).addScaledVector(_dir, 2.2)
    _look.y += 0.2
    camera.lookAt(_look)

    const cam = camera as THREE.PerspectiveCamera
    const fov = 56 + Math.min(speedNow.current * 0.32, 9)
    if (Math.abs(cam.fov - fov) > 0.08) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })

  return (
    <>
      <color attach="background" args={['#140303']} />
      <fog attach="fog" args={['#180505', 11, 46]} />
      <ambientLight intensity={0.16} color="#4a1810" />
      <hemisphereLight args={['#6a2218', '#241208', 0.48]} />
      <pointLight position={[-4.8, 6.1, -16]} color="#ff2a14" intensity={5.2} distance={24} decay={2} />
      <pointLight position={[4.8, 6.0, 16]} color="#ff4018" intensity={4.6} distance={24} decay={2} />
      <Hall />
      <group ref={arrowRoot} position={[0, 3.5, 0]}>
        <group ref={arrowInner} scale={1.35}>
          <YakaArrow />
        </group>
        <pointLight ref={glow} color="#ff2c12" intensity={1.8} distance={14} decay={2} />
      </group>
      <primitive object={trail.line} />
    </>
  )
}
