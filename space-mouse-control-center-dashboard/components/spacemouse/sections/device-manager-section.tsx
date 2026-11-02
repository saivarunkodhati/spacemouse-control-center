'use client'

import { Usb } from 'lucide-react'
import Link from 'next/link'
import { HARDWARE } from '@/lib/spacemouse/constants'
import { cn } from '@/lib/utils'
import { useControlCenter } from '../control-center-provider'
import { DeviceLinkPanel } from '../device-link-panel'
import { Panel, SectionHeader, SourceBadge, StatTile } from '../ui-kit'

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function formatUptime(since: number | null) {
  if (!since) return '—'
  const s = Math.floor((Date.now() - since) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`
}

function InfoRow({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'muted' | 'warn' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/50 py-2.5 last:border-0">
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="text-right">
        <span className={cn('font-mono text-[12px]', tone === 'muted' ? 'text-ink-subtle' : tone === 'warn' ? 'text-status-warn' : 'text-ink')}>{value}</span>
        {note && <span className="mt-0.5 block text-[10.5px] text-ink-subtle">{note}</span>}
      </dd>
    </div>
  )
}

export function DeviceManagerSection() {
  const { device, telemetry } = useControlCenter()
  const { connection, supported, statsRef, baudRate } = device
  const connected = connection.status === 'connected'
  const stats = statsRef.current
  const errorRate = stats.packets + stats.parseErrors > 0 ? (stats.parseErrors / (stats.packets + stats.parseErrors)) * 100 : 0

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={Usb}
        eyebrow="DEVICE MANAGER"
        title="Hardware & Link"
        description="Connect the SpaceMouse over USB serial and review what the device actually reports. Values the current firmware does not send are marked as not reported."
        actions={<SourceBadge source={telemetry.snapshot.source} />}
      />

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          <DeviceLinkPanel />
          <Panel title="BROWSER">
            <dl className="mt-2">
              <InfoRow label="Web Serial API" value={supported ? 'Supported' : 'Unavailable'} tone={supported ? undefined : 'warn'} />
              <InfoRow label="Transport" value="USB CDC serial" />
            </dl>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="LINK STATISTICS" meta={connected ? 'THIS SESSION' : 'NOT CONNECTED'}>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
              <StatTile label="FRAME RATE" value={connected ? `${telemetry.snapshot.rate.toFixed(0)} Hz` : '—'} tone={connected ? 'ok' : 'default'} />
              <StatTile label="PACKETS" value={connected ? stats.packets.toLocaleString() : '—'} />
              <StatTile label="DATA" value={connected ? formatBytes(stats.bytes) : '—'} />
              <StatTile label="PARSE ERRORS" value={connected ? stats.parseErrors.toLocaleString() : '—'} tone={stats.parseErrors > 0 && connected ? 'warn' : 'default'} />
              <StatTile label="ERROR RATE" value={connected ? `${errorRate.toFixed(1)}%` : '—'} tone={errorRate > 1 && connected ? 'warn' : 'default'} />
              <StatTile label="UPTIME" value={connected ? formatUptime(stats.connectedAt) : '—'} />
            </div>
            <p className="mt-3 text-[10.5px] text-ink-subtle">
              Signal-level analysis, the serial console and the self test are in{' '}
              <Link href="/diagnostics" className="text-ember-glow underline-offset-2 hover:underline">
                Diagnostics
              </Link>
              .
            </p>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="DEVICE IDENTITY">
              <dl className="mt-2">
                <InfoRow label="Port" value={connected ? (connection.message ?? 'Serial port') : 'Not connected'} tone={connected ? undefined : 'muted'} />
                <InfoRow label="Baud rate" value={`${baudRate.toLocaleString()} bps`} />
                <InfoRow label="Controller" value={HARDWARE.controller} note="Configured hardware target" />
                <InfoRow label="Motion sensor" value={HARDWARE.sensor} note="Configured hardware target" />
                <InfoRow label="Firmware version" value="Not reported" tone="muted" note="Requires firmware protocol v2 (Stage 9)" />
                <InfoRow label="Physical buttons" value="Not reported" tone="muted" note="Requires firmware protocol v2 (Stage 9)" />
                <InfoRow label="Sensor health" value="Not reported" tone="muted" note="Requires firmware protocol v2 (Stage 9)" />
              </dl>
            </Panel>

            <Panel title="NATIVE SERVICE">
              <dl className="mt-2">
                <InfoRow label="Status" value="Not installed" tone="muted" />
                <InfoRow label="Planned delivery" value="Stage 8" />
              </dl>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
                A browser cannot inject system-wide input, detect the foreground application or send shortcuts to CAD software. Those features require the
                local Windows service, which will connect here over a paired localhost WebSocket. Until then, the device works inside this control center only.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
