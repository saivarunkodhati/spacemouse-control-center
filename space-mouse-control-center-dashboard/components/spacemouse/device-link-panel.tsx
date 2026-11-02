'use client'

import { Cable, Unplug } from 'lucide-react'
import { BAUD_RATES, CONNECTION_LABELS } from '@/lib/spacemouse/constants'
import { cn } from '@/lib/utils'
import { useControlCenter } from './control-center-provider'
import { STATUS_DOT } from './device-status'
import { ActionButton, Panel } from './ui-kit'

export function DeviceLinkPanel() {
  const { device } = useControlCenter()
  const { connection, baudRate, setBaudRate, connect, disconnect, supported } = device
  const connected = connection.status === 'connected'

  return (
    <Panel title="DEVICE LINK" meta="WEB SERIAL">
      <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-line bg-canvas/60 px-3 py-2.5">
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
      <p className="mt-1.5 text-[10.5px] text-ink-subtle">Must match <span className="font-mono">Serial.begin()</span> in the firmware. Locked while connected.</p>
      <div className="mt-4">
        {connected ? (
          <ActionButton className="w-full" icon={Unplug} onClick={disconnect}>
            DISCONNECT
          </ActionButton>
        ) : (
          <ActionButton className="w-full" variant="primary" icon={Cable} onClick={connect} disabled={!supported || connection.status === 'connecting'}>
            {connection.status === 'connecting' ? 'CONNECTING…' : 'CONNECT DEVICE'}
          </ActionButton>
        )}
      </div>
      {!supported && (
        <p className="mt-3 text-[10.5px] leading-relaxed text-status-warn">
          This browser does not support Web Serial. Use desktop Chrome, Edge or Opera to connect hardware.
        </p>
      )}
      {connection.status === 'error' && connection.message && <p className="mt-3 text-[10.5px] leading-relaxed text-status-error">{connection.message}</p>}
    </Panel>
  )
}
