'use client'

import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { TelemetryFrame } from '@/lib/spacemouse/types'

const BASE_TOP = 0.38
const PUCK_Z = -0.32

function useEllipseExtrude(rx: number, rz: number, depth: number, bevel: number) {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 8,
      curveSegments: 128,
    })
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, bevel, 0)
    geo.computeVertexNormals()
    return geo
  }, [rx, rz, depth, bevel])
}

function usePuckGeometry() {
  return useMemo(() => {
    const p: [number, number][] = [
      [0, 0],
      [0.8, 0],
      [0.86, 0.035],
      [0.87, 0.07],
      [0.87, 0.2],
      [0.845, 0.215],
      [0.87, 0.23],
      [0.87, 0.36],
      [0.845, 0.375],
      [0.87, 0.39],
      [0.87, 0.5],
      [0.855, 0.545],
      [0.82, 0.575],
      [0.76, 0.59],
      [0.55, 0.575],
      [0.25, 0.565],
      [0, 0.562],
    ]
    const geo = new THREE.LatheGeometry(
      p.map(([x, y]) => new THREE.Vector2(x, y)),
      128,
    )
    geo.computeVertexNormals()
    return geo
  }, [])
}

interface SpaceMouseModelProps {
  /** Optional live/simulated motion used to subtly deflect the puck. */
  motionRef?: RefObject<TelemetryFrame>
}

/**
 * Temporary demo representation of the controller. Swap this component for a
 * GLB/GLTF loader (e.g. drei `useGLTF`) once the real CAD model is available.
 */
export function SpaceMouseModel({ motionRef }: SpaceMouseModelProps) {
  const baseGeo = useEllipseExtrude(2.0, 1.5, 0.22, 0.08)
  const plateGeo = useEllipseExtrude(1.82, 1.34, 0.01, 0.025)
  const puckGeo = usePuckGeometry()
  const puckRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const puck = puckRef.current
    const m = motionRef?.current
    if (!puck || !m) return
    const k = 1 - Math.exp(-delta * 8)
    const deg = Math.PI / 180
    puck.position.x += (m.x * 0.05 - puck.position.x) * k
    puck.position.z += (PUCK_Z + m.y * 0.05 - puck.position.z) * k
    puck.position.y += (BASE_TOP + 0.08 + m.z * 0.025 - puck.position.y) * k
    puck.rotation.x += (m.rx * deg * 0.25 - puck.rotation.x) * k
    puck.rotation.z += (m.ry * deg * 0.25 - puck.rotation.z) * k
    puck.rotation.y += (m.rz * deg * 0.4 - puck.rotation.y) * k
  })

  return (
    <group>
      {/* Anodised aluminium base */}
      <mesh geometry={baseGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#33373a"
          metalness={0.9}
          roughness={0.3}
          clearcoat={0.4}
          clearcoatRoughness={0.25}
        />
      </mesh>

      {/* Graphite top plate */}
      <mesh geometry={plateGeo} position={[0, BASE_TOP - 0.005, 0]} receiveShadow>
        <meshStandardMaterial color="#111314" metalness={0.5} roughness={0.68} />
      </mesh>

      {/* Puck collar and illumination ring */}
      <group position={[0, BASE_TOP, PUCK_Z]}>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.0, 1.04, 0.06, 128]} />
          <meshStandardMaterial color="#0c0d0e" metalness={0.7} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.955, 0.009, 16, 160]} />
          <meshStandardMaterial
            color="#FF8B42"
            emissive="#FF6A24"
            emissiveIntensity={2.0}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Machined control puck */}
      <group ref={puckRef} position={[0, BASE_TOP + 0.08, PUCK_Z]}>
        <mesh geometry={puckGeo} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#a3a6a2"
            metalness={1}
            roughness={0.28}
            clearcoat={0.2}
            clearcoatRoughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.566, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.62, 128]} />
          <meshStandardMaterial color="#3a3e3f" metalness={0.9} roughness={0.4} />
        </mesh>
      </group>

      {/* Function keys */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.62, 0.06, 0.3]}
          radius={0.025}
          smoothness={4}
          position={[side * 0.92, BASE_TOP + 0.03, 0.88]}
          rotation={[0, side * -0.32, 0]}
          castShadow
        >
          <meshStandardMaterial color="#1c1f20" metalness={0.6} roughness={0.42} />
        </RoundedBox>
      ))}

      {/* Status LED */}
      <mesh position={[0, BASE_TOP + 0.012, 1.18]}>
        <boxGeometry args={[0.22, 0.012, 0.03]} />
        <meshStandardMaterial color="#FFB16D" emissive="#FF8B42" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}
