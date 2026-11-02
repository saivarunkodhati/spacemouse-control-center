'use client'

import { AxisTelemetry } from '../axis-telemetry'
import { useControlCenter } from '../control-center-provider'
import { DeviceVisualizer3D } from '../device-visualizer-3d'
import { QuickControls } from '../quick-controls'

export function DashboardSection() {
  const { telemetry } = useControlCenter()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <div className="min-h-0 min-w-0 lg:flex-1">
        <DeviceVisualizer3D motionRef={telemetry.frameRef} />
      </div>
      <div className="flex shrink-0 flex-col gap-4 lg:w-[360px] lg:overflow-y-auto xl:w-[380px]">
        <AxisTelemetry snapshot={telemetry.snapshot} />
        <QuickControls />
      </div>
    </div>
  )
}
