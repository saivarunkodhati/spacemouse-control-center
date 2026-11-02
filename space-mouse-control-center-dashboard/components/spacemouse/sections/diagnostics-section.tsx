'use client'

import { Activity, Eraser, Pause, Play, Send, Stethoscope } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { AXES, AXIS_COLORS, AXIS_IDS, HARDWARE } from '@/lib/spacemouse/constants'
import { mean, stdDev } from '@/lib/spacemouse/processing'
import { PROTOCOL_EXAMPLES } from '@/lib/spacemouse/protocol'
import type { AxisId, LogLevel } from '@/lib/spacemouse/types'
import { HISTORY_LENGTH, type TelemetryHistory } from '@/lib/spacemouse/use-telemetry'
import { useControlCenter } from '../control-center-provider'
import { ActionButton, Panel, SectionHeader, Segmented, SourceBadge, StatTile } from '../ui-kit'

type Stream = 'frame' | 'raw'

function SignalChart({ historyRef, stream, visible, paused }: { historyRef: React.RefObject<TelemetryHistory>; stream: Stream; visible: Set<AxisId>; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const draw = () => {
      const { width: w, height: h } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = '#202425'
      ctx.lineWidth = 1
      for (let i = 1; i < 4; i++) {
        const y = Math.round((h * i) / 4) + 0.5
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      for (let i = 1; i < 12; i++) {
        const x = Math.round((w * i) / 12) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      ctx.strokeStyle = '#3a4040'
      ctx.beginPath()
      ctx.moveTo(0, Math.round(h / 2) + 0.5)
      ctx.lineTo(w, Math.round(h / 2) + 0.5)
      ctx.stroke()

      const data = historyRef.current[stream]
      const step = w / (HISTORY_LENGTH - 1)
      const offset = HISTORY_LENGTH - data.length
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      for (const axis of AXES) {
        if (!visible.has(axis.id)) continue
        const range = stream === 'raw' ? 1.1 : axis.range
        ctx.strokeStyle = AXIS_COLORS[axis.id]
        ctx.beginPath()
        data.forEach((frame, i) => {
          const v = Math.max(-1, Math.min(1, frame[axis.id] / range))
          const x = (i + offset) * step
          const y = h / 2 - v * (h / 2 - 6)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }
      if (!paused) raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [historyRef, stream, visible, paused])

  return <canvas ref={canvasRef} className="h-56 w-full rounded-md border border-line/60 bg-canvas/70 md:h-64" role="img" aria-label="Rolling signal plot of all six axes" />
}

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: 'text-ink-muted',
  tx: 'text-ember-glow',
  rx: 'text-status-ok',
  warn: 'text-status-warn',
  error: 'text-status-error',
}

function SerialConsole() {
  const { device } = useControlCenter()
  const { log, clearLog, sendLines, connection } = device
  const [command, setCommand] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const connected = connection.status === 'connected'

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = command.trim()
    if (!text) return
    void sendLines([text])
    setCommand('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
  }

  return (
    <Panel
      title="SERIAL CONSOLE"
      actions={
        <ActionButton size="sm" variant="ghost" icon={Eraser} onClick={clearLog} disabled={log.length === 0}>
          CLEAR
        </ActionButton>
      }
    >
      <div ref={scrollRef} className="mt-3 h-56 overflow-y-auto rounded-md border border-line/60 bg-canvas/70 p-3 font-mono text-[11px] leading-relaxed" role="log" aria-live="polite">
        {log.length === 0 ? (
          <p className="text-ink-subtle">No events yet. Connect a device to see link activity and firmware messages.</p>
        ) : (
          log.map((entry) => (
            <p key={entry.id} className="flex gap-3">
              <span className="shrink-0 text-ink-subtle tabular-nums">{new Date(entry.time).toLocaleTimeString([], { hour12: false })}</span>
              <span className={cn('w-10 shrink-0 uppercase', LEVEL_STYLE[entry.level])}>{entry.level}</span>
              <span className="min-w-0 break-all text-ink">{entry.message}</span>
            </p>
          ))
        )}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label htmlFor="serial-command" className="sr-only">
          Command
        </label>
        <input
          id="serial-command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!connected}
          placeholder={connected ? 'Type a command, e.g. PING' : 'Connect a device to send commands'}
          className="h-9 min-w-0 flex-1 rounded-md border border-line bg-[#121515] px-3 font-mono text-[12px] text-ink outline-none placeholder:text-ink-subtle focus-visible:ring-2 focus-visible:ring-ember/60 disabled:opacity-50"
        />
        <ActionButton type="submit" variant="primary" icon={Send} disabled={!connected || !command.trim()}>
          SEND
        </ActionButton>
      </form>
    </Panel>
  )
}

interface CheckResult {
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

function SelfTest() {
  const { telemetry, device, calibration } = useControlCenter()
  const [results, setResults] = useState<CheckResult[] | null>(null)
  const [running, setRunning] = useState(false)

  const run = () => {
    setRunning(true)
    setResults(null)
    window.setTimeout(() => {
      const h = telemetry.historyRef.current
      const recent = h.raw.slice(-60)
      const rate = telemetry.snapshot.rate
      const stats = device.statsRef.current
      const live = device.connection.status === 'connected'
      const sinceFrame = performance.now() - device.lastFrameAtRef.current
      const ranges = AXIS_IDS.map((id) => {
        const values = recent.map((f) => f[id])
        return Math.max(...values) - Math.min(...values)
      })
      const intervals = h.intervals.slice(-60)
      const jitter = stdDev(intervals)
      const errorRate = stats.packets > 0 ? stats.parseErrors / (stats.packets + stats.parseErrors) : 0

      const checks: CheckResult[] = [
        live
          ? { label: 'Serial link', status: 'pass', detail: device.connection.message ?? 'Connected' }
          : { label: 'Serial link', status: 'warn', detail: 'No device — running on simulator' },
        live
          ? sinceFrame < 1000
            ? { label: 'Data stream', status: 'pass', detail: `${rate.toFixed(0)} Hz input` }
            : { label: 'Data stream', status: 'fail', detail: 'No frames received in the last second' }
          : { label: 'Data stream', status: 'pass', detail: `Simulator at ${rate.toFixed(0)} Hz` },
        errorRate < 0.02
          ? { label: 'Packet integrity', status: 'pass', detail: `${(errorRate * 100).toFixed(2)}% parse errors` }
          : { label: 'Packet integrity', status: errorRate < 0.1 ? 'warn' : 'fail', detail: `${(errorRate * 100).toFixed(1)}% parse errors — check baud rate` },
        ranges.every((r) => r < 2.05)
          ? { label: 'Sensor range', status: 'pass', detail: 'All axes within expected limits' }
          : { label: 'Sensor range', status: 'warn', detail: 'Readings exceed ±1 — check firmware scaling' },
        jitter < 8
          ? { label: 'Timing jitter', status: 'pass', detail: `σ ${jitter.toFixed(2)} ms` }
          : { label: 'Timing jitter', status: 'warn', detail: `σ ${jitter.toFixed(2)} ms — host is busy` },
        calibration.calibratedAt
          ? { label: 'Calibration', status: 'pass', detail: `Captured ${new Date(calibration.calibratedAt).toLocaleDateString()}` }
          : { label: 'Calibration', status: 'warn', detail: 'Using factory defaults' },
      ]
      setResults(checks)
      setRunning(false)
    }, 900)
  }

  const STATUS: Record<CheckResult['status'], string> = {
    pass: 'border-status-ok/30 bg-status-ok/10 text-status-ok',
    warn: 'border-status-warn/30 bg-status-warn/10 text-status-warn',
    fail: 'border-status-error/30 bg-status-error/10 text-status-error',
  }

  return (
    <Panel
      title="SELF TEST"
      actions={
        <ActionButton size="sm" variant="primary" icon={Stethoscope} onClick={run} disabled={running}>
          {running ? 'RUNNING…' : 'RUN TEST'}
        </ActionButton>
      }
    >
      {results ? (
        <ul className="mt-3 flex flex-col divide-y divide-line/50" aria-live="polite">
          {results.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-ink">{r.label}</p>
                <p className="truncate text-[10.5px] text-ink-subtle">{r.detail}</p>
              </div>
              <span className={cn('shrink-0 rounded-sm border px-2 py-0.5 text-[9.5px] font-bold tracking-[0.14em]', STATUS[r.status])}>{r.status.toUpperCase()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
          {running ? 'Sampling link, stream and sensor health…' : 'Checks the serial link, data stream, packet integrity, sensor range, timing jitter and calibration state.'}
        </p>
      )}
    </Panel>
  )
}

function NoiseTable() {
  const { telemetry } = useControlCenter()
  const recent = telemetry.historyRef.current.raw.slice(-40)
  return (
    <Panel title="AXIS STATISTICS" meta="LAST 2 S">
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[360px] text-[12px]">
          <thead>
            <tr className="border-b border-line text-left text-[9.5px] tracking-[0.16em] text-ink-subtle">
              <th scope="col" className="py-2 pr-3 font-medium">AXIS</th>
              <th scope="col" className="py-2 pr-3 font-medium">RAW</th>
              <th scope="col" className="py-2 pr-3 font-medium">MEAN</th>
              <th scope="col" className="py-2 pr-3 font-medium">σ</th>
              <th scope="col" className="py-2 font-medium">OUTPUT</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {AXES.map((axis) => {
              const values = recent.map((f) => f[axis.id])
              return (
                <tr key={axis.id} className="border-b border-line/50 last:border-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-semibold" style={{ color: AXIS_COLORS[axis.id] }}>
                    {axis.label}
                  </th>
                  <td className="py-1.5 pr-3 text-ink">{telemetry.snapshot.raw[axis.id].toFixed(3)}</td>
                  <td className="py-1.5 pr-3 text-ink-muted">{mean(values).toFixed(3)}</td>
                  <td className="py-1.5 pr-3 text-ink-muted">{stdDev(values).toFixed(4)}</td>
                  <td className="py-1.5 text-ink-muted">
                    {telemetry.snapshot.frame[axis.id].toFixed(axis.decimals)}
                    {axis.kind === 'rotation' ? '°' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export function DiagnosticsSection() {
  const { telemetry, device } = useControlCenter()
  const [stream, setStream] = useState<Stream>('frame')
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState<Set<AxisId>>(() => new Set(AXIS_IDS))
  const { snapshot } = telemetry
  const stats = device.statsRef.current
  const live = device.connection.status === 'connected'
  const intervals = telemetry.historyRef.current.intervals.slice(-60)

  const toggleAxis = (id: AxisId) =>
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={Activity}
        eyebrow="DIAGNOSTICS"
        title="Signal & Link Health"
        description="Inspect raw and processed sensor signals, link throughput and firmware messages. Use the self test to quickly validate a new build."
        actions={<SourceBadge source={snapshot.source} />}
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="INPUT RATE" value={`${snapshot.rate.toFixed(0)} Hz`} sub={live ? 'Device frames' : 'Simulator'} tone={live && snapshot.rate < 10 ? 'warn' : 'default'} />
        <StatTile label="PACKETS" value={live ? stats.packets.toLocaleString() : '—'} sub="Parsed frames" />
        <StatTile label="PARSE ERRORS" value={live ? stats.parseErrors.toLocaleString() : '—'} sub="Rejected lines" tone={stats.parseErrors > 0 && live ? 'warn' : 'default'} />
        <StatTile label="RECEIVED" value={live ? formatBytes(stats.bytes) : '—'} sub="Bytes over serial" />
        <StatTile label="UPTIME" value={live && stats.connectedAt ? formatDuration(Date.now() - stats.connectedAt) : '—'} sub="Link session" />
        <StatTile label="UI JITTER" value={`${stdDev(intervals).toFixed(1)} ms`} sub={`Mean ${mean(intervals).toFixed(1)} ms`} />
      </div>

      <Panel
        title="SIGNAL MONITOR"
        actions={
          <div className="flex items-center gap-2">
            <div className="w-44">
              <Segmented
                label="Signal stream"
                value={stream}
                options={[
                  { id: 'frame', label: 'Processed' },
                  { id: 'raw', label: 'Raw' },
                ]}
                onChange={setStream}
              />
            </div>
            <ActionButton size="sm" icon={paused ? Play : Pause} onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
              {paused ? 'RESUME' : 'PAUSE'}
            </ActionButton>
          </div>
        }
      >
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Visible axes">
          {AXES.map((axis) => {
            const on = visible.has(axis.id)
            return (
              <button
                key={axis.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAxis(axis.id)}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-sm border px-2.5 font-mono text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ember/60',
                  on ? 'border-line bg-panel-2 text-ink' : 'border-line/50 text-ink-subtle',
                )}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: on ? AXIS_COLORS[axis.id] : '#3a4040' }} aria-hidden="true" />
                {axis.label}
              </button>
            )
          })}
        </div>
        <div className="mt-3">
          <SignalChart historyRef={telemetry.historyRef} stream={stream} visible={visible} paused={paused} />
        </div>
        <p className="mt-2 text-[10px] text-ink-subtle">
          {stream === 'raw' ? 'Raw normalised sensor input before calibration and processing.' : 'Output after calibration, dead zone, curve, sensitivity and smoothing.'} Window: 12 s.
        </p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <NoiseTable />
        <SelfTest />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SerialConsole />
        <Panel title="PROTOCOL REFERENCE" meta={`${HARDWARE.controller} · ${HARDWARE.sensor}`}>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
            Firmware should print one frame per line in X Y Z Rx Ry Rz order. Normalised floats or raw int16 readings are both accepted.
          </p>
          <p className="mt-3 text-[9.5px] font-medium tracking-[0.16em] text-ink-subtle">DEVICE → APP</p>
          <pre className="mt-1.5 overflow-x-auto rounded-md border border-line/60 bg-canvas/70 p-2.5 font-mono text-[10.5px] leading-relaxed text-status-ok">
            {PROTOCOL_EXAMPLES.inbound.join('\n')}
          </pre>
          <p className="mt-3 text-[9.5px] font-medium tracking-[0.16em] text-ink-subtle">APP → DEVICE</p>
          <pre className="mt-1.5 overflow-x-auto rounded-md border border-line/60 bg-canvas/70 p-2.5 font-mono text-[10.5px] leading-relaxed text-ember-glow">
            {PROTOCOL_EXAMPLES.outbound.join('\n')}
          </pre>
        </Panel>
      </div>
    </div>
  )
}
