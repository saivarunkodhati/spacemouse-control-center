'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULE_GROUPS, MODULES, moduleForPath } from '@/lib/spacemouse/modules'
import { cn } from '@/lib/utils'

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" fill="#171A1B" stroke="#303535" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="#FF6A24" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2" fill="#F0F0EB" />
      <path d="M16 5v4M16 23v4M5 16h4M23 16h4" stroke="#707673" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const current = moduleForPath(pathname)

  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-line bg-rail lg:w-60" aria-label="Primary">
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line px-4 lg:px-5">
        <BrandMark />
        <div className="hidden leading-none lg:block">
          <p className="text-[13px] font-bold tracking-[0.24em] text-ink">SPACEMOUSE</p>
          <p className="mt-1.5 text-[10px] font-medium tracking-[0.2em] text-ink-subtle">CONTROL CENTER</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3 lg:px-3" aria-label="Modules">
        {MODULE_GROUPS.map((group) => (
          <div key={group} className="mb-2 border-t border-line/50 pt-2 first:border-0 first:pt-0 lg:border-0 lg:pt-0">
            <p className="hidden px-3 pt-2 pb-1.5 text-[9.5px] font-semibold tracking-[0.2em] text-ink-subtle/80 lg:block">{group}</p>
            <ul className="flex flex-col gap-0.5">
              {MODULES.filter((m) => m.group === group).map((item) => {
                const isActive = item.id === current.id
                const Icon = item.icon
                const planned = item.status === 'planned'
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      title={planned ? `${item.label} — planned (Stage ${item.stage})` : item.label}
                      className={cn(
                        'group relative flex h-9 w-full items-center gap-3 rounded-md px-3 text-[12.5px] font-medium transition-colors duration-200',
                        'justify-center outline-none focus-visible:ring-2 focus-visible:ring-ember/60 lg:justify-start',
                        isActive
                          ? 'bg-gradient-to-r from-ember/[0.12] to-ember/[0.02] text-ink'
                          : 'text-ink-subtle hover:bg-panel hover:text-ink-muted active:bg-panel-2',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute top-2 bottom-2 left-0 w-[2px] rounded-full transition-opacity duration-200',
                          isActive ? 'bg-ember opacity-100' : 'opacity-0',
                        )}
                      />
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          'size-4 shrink-0 transition-colors duration-200',
                          isActive ? 'text-ember' : 'text-ink-subtle group-hover:text-ink-muted',
                          planned && !isActive && 'opacity-60',
                        )}
                        strokeWidth={1.75}
                      />
                      <span className={cn('hidden min-w-0 flex-1 truncate lg:inline', planned && !isActive && 'text-ink-subtle/80')}>{item.label}</span>
                      {planned && (
                        <span className="hidden rounded-sm border border-line px-1 py-px font-mono text-[9px] text-ink-subtle lg:inline">
                          S{item.stage}
                          <span className="sr-only"> planned</span>
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line px-4 py-3.5 lg:px-5">
        <div className="flex items-center justify-center gap-2.5 lg:justify-start">
          <span className="relative flex size-2.5 items-center justify-center" aria-hidden="true">
            <span className="absolute size-2.5 rounded-full border border-ink-muted/50" />
            <span className="size-1 rounded-full bg-ink-muted" />
          </span>
          <div className="hidden leading-none lg:block">
            <p className="text-[9.5px] font-medium tracking-[0.12em] whitespace-nowrap text-ink-muted">LOCAL CONTROL INTERFACE</p>
            <p className="mt-1.5 font-mono text-[10px] text-ink-muted/70">v0.2.0 · schema v1</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
