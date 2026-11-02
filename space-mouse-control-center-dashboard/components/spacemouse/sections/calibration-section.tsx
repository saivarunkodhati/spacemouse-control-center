'use client'

import { Check, Crosshair, Hand, Move3d, RotateCcw, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AXES, AXIS_IDS, DEFAULT_CALIBRATION } from '@/lib/spacemouse/constants'
import { mean, stdDev } from '@/lib/spacemouse/processing'
import { buildCalibrationCommands } from '@/lib/spacemouse/protocol'
import type { AxisCalibration, AxisId, CalibrationData, TelemetryFrame } from '@/lib/spacemouse/types'
import { useControlCenter } from '../control-center-provider'
import { ActionButton, Panel, SectionHeader, SourceBadge } from '../ui-kit'

type Phase = 'idle' | 'zero' | 'range' | 'review'

const ZERO_CAPTURE_MS = 3000
const RANGE_TARGET = 0.6

const STEPS: { id: Phase; label: string }[] = [
  { id: 'zero', label: 'Zero offset' },
  { id: 'range', label: 'Range sweep' },
  { id: 'review', label: 'Review & apply' },
]

type Bounds = Record<AxisId, { min: number; max: number }>

function emptyBounds(offsets: Record<AxisId, number>): Bounds {
  return Object.fromEntries(AXIS_IDS.map((id) => [id, { min: offsets[id], max: offsets[id] }])) as Bounds
}

function fmt(n: number) {
  return `${n >= 0 ? '+' : '\u2212'}${Math.abs(n).toFixed(3)}`
}

function Stepper({ phase }: { phase: Phase }) {
  const index = STEPS.findIndex((s) => s.id === phase)
  return (
    <ol className="flex items-center gap-2" aria-label="Calibration progress">
      {STEPS.map((step, i) => {
        const done = index > i
        const current = index === i
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]',
                done && 'border-status-ok/40 bg-status-ok/15 text-status-ok',
                current && 'border-ember bg-ember/15 text-ember-glow',
                !done && !current && 'border-line text-ink-subtle',
              )}
              aria-current={current ? 'step' : undefined}
            >
              {done ? <Check className="size-3" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn('text-[11.5px] font-medium', current ? 'text-ink' : 'text-ink-subtle')}>{step.label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

function RangeBar({ offset, min, max }: { offset: number; min: number; max: number }) {
  const neg = Math.min(1, (offset - min) / RANGE_TARGET)
  const pos = Math.min(1, (max - offset) / RANGE_TARGET)
  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-[#2a2e2f]">
      <div
        className={cn('absolute top-0 bottom-0 right-1/2 rounded-l-full', neg >= 1 ? 'bg-status-ok' : 'bg-ember-soft/80')}
        style={{ width: `${neg * 50}%` }}
      />
      <div
        className={cn('absolute top-0 bottom-0 left-1/2 rounded-r-full', pos >= 1 ? 'bg-status-ok' : 'bg-ember')}
        style={{ width: `${pos * 50}%` }}
      />
      <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-ink-muted/70" />
    </div>
  )
}

function CalibrationTable({ data }: { data: CalibrationData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-[12px]">
        <thead>
          <tr className="border-b border-line text-[9.5px] tracking-[0.16em] text-ink-subtle">
            <th scope="col" className="py-2 pr-3 font-medium">AXIS</th>
            <th scope="col" className="py-2 pr-3 font-medium">OFFSET</th>
            <th scope="col" className="py-2 pr-3 font-medium">MIN</th>
            <th scope="col" className="py-2 pr-3 font-medium">MAX</th>
            <th scope="col" className="py-2 font-medium">NOISE (σ)</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {AXES.map((axis) => {
            const c = data.axes[axis.id]
            return (
              <tr key={axis.id} className="border-b border-line/50 last:border-0">
                <th scope="row" className="py-2 pr-3 font-semibold text-ember-glow">
                  {axis.label}
                  <span className="ml-2 font-sans text-[10px] font-normal text-ink-subtle">{axis.description}</span>
                </th>
                <td className="py-2 pr-3 text-ink">{fmt(c.offset)}</td>
                <td className="py-2 pr-3 text-ink-muted">{fmt(c.min)}</td>
                <td className="py-2 pr-3 text-ink-muted">{fmt(c.max)}</td>
                <td className={cn('py-2', c.noise > 0.02 ? 'text-status-warn' : 'text-ink-muted')}>{c.noise.toFixed(4)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function CalibrationSection() {
  const { calibration, setCalibration, telemetry, device, notify } = useControlCenter()
  const { snapshot, simStillRef } = telemetry
  const connected = device.connection.status === 'connected'

  const [phase, setPhase] = useState<Phase>('idle')
  const [zeroStartedAt, setZeroStartedAt] = useState<number | null>(null)
  const [zeroProgress, setZeroProgress] = useState(0)
  const [offsets, setOffsets] = useState<{ offset: Record<AxisId, number>; noise: Record<AxisId, number> } | null>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [draft, setDraft] = useState<CalibrationData | null>(null)
  const samplesRef = useRef<TelemetryFrame[]>([])

  useEffect(() => {
    simStillRef.current = phase === 'zero'
    return () => {
      simStillRef.current = false
    }
  }, [phase, simStillRef])

  useEffect(() => {
    if (phase === 'zero' && zeroStartedAt !== null) {
      samplesRef.current.push(snapshot.raw)
      const progress = Math.min(1, (performance.now() - zeroStartedAt) / ZERO_CAPTURE_MS)
      setZeroProgress(progress)
      if (progress >= 1) {
        const samples = samplesRef.current
        const offset = {} as Record<AxisId, number>
        const noise = {} as Record<AxisId, number>
        for (const id of AXIS_IDS) {
          const values = samples.map((s) => s[id])
          offset[id] = mean(values)
          noise[id] = stdDev(values)
        }
        setOffsets({ offset, noise })
        setBounds(emptyBounds(offset))
        setZeroStartedAt(null)
        setPhase('range')
      }
    } else if (phase === 'range') {
      setBounds((prev) => {
        if (!prev) return prev
        const next = { ...prev }
        for (const id of AXIS_IDS) {
          const v = snapshot.raw[id]
          next[id] = { min: Math.min(prev[id].min, v), max: Math.max(prev[id].max, v) }
        }
        return next
      })
    }
  }, [snapshot, phase, zeroStartedAt])

  const startWizard = () => {
    samplesRef.current = []
    setOffsets(null)
    setBounds(null)
    setDraft(null)
    setZeroProgress(0)
    setZeroStartedAt(null)
    setPhase('zero')
  }

  const beginZeroCapture = () => {
    samplesRef.current = []
    setZeroStartedAt(performance.now())
  }

  const finishRange = () => {
    if (!offsets || !bounds) return
    const axes = {} as Record<AxisId, AxisCalibration>
    for (const id of AXIS_IDS) {
      const o = offsets.offset[id]
      axes[id] = {
        offset: o,
        min: Math.min(bounds[id].min, o - 0.1),
        max: Math.max(bounds[id].max, o + 0.1),
        noise: offsets.noise[id],
      }
    }
    setDraft({ axes, calibratedAt: new Date().toISOString(), source: snapshot.source })
    setPhase('review')
  }

  const apply = async () => {
    if (!draft) return
    setCalibration(draft)
    setPhase('idle')
    if (connected) {
      const ok = await device.sendLines(buildCalibrationCommands(draft))
      notify(ok ? 'Calibration applied and written to device' : 'Applied locally, device write failed', ok ? 'ok' : 'warn')
    } else {
      notify('Calibration applied to the simulated stream')
    }
  }

  const cancel = () => setPhase('idle')

  const writeCurrent = async () => {
    const ok = await device.sendLines(buildCalibrationCommands(calibration))
    notify(ok ? 'Calibration written to device' : 'Device write failed', ok ? 'ok' : 'error')
  }

  const rangeDone = bounds
    ? AXIS_IDS.filter((id) => offsets && offsets.offset[id] - bounds[id].min >= RANGE_TARGET && bounds[id].max - offsets.offset[id] >= RANGE_TARGET).length
    : 0

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={Crosshair}
        eyebrow="CALIBRATION"
        title="Sensor Calibration"
        description="Capture the resting zero offset and full travel of each axis. Calibration is applied before dead zone, curve and sensitivity processing."
        actions={
          phase === 'idle' ? (
            <>
              <ActionButton
                icon={RotateCcw}
                onClick={() => {
                  setCalibration(DEFAULT_CALIBRATION)
                  notify('Calibration reset to factory defaults', 'warn')
                }}
                disabled={calibration.calibratedAt === null}
              >
                RESET
              </ActionButton>
              <ActionButton icon={Upload} onClick={writeCurrent} disabled={!connected} title={connected ? undefined : 'Requires a connected device'}>
                WRITE TO DEVICE
              </ActionButton>
              <ActionButton variant="primary" icon={Crosshair} onClick={startWizard}>
                START CALIBRATION
              </ActionButton>
            </>
          ) : (
            <ActionButton variant="ghost" icon={X} onClick={cancel}>
              CANCEL
            </ActionButton>
          )
        }
      />

      {phase === 'idle' ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Panel title="ACTIVE CALIBRATION" meta={calibration.calibratedAt ? 'CUSTOM' : 'FACTORY DEFAULT'}>
            <p className="mt-1 mb-3 text-[11px] text-ink-subtle">
              {calibration.calibratedAt
                ? `Captured ${new Date(calibration.calibratedAt).toLocaleString()} from ${calibration.source === 'device' ? 'the connected device' : 'the simulated stream'}.`
                : 'No calibration captured yet. Factory defaults assume zero offset and a symmetric ±1 range.'}
            </p>
            <CalibrationTable data={calibration} />
          </Panel>
          <Panel title="BEFORE YOU START">
            <ol className="mt-3 flex flex-col gap-3 text-[12px] text-ink-muted">
              {[
                'Place the SpaceMouse on a flat, stable surface.',
                'Keep hands off the puck during the zero capture.',
                'Sweep every axis to its limit in both directions.',
                'Review the values and apply. Write to device to persist in firmware.',
              ].map((t, i) => (
                <li key={t} className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-sm border border-line font-mono text-[10px]">{i + 1}</span>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center justify-between rounded-md border border-line bg-canvas/60 px-3 py-2">
              <span className="text-[11px] text-ink-subtle">Input source</span>
              <SourceBadge source={snapshot.source} />
            </div>
          </Panel>
        </div>
      ) : (
        <Panel title="CALIBRATION WIZARD" actions={<SourceBadge source={snapshot.source} />}>
          <div className="mt-4">
            <Stepper phase={phase} />
          </div>

          {phase === 'zero' && (
            <div className="mt-6 flex flex-col items-center py-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-full border border-line bg-panel-2">
                <Hand className="size-6 text-ember" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[16px] font-semibold text-ink">Release the puck</h3>
              <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-muted">
                Leave the device untouched. We&apos;ll average {ZERO_CAPTURE_MS / 1000} seconds of samples to find the resting offset and measure sensor noise.
              </p>
              <div className="mt-6 w-full max-w-md">
                <div
                  className="h-2 overflow-hidden rounded-full bg-[#2a2e2f]"
                  role="progressbar"
                  aria-label="Zero capture progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(zeroProgress * 100)}
                >
                  <div className="h-full rounded-full bg-ember transition-[width] duration-100" style={{ width: `${zeroProgress * 100}%` }} />
                </div>
                <p className="mt-2 font-mono text-[11px] text-ink-subtle">
                  {zeroStartedAt ? `CAPTURING… ${Math.round(zeroProgress * 100)}%` : 'READY'}
                </p>
              </div>
              <ActionButton variant="primary" className="mt-5" onClick={beginZeroCapture} disabled={zeroStartedAt !== null}>
                CAPTURE ZERO
              </ActionButton>
            </div>
          )}

          {phase === 'range' && offsets && bounds && (
            <div className="mt-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Move3d className="size-5 text-ember" strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">Sweep every axis</h3>
                    <p className="text-[12px] text-ink-muted">
                      Push, pull, tilt and twist the puck to its limits. Bars turn green once each direction is covered.
                    </p>
                  </div>
                </div>
                <p className="font-mono text-[12px] text-ink-muted" aria-live="polite">
                  {rangeDone}/6 AXES
                </p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {AXES.map((axis) => {
                  const b = bounds[axis.id]
                  const o = offsets.offset[axis.id]
                  return (
                    <div key={axis.id} className="rounded-md border border-line/60 bg-raised/50 p-3">
                      <div className="flex items-baseline justify-between">
                        <p className="font-mono text-[12px] font-semibold text-ember-glow">
                          {axis.label}
                          <span className="ml-2 font-sans text-[10px] font-normal text-ink-subtle">{axis.description}</span>
                        </p>
                        <p className="font-mono text-[10.5px] tabular-nums text-ink-muted">
                          {fmt(b.min)} / {fmt(b.max)}
                        </p>
                      </div>
                      <div className="mt-2.5">
                        <RangeBar offset={o} min={b.min} max={b.max} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <ActionButton onClick={() => setBounds(emptyBounds(offsets.offset))}>RESTART SWEEP</ActionButton>
                <ActionButton variant="primary" onClick={finishRange} disabled={rangeDone === 0}>
                  {rangeDone === 6 ? 'CONTINUE' : 'CONTINUE ANYWAY'}
                </ActionButton>
              </div>
            </div>
          )}

          {phase === 'review' && draft && (
            <div className="mt-6">
              <h3 className="text-[15px] font-semibold text-ink">Review captured values</h3>
              <p className="mt-1 mb-3 text-[12px] text-ink-muted">
                {connected
                  ? 'Applying will also write these values to the device firmware.'
                  : 'Applying updates the simulated stream. Connect a device to persist calibration in firmware.'}
              </p>
              <CalibrationTable data={draft} />
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <ActionButton onClick={startWizard}>RECALIBRATE</ActionButton>
                <ActionButton variant="primary" icon={Check} onClick={apply}>
                  APPLY CALIBRATION
                </ActionButton>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}
