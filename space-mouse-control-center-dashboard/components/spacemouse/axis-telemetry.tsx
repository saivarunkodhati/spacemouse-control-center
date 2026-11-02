import { cn } from '@/lib/utils'
import { AXES } from '@/lib/spacemouse/constants'
import type { AxisDefinition, TelemetrySnapshot } from '@/lib/spacemouse/types'

function formatValue(value: number, axis: AxisDefinition) {
  const fixed = Math.abs(value).toFixed(axis.decimals)
  const sign = Number(fixed) === 0 ? '\u2009' : value > 0 ? '+' : '\u2212'
  return `${sign}${fixed}`
}

function AxisCard({ axis, value }: { axis: AxisDefinition; value: number }) {
  const ratio = Math.max(-1, Math.min(1, value / axis.range))
  const widthPct = Math.abs(ratio) * 50
  const positive = ratio >= 0
  const isRotation = axis.kind === 'rotation'

  return (
    <div className="rounded-md border border-line/60 bg-raised/50 p-2.5">
      <div className="flex items-baseline justify-between gap-2 leading-none">
        <p className="font-mono text-[12px] font-semibold text-ember-glow">{axis.label}</p>
        <p className="min-w-0 truncate text-[9.5px] text-ink-subtle">{axis.description}</p>
      </div>

      <p className="mt-2 font-mono text-[18px] leading-none font-medium tracking-tight tabular-nums text-ink">
        {formatValue(value, axis)}
        <span className="ml-1 text-[11px] text-ink-subtle">{isRotation ? '\u00B0' : ''}</span>
      </p>

      <div className="mt-2">
        <div
          className="relative h-1 overflow-hidden rounded-full bg-[#2a2e2f]"
          role="meter"
          aria-label={`${axis.description} value`}
          aria-valuemin={-axis.range}
          aria-valuemax={axis.range}
          aria-valuenow={Number(value.toFixed(axis.decimals))}
        >
          <div
            className={cn(
              'absolute top-0 bottom-0 rounded-full',
              positive ? 'bg-ember' : 'bg-ember-soft/75',
            )}
            style={{
              left: positive ? '50%' : `${50 - widthPct}%`,
              width: `${widthPct}%`,
            }}
          />
          <div className="absolute top-[-2px] bottom-[-2px] left-1/2 w-px -translate-x-1/2 bg-ink-muted/70" />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-subtle">
          <span>{'\u2212'}{axis.range}</span>
          <span>0</span>
          <span>+{axis.range}</span>
        </div>
      </div>
    </div>
  )
}

export function AxisTelemetry({ snapshot }: { snapshot: TelemetrySnapshot }) {
  const simulated = snapshot.source === 'simulated'
  return (
    <section
      aria-labelledby="telemetry-title"
      className="surface-panel flex flex-col rounded-lg border border-line/70 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="telemetry-title" className="text-[11px] font-bold tracking-[0.2em] text-ink">
          MOTION TELEMETRY
        </h2>
        <span className="font-mono text-[10px] text-ink-subtle">
          {simulated ? '6-AXIS' : `LIVE · ${snapshot.rate.toFixed(0)} HZ`}
        </span>
      </div>
      {simulated && (
        <p className="mt-2.5 flex items-center gap-2 rounded-sm border border-status-warn/20 bg-[#2a1d12]/70 px-2.5 py-1.5 text-[9.5px] font-semibold tracking-[0.1em] text-status-warn">
          <span className="size-1.5 shrink-0 rounded-full bg-status-warn" aria-hidden="true" />
          SIMULATED — HARDWARE NOT CONNECTED
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AXES.map((axis) => (
          <AxisCard key={axis.id} axis={axis} value={snapshot.frame[axis.id]} />
        ))}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-ink-subtle">
        Translation in normalized units (−1 to +1). Rotation in degrees. Processed output after
        calibration and response settings.
      </p>
    </section>
  )
}
