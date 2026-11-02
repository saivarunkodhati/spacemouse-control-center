'use client'

import type { LucideIcon } from 'lucide-react'
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Panel({
  title,
  meta,
  children,
  className,
  actions,
}: {
  title: string
  meta?: ReactNode
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('surface-panel flex flex-col rounded-lg border border-line/70 p-4', className)}>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 id={id} className="text-[11px] font-bold tracking-[0.2em] text-ink">
          {title}
        </h2>
        {actions ?? (meta && <span className="font-mono text-[10px] text-ink-subtle">{meta}</span>)}
      </div>
      {children}
    </section>
  )
}

export function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-2">
          <Icon className="size-[18px] text-ember" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="leading-none">
          <p className="text-[10px] font-semibold tracking-[0.24em] text-ember">{eyebrow}</p>
          <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
          <p className="mt-2 max-w-xl text-pretty text-[12.5px] leading-relaxed text-ink-muted">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ember text-[#160803] font-bold shadow-[0_0_24px_-8px_rgb(255_106_36/0.6)] hover:bg-ember-soft active:bg-[#e85a17] disabled:bg-ember/25 disabled:text-ink/50 disabled:shadow-none',
  secondary:
    'border border-line bg-[#121515] text-ink-muted font-semibold hover:border-[#454b4b] hover:bg-panel-2 hover:text-ink disabled:hover:border-line disabled:hover:bg-[#121515] disabled:hover:text-ink-muted',
  ghost: 'text-ink-muted font-medium hover:bg-panel-2 hover:text-ink',
  danger:
    'border border-status-error/30 bg-status-error/10 text-status-error font-semibold hover:bg-status-error/20 disabled:hover:bg-status-error/10',
}

export function ActionButton({
  variant = 'secondary',
  icon: Icon,
  children,
  className,
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  icon?: LucideIcon
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex items-center justify-center gap-2 rounded-md text-[11px] tracking-[0.1em] whitespace-nowrap outline-none transition-[background-color,border-color,color,box-shadow] duration-200',
        'focus-visible:ring-2 focus-visible:ring-ember/60 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-9 px-4' : 'h-8 px-3',
        VARIANTS[variant],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function SliderRow({
  label,
  value,
  min,
  max,
  hint,
  unit = '%',
  step = 1,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  hint?: string
  unit?: string
  step?: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[12px] font-medium text-ink">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[12px] font-medium tabular-nums text-ember-glow">
          {value}
          {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value}${unit}`}
        className="precision-range mt-1.5"
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      {hint !== undefined && (
        <div className="flex justify-between font-mono text-[9px] text-ink-subtle">
          <span>
            {min}
            {unit}
          </span>
          <span className="font-sans text-[10px]">{hint}</span>
          <span>
            {max}
            {unit}
          </span>
        </div>
      )}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border outline-none transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-ember/60 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-ember/60 bg-ember/80' : 'border-line bg-[#1a1d1e]',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-3.5 rounded-full bg-ink shadow transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px] bg-ink-muted',
        )}
      />
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md border border-line bg-[#121515] p-0.5">
      {options.map((opt) => {
        const selected = opt.id === value
        return (
          <button
            key={String(opt.id)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              'h-7 flex-1 rounded-[5px] px-2.5 text-[11px] font-medium whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ember/60',
              selected ? 'bg-ember/[0.16] text-ember-glow' : 'text-ink-subtle hover:text-ink-muted',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'ok' | 'warn' | 'error'
}) {
  return (
    <div className="rounded-md border border-line/60 bg-raised/50 p-3">
      <p className="text-[9.5px] font-medium tracking-[0.16em] text-ink-subtle">{label}</p>
      <p
        className={cn(
          'mt-1.5 font-mono text-[17px] leading-none font-medium tabular-nums',
          tone === 'ok' && 'text-status-ok',
          tone === 'warn' && 'text-status-warn',
          tone === 'error' && 'text-status-error',
          tone === 'default' && 'text-ink',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 truncate text-[10px] text-ink-subtle">{sub}</p>}
    </div>
  )
}

export function SourceBadge({ source }: { source: 'simulated' | 'device' }) {
  const live = source === 'device'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[9.5px] font-semibold tracking-[0.12em]',
        live ? 'border-status-ok/25 bg-status-ok/10 text-status-ok' : 'border-status-warn/20 bg-[#2a1d12]/70 text-status-warn',
      )}
    >
      <span className={cn('size-1.5 rounded-full', live ? 'bg-status-ok' : 'bg-status-warn')} aria-hidden="true" />
      {live ? 'LIVE DEVICE' : 'SIMULATED'}
    </span>
  )
}
