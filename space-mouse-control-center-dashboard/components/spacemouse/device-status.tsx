import { cn } from '@/lib/utils'
import { CONNECTION_LABELS } from '@/lib/spacemouse/constants'
import type { ConnectionStatus } from '@/lib/spacemouse/types'

export const STATUS_DOT: Record<ConnectionStatus, string> = {
  disconnected: 'bg-status-warn',
  connecting: 'bg-ember animate-pulse',
  connected: 'bg-status-ok',
  error: 'bg-status-error',
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  disconnected: 'text-status-warn',
  connecting: 'text-ember',
  connected: 'text-status-ok',
  error: 'text-status-error',
}

export function DeviceStatus({ status }: { status: ConnectionStatus }) {
  return (
    <div
      role="status"
      aria-label={`Device connection: ${CONNECTION_LABELS[status]}`}
      className="flex h-9 items-center gap-2.5 rounded-md border border-line bg-panel px-3"
    >
      <span className={cn('size-2 rounded-full', STATUS_DOT[status])} aria-hidden="true" />
      <span className="hidden text-[10px] font-medium tracking-[0.16em] text-ink-muted sm:inline">
        DEVICE
      </span>
      <span className={cn('text-[11px] font-semibold tracking-[0.14em]', STATUS_TEXT[status])}>
        {CONNECTION_LABELS[status].toUpperCase()}
      </span>
    </div>
  )
}
