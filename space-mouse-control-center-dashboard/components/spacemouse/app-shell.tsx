'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { BottomStatusStrip } from './bottom-status-strip'
import { CommandPalette } from './command-palette'
import { ConfirmProvider } from './confirm-dialog'
import { ControlCenterProvider, useControlCenter } from './control-center-provider'
import { Sidebar } from './sidebar'
import { ToastRegion } from './toast-region'
import { TopHeader } from './top-header'

function isTextEditing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) return !['range', 'checkbox', 'radio', 'button'].includes(target.type)
  return false
}

function Workspace({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isDashboard = pathname === '/'
  const { undo, redo } = useControlCenter()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        setSearchOpen((open) => !open)
        return
      }
      if (isTextEditing(e.target)) return
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <Sidebar />

      <div className="studio-atmosphere flex min-w-0 flex-1 flex-col lg:h-dvh">
        <TopHeader onOpenSearch={() => setSearchOpen(true)} />

        <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
          {isDashboard ? children : <div className="min-h-0 flex-1 lg:-mr-2 lg:overflow-y-auto lg:pr-2">{children}</div>}
          <BottomStatusStrip />
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <ToastRegion />
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      <ControlCenterProvider>
        <Workspace>{children}</Workspace>
      </ControlCenterProvider>
    </ConfirmProvider>
  )
}
