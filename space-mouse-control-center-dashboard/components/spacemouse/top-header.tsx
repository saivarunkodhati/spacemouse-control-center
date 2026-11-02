'use client'

import { Cable, Check, ChevronDown, CircleCheck, CloudOff, LoaderCircle, Redo2, Search, TriangleAlert, Undo2, Unplug } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { moduleForPath } from '@/lib/spacemouse/modules'
import { cn } from '@/lib/utils'
import { useControlCenter, type PersistenceState } from './control-center-provider'
import { DeviceStatus } from './device-status'

const ICON_BUTTON =
  'flex size-9 items-center justify-center rounded-md border border-line bg-transparent text-ink-muted outline-none transition-colors duration-200 hover:border-ember/50 hover:bg-panel hover:text-ember-glow focus-visible:ring-2 focus-visible:ring-ember/60 active:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-ink-muted'

function SaveIndicator({ persistence }: { persistence: PersistenceState }) {
  const map = {
    loading: { icon: LoaderCircle, label: 'Loading', className: 'text-ink-subtle', spin: true },
    saving: { icon: LoaderCircle, label: 'Saving', className: 'text-ink-muted', spin: true },
    saved: { icon: CircleCheck, label: 'Saved', className: 'text-status-ok', spin: false },
    error: { icon: TriangleAlert, label: 'Save failed', className: 'text-status-error', spin: false },
    unavailable: { icon: CloudOff, label: 'Not persisted', className: 'text-status-warn', spin: false },
  }[persistence.status]
  const Icon = map.icon
  const title =
    persistence.error ?? (persistence.savedAt ? `Last saved ${new Date(persistence.savedAt).toLocaleString()}` : 'Configuration storage')
  return (
    <span role="status" title={title} className={cn('hidden items-center gap-1.5 px-1 text-[10px] font-semibold tracking-[0.12em] xl:flex', map.className)}>
      <Icon className={cn('size-3.5', map.spin && 'animate-spin')} aria-hidden="true" />
      {map.label.toUpperCase()}
    </span>
  )
}

export function TopHeader({ onOpenSearch }: { onOpenSearch: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const current = moduleForPath(pathname)
  const { device, profiles, activeProfile, activateProfile, isDirty, undo, redo, canUndo, canRedo, persistence } = useControlCenter()
  const { connection, connect, disconnect, supported } = device
  const connected = connection.status === 'connected'

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-line/70 bg-[#0e1011]/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="min-w-0 leading-none">
        <p className="text-[10px] font-medium tracking-[0.22em] text-ink-subtle">SPACEMOUSE CONTROL CENTER</p>
        <h1 className="mt-2 truncate text-[19px] font-bold tracking-[-0.02em] text-ink">{current.label}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search (Ctrl+K)"
          className="flex h-9 items-center gap-2 rounded-md border border-line px-2.5 text-[12px] text-ink-subtle outline-none transition-colors hover:border-ember/50 hover:bg-panel hover:text-ink-muted focus-visible:ring-2 focus-visible:ring-ember/60 md:w-52"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden flex-1 text-left md:inline">Search…</span>
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[9.5px] md:inline">Ctrl K</kbd>
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo setting change (Ctrl+Z)" title="Undo (Ctrl+Z)" className={ICON_BUTTON}>
            <Undo2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo setting change (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" className={ICON_BUTTON}>
            <Redo2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <SaveIndicator persistence={persistence} />

        <DeviceStatus status={connection.status} />

        <button
          type="button"
          onClick={connected ? disconnect : connect}
          disabled={!connected && (!supported || connection.status === 'connecting')}
          aria-label={connected ? 'Disconnect device' : 'Connect device'}
          title={supported ? (connected ? 'Disconnect device' : 'Connect device') : 'Web Serial not supported in this browser'}
          className={ICON_BUTTON}
        >
          {connected ? <Unplug className="size-4" strokeWidth={1.75} aria-hidden="true" /> : <Cable className="size-4" strokeWidth={1.75} aria-hidden="true" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Active profile: ${activeProfile.name}`}
            className="flex h-9 items-center gap-2 rounded-md border border-line bg-transparent px-3 text-[12px] font-medium text-ink outline-none transition-colors duration-200 hover:border-ember/50 hover:bg-panel focus-visible:ring-2 focus-visible:ring-ember/60 aria-expanded:border-ember/50 aria-expanded:bg-panel"
          >
            <span className="hidden text-[10px] tracking-[0.16em] text-ink-subtle md:inline">PROFILE</span>
            <span className="max-w-32 truncate">{activeProfile.name}</span>
            {isDirty && <span className="size-1.5 rounded-full bg-status-warn" aria-label="Unsaved changes" />}
            <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-60 border border-line bg-panel p-1 ring-0">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium tracking-[0.16em] text-ink-muted">PROFILES</DropdownMenuLabel>
              {profiles.map((p) => {
                const selected = p.id === activeProfile.id
                return (
                  <DropdownMenuItem key={p.id} onClick={() => !selected && activateProfile(p.id)} className="flex items-start gap-2 rounded px-2 py-2 focus:bg-ember/10">
                    <span className="mt-0.5 flex size-3.5 items-center justify-center">
                      {selected && <Check className="size-3.5 text-ember" aria-hidden="true" />}
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-[12px] font-medium text-ink">{p.name}</span>
                      <span className="mt-0.5 truncate text-[11px] text-ink-muted">{p.description || 'Custom profile'}</span>
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-line" />
            <DropdownMenuItem onClick={() => router.push('/profiles')} className="rounded px-2 py-2 text-[12px] text-ink-muted focus:bg-ember/10">
              Manage profiles…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
