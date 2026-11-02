'use client'

import { Cable, RotateCcw, Save, SlidersHorizontal, Unplug, Upload } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  AXES,
  BAUD_RATES,
  CONNECTION_LABELS,
  CURVE_OPTIONS,
  DEFAULT_SETTINGS,
  POLLING_RATES,
} from '@/lib/spacemouse/constants'
import { applyCurve, sensitivityGain } from '@/lib/spacemouse/processing'
import { buildSettingsCommands } from '@/lib/spacemouse/protocol'
import type { AxisId, AxisSettings, DeviceSettings } from '@/lib/spacemouse/types'
import { useControlCenter } from '../control-center-provider'
import { STATUS_DOT } from '../device-status'
import { ActionButton, Panel, SectionHeader, Segmented, SliderRow, Switch } from '../ui-kit'

function CurvePreview({ settings }: { settings: DeviceSettings }) {
  const path = useMemo(() => {
    const dz = settings.deadZone / 100
    const gain = sensitivityGain(settings.sensitivity)
    const pts: string[] = []
    for (let i = 0; i <= 48; i++) {
      const x = i / 48
      const shaped = x < dz ? 0 : (x - dz) / (1 - dz)
      const y = Math.min(1, applyCurve(shaped, settings.curve) * gain)
      pts.push(`${(x * 100).toFixed(2)},${(100 - y * 100).toFixed(2)}`)
    }
    return `M${pts.join(' L')}`
  }, [settings.deadZone, settings.sensitivity, settings.curve])

  return (
    <figure className="rounded-md border border-line/60 bg-canvas/60 p-3">
      <svg viewBox="-2 -2 104 104" className="aspect-square w-full" role="img" aria-label="Response curve: input versus output">
        {[25, 50, 75].map((v) => (
          <g key={v} stroke="#202425" strokeWidth="0.5">
            <line x1={v} y1="0" x2={v} y2="100" />
            <line x1="0" y1={v} x2="100" y2={v} />
          </g>
        ))}
        <line x1="0" y1="100" x2="100" y2="0" stroke="#303535" strokeWidth="0.6" strokeDasharray="2 2" />
        <rect x="0" y="0" width="100" height="100" fill="none" stroke="#303535" strokeWidth="0.6" />
        <rect x="0" y="0" width={settings.deadZone} height="100" fill="rgb(240 164 93 / 0.08)" />
        <path d={path} fill="none" stroke="#ff6a24" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <figcaption className="mt-2 flex justify-between font-mono text-[9px] text-ink-subtle">
        <span>INPUT →</span>
        <span>OUTPUT ↑</span>
      </figcaption>
    </figure>
  )
}

function AxisRow({
  axisId,
  label,
  description,
  value,
  live,
  range,
  onChange,
}: {
  axisId: AxisId
  label: string
  description: string
  value: AxisSettings
  live: number
  range: number
  onChange: (value: AxisSettings) => void
}) {
  const ratio = Math.max(-1, Math.min(1, live / range))
  return (
    <tr className="border-b border-line/50 last:border-0">
      <th scope="row" className="py-2.5 pr-3 text-left">
        <span className="font-mono text-[12px] font-semibold text-ember-glow">{label}</span>
        <span className="ml-2 text-[10.5px] font-normal text-ink-subtle">{description}</span>
      </th>
      <td className="py-2.5 pr-3">
        <Switch label={`Enable ${description}`} checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} />
      </td>
      <td className="py-2.5 pr-3">
        <Switch
          label={`Invert ${description}`}
          checked={value.inverted}
          disabled={!value.enabled}
          onChange={(inverted) => onChange({ ...value, inverted })}
        />
      </td>
      <td className="w-[38%] py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={value.scale}
            disabled={!value.enabled}
            onChange={(e) => onChange({ ...value, scale: Number(e.target.value) })}
            aria-label={`${description} scale`}
            className="precision-range"
            style={{ ['--fill' as string]: `${value.scale / 2}%` }}
          />
          <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink-muted">{value.scale}%</span>
        </div>
      </td>
      <td className="w-24 py-2.5">
        <div className="relative h-1 overflow-hidden rounded-full bg-[#2a2e2f]" aria-hidden="true">
          <div
            className="absolute top-0 bottom-0 bg-ember"
            style={{ left: ratio >= 0 ? '50%' : `${50 + ratio * 50}%`, width: `${Math.abs(ratio) * 50}%` }}
          />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-ink-muted/70" />
        </div>
        <span className="sr-only">{`${axisId} output ${live.toFixed(2)}`}</span>
      </td>
    </tr>
  )
}

export function DeviceSettingsSection() {
  const { settings, setSettings, isDirty, saveSettingsToProfile, revertSettings, activeProfile, device, telemetry, notify } =
    useControlCenter()
  const { connection, baudRate, setBaudRate, connect, disconnect, supported } = device
  const connected = connection.status === 'connected'
  const update = (patch: Partial<DeviceSettings>) => setSettings({ ...settings, ...patch })

  const writeToDevice = async () => {
    const ok = await device.sendLines(buildSettingsCommands(settings))
    notify(ok ? 'Settings written to device' : 'Device write failed', ok ? 'ok' : 'error')
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={SlidersHorizontal}
        eyebrow="DEVICE SETTINGS"
        title="Response & Mapping"
        description={`Editing the working copy of "${activeProfile.name}". Save to keep changes in the profile, or write them to the device firmware.`}
        actions={
          <>
            {isDirty && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-status-warn">
                <span className="size-1.5 rounded-full bg-status-warn" aria-hidden="true" />
                UNSAVED
              </span>
            )}
            <ActionButton icon={RotateCcw} onClick={revertSettings} disabled={!isDirty}>
              REVERT
            </ActionButton>
            <ActionButton icon={Upload} onClick={writeToDevice} disabled={!connected} title={connected ? undefined : 'Requires a connected device'}>
              WRITE TO DEVICE
            </ActionButton>
            <ActionButton variant="primary" icon={Save} onClick={saveSettingsToProfile} disabled={!isDirty}>
              SAVE TO PROFILE
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="RESPONSE" meta="GLOBAL">
            <div className="mt-3 grid gap-5 md:grid-cols-[1fr_200px]">
              <div className="flex flex-col gap-3">
                <SliderRow label="Sensitivity" value={settings.sensitivity} min={1} max={100} hint="Response gain" onChange={(v) => update({ sensitivity: v })} />
                <SliderRow label="Dead Zone" value={settings.deadZone} min={0} max={20} hint="Ignored input" onChange={(v) => update({ deadZone: v })} />
                <SliderRow label="Smoothing" value={settings.smoothing} min={0} max={100} hint="Signal filtering" onChange={(v) => update({ smoothing: v })} />
                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-ink">Response Curve</p>
                  <Segmented
                    label="Response curve"
                    value={settings.curve}
                    options={CURVE_OPTIONS.map((c) => ({ id: c.id, label: c.label }))}
                    onChange={(curve) => update({ curve })}
                  />
                  <p className="mt-1.5 text-[10.5px] text-ink-subtle">{CURVE_OPTIONS.find((c) => c.id === settings.curve)?.hint}</p>
                </div>
              </div>
              <CurvePreview settings={settings} />
            </div>
          </Panel>

          <Panel title="AXIS MAPPING" meta="PER AXIS">
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-[12px]">
                <thead>
                  <tr className="border-b border-line text-left text-[9.5px] tracking-[0.16em] text-ink-subtle">
                    <th scope="col" className="py-2 pr-3 font-medium">AXIS</th>
                    <th scope="col" className="py-2 pr-3 font-medium">ENABLED</th>
                    <th scope="col" className="py-2 pr-3 font-medium">INVERT</th>
                    <th scope="col" className="py-2 pr-3 font-medium">SCALE</th>
                    <th scope="col" className="py-2 font-medium">OUTPUT</th>
                  </tr>
                </thead>
                <tbody>
                  {AXES.map((axis) => (
                    <AxisRow
                      key={axis.id}
                      axisId={axis.id}
                      label={axis.label}
                      description={axis.description}
                      range={axis.range}
                      value={settings.axes[axis.id]}
                      live={telemetry.snapshot.frame[axis.id]}
                      onChange={(value) => update({ axes: { ...settings.axes, [axis.id]: value } })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              <ActionButton size="sm" variant="ghost" onClick={() => update({ axes: DEFAULT_SETTINGS.axes })}>
                RESET MAPPING
              </ActionButton>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="DEVICE LINK" meta="WEB SERIAL">
            <div className="mt-3 flex items-center justify-between rounded-md border border-line bg-canvas/60 px-3 py-2.5">
              <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <span className={cn('size-2 rounded-full', STATUS_DOT[connection.status])} aria-hidden="true" />
                {CONNECTION_LABELS[connection.status]}
              </span>
              <span className="truncate font-mono text-[10.5px] text-ink-subtle">{connection.message ?? '—'}</span>
            </div>
            <label className="mt-4 block text-[12px] font-medium text-ink" htmlFor="baud-rate">
              Baud Rate
            </label>
            <select
              id="baud-rate"
              value={baudRate}
              disabled={connected}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              className="mt-1.5 h-9 w-full rounded-md border border-line bg-[#121515] px-3 font-mono text-[12px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ember/60 disabled:opacity-50"
            >
              {BAUD_RATES.map((b) => (
                <option key={b} value={b}>
                  {b.toLocaleString()} bps
                </option>
              ))}
            </select>
            <div className="mt-4">
              {connected ? (
                <ActionButton className="w-full" icon={Unplug} onClick={disconnect}>
                  DISCONNECT
                </ActionButton>
              ) : (
                <ActionButton
                  className="w-full"
                  variant="primary"
                  icon={Cable}
                  onClick={connect}
                  disabled={!supported || connection.status === 'connecting'}
                >
                  {connection.status === 'connecting' ? 'CONNECTING…' : 'CONNECT DEVICE'}
                </ActionButton>
              )}
            </div>
            {!supported && (
              <p className="mt-3 text-[10.5px] leading-relaxed text-status-warn">
                This browser does not support Web Serial. Use desktop Chrome, Edge or Opera to connect hardware.
              </p>
            )}
            {connection.status === 'error' && connection.message && (
              <p className="mt-3 text-[10.5px] leading-relaxed text-status-error">{connection.message}</p>
            )}
          </Panel>

          <Panel title="BEHAVIOUR">
            <div className="mt-3 flex flex-col gap-4">
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-ink">Polling Rate</p>
                <Segmented
                  label="Polling rate"
                  value={settings.pollingRate}
                  options={POLLING_RATES.map((r) => ({ id: r, label: `${r} Hz` }))}
                  onChange={(pollingRate) => update({ pollingRate })}
                />
                <p className="mt-1.5 text-[10.5px] text-ink-subtle">Report rate requested from firmware.</p>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-medium text-ink">Dominant Axis Mode</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-ink-subtle">Only the strongest axis is output, preventing accidental cross-axis drift.</p>
                </div>
                <Switch label="Dominant axis mode" checked={settings.dominantAxis} onChange={(dominantAxis) => update({ dominantAxis })} />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
