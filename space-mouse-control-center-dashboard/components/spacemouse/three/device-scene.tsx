'use client'

import {
  ContactShadows,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Lightformer,
  OrbitControls,
} from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, type ComponentRef, type RefObject } from 'react'
import type * as THREE from 'three'
import type { TelemetryFrame } from '@/lib/spacemouse/types'
import { SpaceMouseModel } from './spacemouse-model'

export interface DeviceSceneProps {
  showGrid: boolean
  showAxes: boolean
  resetSignal: number
  motionRef: RefObject<TelemetryFrame>
}

const IDLE_RESUME_MS = 2500
const CAMERA_POSITION: [number, number, number] = [5.4, 3.9, 6.0]
const CAMERA_TARGET: [number, number, number] = [0, 0.35, 0]

function IdleRotator({
  interactingRef,
  resetSignal,
  children,
}: {
  interactingRef: RefObject<number>
  resetSignal: number
  children: React.ReactNode
}) {
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    if (ref.current) ref.current.rotation.y = 0
  }, [resetSignal])

  useFrame((_, delta) => {
    if (!ref.current) return
    const idleFor = performance.now() - (interactingRef.current ?? 0)
    if (idleFor > IDLE_RESUME_MS) ref.current.rotation.y += delta * 0.12
  })

  return <group ref={ref}>{children}</group>
}

function SceneContents({ showGrid, showAxes, resetSignal, motionRef }: DeviceSceneProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const lastInteraction = useRef(0)

  useEffect(() => {
    if (resetSignal === 0) return
    const controls = controlsRef.current
    if (!controls) return
    controls.object.position.set(...CAMERA_POSITION)
    controls.target.set(...CAMERA_TARGET)
    controls.update()
    lastInteraction.current = 0
  }, [resetSignal])

  return (
    <>
      <fog attach="fog" args={['#0a0b0c', 10, 22]} />

      <ambientLight intensity={0.14} color="#d8d6d0" />
      {/* Neutral key light, upper front-left */}
      <directionalLight
        position={[-4, 7, 5]}
        intensity={3.2}
        color="#f4f1ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      {/* Warm amber rim, rear-right */}
      <directionalLight position={[5, 3, -6]} intensity={3.2} color="#ff7a33" />
      {/* Cool-neutral fill to keep metal detail in shadow */}
      <directionalLight position={[-6, 2, -2]} intensity={0.35} color="#cdd4d6" />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.8} color="#f2efe8" position={[-1, 5, 2]} rotation-x={Math.PI / 2} scale={[7, 2.5, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#c8ced0" position={[-5, 2, 1]} rotation-y={Math.PI / 2} scale={[5, 1.5, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ff6a24" position={[5, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[6, 0.6, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ff8b42" position={[0, 1.2, -5]} scale={[8, 0.4, 1]} />
      </Environment>

      <IdleRotator interactingRef={lastInteraction} resetSignal={resetSignal}>
        <SpaceMouseModel motionRef={motionRef} />
      </IdleRotator>

      <ContactShadows position={[0, 0.002, 0]} opacity={0.8} scale={8} blur={2.8} far={2} resolution={512} color="#000000" />

      {showGrid && (
        <Grid
          position={[0, -0.002, 0]}
          args={[20, 20]}
          cellSize={0.25}
          cellThickness={0.5}
          cellColor="#1c1f20"
          sectionSize={1}
          sectionThickness={0.9}
          sectionColor="#2e3333"
          fadeDistance={13}
          fadeStrength={1.5}
          infiniteGrid
          followCamera={false}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={CAMERA_TARGET}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.06}
        onStart={() => {
          lastInteraction.current = Number.POSITIVE_INFINITY
        }}
        onEnd={() => {
          lastInteraction.current = performance.now()
        }}
      />

      {showAxes && (
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport
            axisColors={['#FF6A24', '#D9D8D2', '#7E8582']}
            labelColor="#0B0D0E"
            axisHeadScale={0.8}
            hideNegativeAxes
          />
        </GizmoHelper>
      )}
    </>
  )
}

export default function DeviceScene(props: DeviceSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: CAMERA_POSITION, fov: 32, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="Interactive 3D preview of the SpaceMouse demo model"
    >
      <SceneContents {...props} />
    </Canvas>
  )
}
