'use client'

import { TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ActionButton } from './ui-kit'

export interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  tone?: 'danger' | 'default'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  const danger = options?.tone !== 'default'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent showCloseButton={false} className="gap-0 border border-line bg-panel p-0 ring-0 sm:max-w-md">
          <div className="flex gap-3 p-5">
            {danger && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-status-error/30 bg-status-error/10">
                <TriangleAlert className="size-4 text-status-error" aria-hidden="true" />
              </span>
            )}
            <div>
              <DialogTitle className="text-[15px] font-semibold text-ink">{options?.title}</DialogTitle>
              <DialogDescription className="mt-1.5 text-pretty text-[12.5px] leading-relaxed text-ink-muted">{options?.description}</DialogDescription>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line p-4">
            <DialogClose className="h-9 rounded-md border border-line bg-panel-2 px-4 text-[12px] font-medium text-ink outline-none transition-colors hover:bg-[#262a2b] focus-visible:ring-2 focus-visible:ring-ember/60">
              Cancel
            </DialogClose>
            <ActionButton variant={danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
              {options?.confirmLabel ?? 'CONFIRM'}
            </ActionButton>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
