import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../lib/rng'
import { HALL } from './constants'

const ROCK_COUNT_CAP = 400

function createRockGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 1)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = v.normalize()
    const wobble = 0.72 + ((i * 17) % 10) * 0.028 + Math.sin(i * 1.7) * 0.08
    v.copy(n).multiplyScalar(wobble)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

type Piece = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  sx: number
  sy: number
  sz: number
  r: number
  g: number
  b: number
}

function paint(rand: () => number, yellow: boolean): [number, number, number] {
  if (yellow) {
    return [0.62 + rand() * 0.22, 0.42 + rand() * 0.16, 0.16 + rand() * 0.08]
  }
  return [0.38 + rand() * 0.12, 0.2 + rand() * 0.08, 0.08 + rand() * 0.04]
}

function buildPieces(): Piece[] {
  const rand = mulberry32(0x5a1a)
  const pieces: Piece[] = []
  const { width: W, height: H, length: L } = HALL
  const hw = W / 2
  const hl = L / 2

  const push = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    yellow: boolean,
  ) => {
    if (pieces.length >= ROCK_COUNT_CAP) return
    const [r, g, b] = paint(rand, yellow)
    pieces.push({
      x,
      y,
      z,
      rx: rand() * Math.PI,
      ry: rand() * Math.PI,
      rz: rand() * Math.PI,
      sx,
      sy,
      sz,
      r,
      g,
      b,
    })
  }

  for (let z = -hl; z <= hl; z += 2.35) {
    for (let y = 0.75; y <= H - 0.35; y += 2.05) {
      const j = (rand() - 0.5) * 0.32
      push(-hw + 0.18 + j, y + (rand() - 0.5) * 0.18, z + (rand() - 0.5) * 0.28, 0.78 + rand() * 0.4, 1.2 + rand() * 0.45, 1.25 + rand() * 0.4, true)
      push(hw - 0.18 - j, y + (rand() - 0.5) * 0.18, z + (rand() - 0.5) * 0.28, 0.78 + rand() * 0.4, 1.2 + rand() * 0.45, 1.25 + rand() * 0.4, true)
    }
  }

  for (let x = -hw + 1.1; x <= hw - 1.1; x += 2.6) {
    for (let y = 0.9; y <= H - 0.5; y += 2.2) {
      push(x + (rand() - 0.5) * 0.28, y, -hl + 0.22, 1.15 + rand() * 0.35, 1.15 + rand() * 0.35, 0.72 + rand() * 0.28, true)
      push(x + (rand() - 0.5) * 0.28, y, hl - 0.22, 1.15 + rand() * 0.35, 1.15 + rand() * 0.35, 0.72 + rand() * 0.28, true)
    }
  }

  for (let z = -hl; z <= hl; z += 3.15) {
    for (let x = -hw; x <= hw; x += 3.15) {
      push(
        x + (rand() - 0.5) * 0.5,
        0.18 + rand() * 0.12,
        z + (rand() - 0.5) * 0.5,
        1.4 + rand() * 0.5,
        0.4 + rand() * 0.22,
        1.4 + rand() * 0.5,
        true,
      )
    }
  }

  for (let z = -hl; z <= hl; z += 3.35) {
    for (let x = -hw; x <= hw; x += 3.35) {
      push(
        x + (rand() - 0.5) * 0.4,
        H - 0.2,
        z + (rand() - 0.5) * 0.4,
        1.32 + rand() * 0.5,
        0.44 + rand() * 0.26,
        1.32 + rand() * 0.5,
        true,
      )
    }
  }

  for (let i = 0; i < 18 && pieces.length < ROCK_COUNT_CAP; i++) {
    const side = rand() > 0.5 ? 1 : -1
    push(
      side * (hw - 1.2 - rand()),
      0.7 + rand() * 1.4,
      (rand() - 0.5) * L * 0.84,
      1.6 + rand() * 1.1,
      1.1 + rand() * 1.2,
      1.5 + rand() * 1.0,
      rand() > 0.25,
    )
  }

  return pieces
}

const LANTERNS: [number, number, number][] = [
  [-5.6, 5.4, -20],
  [5.6, 5.1, -10],
  [-5.4, 5.6, 0],
  [5.5, 5.2, 10],
  [-5.6, 5.5, 20],
  [5.4, 5.3, -30],
  [-5.5, 5.2, 30],
]

export function Hall() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => createRockGeometry(), [])
  const pieces = useMemo(() => buildPieces(), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    pieces.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z)
      dummy.rotation.set(p.rx, p.ry, p.rz)
      dummy.scale.set(p.sx, p.sy, p.sz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      color.setRGB(p.r, p.g, p.b)
      mesh.setColorAt(i, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [pieces])

  const { width: W, height: H, length: L } = HALL
  const wallColor = '#8a6420'
  const floorColor = '#4a3010'

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <planeGeometry args={[W + 2.4, L + 2.4]} />
        <meshLambertMaterial color={floorColor} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H + 0.2, 0]}>
        <planeGeometry args={[W + 2.4, L + 2.4]} />
        <meshLambertMaterial color="#2a1608" />
      </mesh>
      <mesh position={[-W / 2 - 0.45, H / 2, 0]}>
        <boxGeometry args={[1.1, H + 1.5, L + 2]} />
        <meshLambertMaterial color={wallColor} />
      </mesh>
      <mesh position={[W / 2 + 0.45, H / 2, 0]}>
        <boxGeometry args={[1.1, H + 1.5, L + 2]} />
        <meshLambertMaterial color={wallColor} />
      </mesh>
      <mesh position={[0, H / 2, -L / 2 - 0.45]}>
        <boxGeometry args={[W + 2, H + 1.5, 1.1]} />
        <meshLambertMaterial color={wallColor} />
      </mesh>
      <mesh position={[0, H / 2, L / 2 + 0.45]}>
        <boxGeometry args={[W + 2, H + 1.5, 1.1]} />
        <meshLambertMaterial color={wallColor} />
      </mesh>

      <instancedMesh ref={meshRef} args={[geo, undefined, pieces.length]} frustumCulled dispose={null}>
        <meshLambertMaterial />
      </instancedMesh>

      {LANTERNS.map((pos) => (
        <mesh key={pos.join(',')} position={pos}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshBasicMaterial color="#ff2c16" />
        </mesh>
      ))}
    </group>
  )
}
