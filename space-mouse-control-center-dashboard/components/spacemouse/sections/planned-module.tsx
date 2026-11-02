'use client'

import { ArrowRight, Circle } from 'lucide-react'
import Link from 'next/link'
import { getModule, type ModuleId } from '@/lib/spacemouse/modules'
import { Panel, SectionHeader } from '../ui-kit'

export function PlannedModule({ moduleId }: { moduleId: ModuleId }) {
  const mod = getModule(moduleId)

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader icon={mod.icon} eyebrow={`PLANNED · STAGE ${mod.stage}`} title={mod.label} description={mod.summary} />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="PLANNED SCOPE" meta={`${mod.scope.length} ITEMS`}>
          <ul className="mt-3 flex flex-col gap-2.5">
            {mod.scope.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-ink-muted">
                <Circle className="mt-1 size-3 shrink-0 text-ink-subtle" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="STATUS">
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
              {`This module is not built yet. It has no controls, so nothing here pretends to work. It is scheduled for Stage ${mod.stage} of the delivery plan.`}
            </p>
          </Panel>
          {mod.related.length > 0 && (
            <Panel title="RELATED MODULES">
              <ul className="mt-2 flex flex-col">
                {mod.related.map((id) => {
                  const rel = getModule(id)
                  const Icon = rel.icon
                  return (
                    <li key={id}>
                      <Link
                        href={rel.href}
                        className="group flex items-center gap-3 rounded-md px-2 py-2 text-[12.5px] text-ink-muted outline-none transition-colors hover:bg-panel-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-ember/60"
                      >
                        <Icon className="size-4 shrink-0 text-ink-subtle group-hover:text-ember" strokeWidth={1.75} aria-hidden="true" />
                        <span className="flex-1">{rel.label}</span>
                        <span className="font-mono text-[9.5px] text-ink-subtle">{rel.status === 'planned' ? `S${rel.stage}` : 'AVAILABLE'}</span>
                        <ArrowRight className="size-3.5 text-ink-subtle" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
