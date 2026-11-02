'use client'

import { ArrowRight, Cable, Layers, Search, SlidersHorizontal, Unplug, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getModule, MODULES, SETTINGS_INDEX } from '@/lib/spacemouse/modules'
import { cn } from '@/lib/utils'
import { useControlCenter } from './control-center-provider'

interface PaletteItem {
  id: string
  group: 'Modules' | 'Settings' | 'Profiles' | 'Actions'
  label: string
  hint: string
  icon: LucideIcon
  haystack: string
  run: () => void
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden border border-line bg-panel p-0 ring-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search the control center</DialogTitle>
        {open && <PaletteBody onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { profiles, activeProfile, activateProfile, device } = useControlCenter()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listId = useId()
  const connected = device.connection.status === 'connected'

  const items = useMemo<PaletteItem[]>(() => {
    const go = (href: string) => () => router.push(href)
    const modules: PaletteItem[] = MODULES.map((m) => ({
      id: `module:${m.id}`,
      group: 'Modules',
      label: m.label,
      hint: m.status === 'planned' ? `Planned · Stage ${m.stage}` : m.summary,
      icon: m.icon,
      haystack: `${m.label} ${m.summary} ${m.keywords.join(' ')}`,
      run: go(m.href),
    }))
    const settings: PaletteItem[] = SETTINGS_INDEX.map((s) => {
      const mod = getModule(s.module)
      return {
        id: `setting:${s.label}`,
        group: 'Settings',
        label: s.label,
        hint: mod.label,
        icon: SlidersHorizontal,
        haystack: `${s.label} ${s.keywords} ${mod.label}`,
        run: go(mod.href),
      }
    })
    const profileItems: PaletteItem[] = profiles.map((p) => ({
      id: `profile:${p.id}`,
      group: 'Profiles',
      label: `Activate ${p.name}`,
      hint: p.id === activeProfile.id ? 'Active' : p.description || 'Custom profile',
      icon: Layers,
      haystack: `profile ${p.name} ${p.description}`,
      run: () => p.id !== activeProfile.id && activateProfile(p.id),
    }))
    const actions: PaletteItem[] = device.supported
      ? [
          {
            id: 'action:connection',
            group: 'Actions',
            label: connected ? 'Disconnect device' : 'Connect device',
            hint: 'Web Serial',
            icon: connected ? Unplug : Cable,
            haystack: 'connect disconnect device serial usb port',
            run: () => void (connected ? device.disconnect() : device.connect()),
          },
        ]
      : []
    return [...actions, ...modules, ...settings, ...profileItems]
  }, [router, profiles, activeProfile.id, activateProfile, device, connected])

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return items.filter((i) => i.group !== 'Settings')
    return items.filter((i) => {
      const hay = i.haystack.toLowerCase()
      return tokens.every((t) => hay.includes(t))
    })
  }, [items, query])

  const active = Math.min(index, Math.max(0, results.length - 1))

  const select = (item: PaletteItem | undefined) => {
    if (!item) return
    onClose()
    item.run()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      select(results[active])
    }
  }

  let lastGroup = ''

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          aria-label="Search modules, settings, profiles and actions"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIndex(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Search modules, settings, profiles…"
          className="h-12 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-subtle"
        />
        <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-subtle">ESC</kbd>
      </div>

      <ul id={listId} role="listbox" aria-label="Results" className="max-h-[min(420px,60dvh)] overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-8 text-center text-[12px] text-ink-subtle">{`No results for "${query}"`}</li>}
        {results.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null
          lastGroup = item.group
          const Icon = item.icon
          return (
            <li key={item.id} role="presentation">
              {header && <p className="px-3 pt-3 pb-1.5 text-[9.5px] font-semibold tracking-[0.18em] text-ink-subtle">{header.toUpperCase()}</p>}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setIndex(i)}
                onClick={() => select(item)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2',
                  i === active ? 'bg-ember/[0.12] text-ink' : 'text-ink-muted',
                )}
              >
                <Icon className={cn('size-4 shrink-0', i === active ? 'text-ember' : 'text-ink-subtle')} strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{item.label}</span>
                  <span className="block truncate text-[11px] text-ink-subtle">{item.hint}</span>
                </span>
                {i === active && <ArrowRight className="size-3.5 shrink-0 text-ember-glow" aria-hidden="true" />}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
