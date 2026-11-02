'use client'

import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useControlCenter } from './control-center-provider'

const ICONS = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle }
const TONES = { ok: 'text-status-ok', warn: 'text-status-warn', error: 'text-status-error' }

export function ToastRegion() {
  const { toast } = useControlCenter()
  const Icon = toast ? ICONS[toast.tone] : null
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {toast && Icon && (
        <div
          key={toast.id}
          className="flex items-center gap-2.5 rounded-md border border-line bg-panel px-3.5 py-2.5 text-[12px] font-medium text-ink shadow-xl shadow-black/40 animate-in fade-in slide-in-from-bottom-2"
        >
          <Icon className={cn('size-4 shrink-0', TONES[toast.tone])} aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </div>
  )
}
