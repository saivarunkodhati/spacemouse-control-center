'use client'

import { Cable, Cpu, Gauge, Radio, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONNECTION_LABELS, DATA_STREAM_LABELS, HARDWARE } from '@/lib/spacemouse/constants'
import { useControlCenter } from './control-center-provider'
import { STATUS_DOT } from './device-status'

interface StatusGroup {
  label: string
  value: string
  icon: LucideIcon
  dot?: string
}

export function BottomStatusStrip() {
  const { device, telemetry } = useControlCenter()
  const status = device.connection.status
  const stream =
    status === 'connected' ? `${DATA_STREAM_LABELS[status]} · ${telemetry.snapshot.rate.toFixed(0)} Hz` : DATA_STREAM_LABELS[status]

  const groups: StatusGroup[] = [
    { label: 'CONTROLLER', value: HARDWARE.controller, icon: Cpu },
    { label: 'MOTION SENSOR', value: HARDWARE.sensor, icon: Gauge },
    { label: 'CONNECTION', value: CONNECTION_LABELS[status], icon: Cable, dot: STATUS_DOT[status] },
    { label: 'DATA STREAM', value: stream, icon: Radio },
  ]

  return (
    <footer aria-label="Device status" className="grid shrink-0 grid-cols-2 rounded-lg border border-line/70 bg-[#121515]/90 md:grid-cols-4">
      {groups.map((g, i) => {
        const Icon = g.icon
        return (
          <div
            key={g.label}
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              i > 0 && 'md:border-l md:border-line',
              i % 2 === 1 && 'border-l border-line',
              i >= 2 && 'border-t border-line md:border-t-0',
            )}
          >
            <Icon className="size-4 shrink-0 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0 leading-none">
              <p className="text-[9.5px] font-medium tracking-[0.16em] text-ink-subtle">{g.label}</p>
              <p className="mt-1.5 flex items-center gap-1.5 truncate text-[12px] font-medium text-ink">
                {g.dot && <span className={cn('size-1.5 rounded-full', g.dot)} aria-hidden="true" />}
                {g.value}
              </p>
            </div>
          </div>
        )
      })}
    </footer>
  )
}
