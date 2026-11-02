'use client'

import { Axis3d, Grid3x3, RotateCcw, type LucideIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import type { TelemetryFrame } from '@/lib/spacemouse/types'

const DeviceScene = dynamic(() => import('./three/device-scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="font-mono text-[11px] tracking-[0.16em] text-ink-muted">
        INITIALISING VIEWPORT…
      </span>
    </div>
  ),
})

interface ToolbarButtonProps {
  label: string
  icon: LucideIcon
  onClick: () => void
  pressed?: boolean
}

function ToolbarButton({ label, icon: Icon, onClick, pressed }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-md outline-none transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-ember/60 active:scale-95',
        pressed === false
          ? 'text-ink-subtle hover:bg-panel-2 hover:text-ink-muted'
          : pressed
            ? 'bg-ember/[0.14] text-ember hover:bg-ember/20'
            : 'text-ink-muted hover:bg-panel-2 hover:text-ink',
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}

export function DeviceVisualizer3D({ motionRef }: { motionRef: RefObject<TelemetryFrame> }) {
  const [showGrid, setShowGrid] = useState(true)
  const [showAxes, setShowAxes] = useState(true)
  const [resetSignal, setResetSignal] = useState(0)

  return (
    <section
      aria-label="3D device preview"
      className="viewport-halo relative h-[460px] overflow-hidden rounded-lg border border-line/70 lg:h-full lg:min-h-[480px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink-muted/25 to-transparent"
      />
      <DeviceScene
        showGrid={showGrid}
        showAxes={showAxes}
        resetSignal={resetSignal}
        motionRef={motionRef}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
        <div className="leading-none">
          <p className="text-[10px] font-semibold tracking-[0.24em] text-ember">3D DEVICE PREVIEW</p>
          <p className="mt-2 text-balance text-[28px] font-bold tracking-[-0.03em] text-ink lg:text-[34px]">
            Precision 6-DOF Controller
          </p>
          <p className="mt-2 text-[11px] text-ink-subtle">Drag to orbit · Scroll to zoom</p>
        </div>
        <div
          role="toolbar"
          aria-label="Viewport controls"
          className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line/80 bg-[#0e1011]/70 p-1 backdrop-blur-md"
        >
          <ToolbarButton label="Reset view" icon={RotateCcw} onClick={() => setResetSignal((n) => n + 1)} />
          <span className="mx-0.5 h-4 w-px bg-line" aria-hidden="true" />
          <ToolbarButton
            label="Toggle grid"
            icon={Grid3x3}
            pressed={showGrid}
            onClick={() => setShowGrid((v) => !v)}
          />
          <ToolbarButton
            label="Toggle axis indicator"
            icon={Axis3d}
            pressed={showAxes}
            onClick={() => setShowAxes((v) => !v)}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-5 flex items-center gap-2 rounded-md border border-line/80 bg-[#0e1011]/70 px-2.5 py-1.5 backdrop-blur-md">
        <span className="size-1.5 rounded-full bg-ember/80" aria-hidden="true" />
        <p className="font-mono text-[10px] tracking-[0.12em] text-ink-muted">
          MODEL STATUS: <span className="text-ink">DEMO MODEL</span>
        </p>
      </div>
    </section>
  )
}
