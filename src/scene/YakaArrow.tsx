type ArrowMats = {
  body: string
  edge: string
  dark: string
}

const colors: ArrowMats = {
  body: '#b50d12',
  edge: '#ff3a28',
  dark: '#3a0508',
}

export function YakaArrow() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.034, 0.048, 1.08, 6]} />
        <meshStandardMaterial
          color={colors.body}
          metalness={0.78}
          roughness={0.3}
          emissive="#6a0000"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0.66, 0]} scale={[1, 1, 0.38]}>
        <coneGeometry args={[0.17, 0.4, 4]} />
        <meshStandardMaterial
          color={colors.edge}
          metalness={0.62}
          roughness={0.22}
          emissive="#ff220c"
          emissiveIntensity={0.85}
        />
      </mesh>
      <mesh position={[0, 0.46, 0]} scale={[0.72, 0.28, 0.22]}>
        <boxGeometry args={[0.28, 0.22, 0.28]} />
        <meshStandardMaterial
          color={colors.body}
          metalness={0.7}
          roughness={0.28}
          emissive="#8a0000"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <coneGeometry args={[0.07, 0.16, 6]} />
        <meshStandardMaterial color={colors.dark} metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.42, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.28, 0.08, 0.012]} />
        <meshStandardMaterial
          color={colors.edge}
          metalness={0.5}
          roughness={0.32}
          emissive="#d41010"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0, -0.42, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.28, 0.08, 0.012]} />
        <meshStandardMaterial
          color={colors.edge}
          metalness={0.5}
          roughness={0.32}
          emissive="#d41010"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color="#ff2a14" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}
