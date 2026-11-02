'use client'

import { Crosshair, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useControlCenter } from './control-center-provider'
import { ActionButton, Panel, SliderRow } from './ui-kit'

export function QuickControls() {
  const router = useRouter()
  const { settings, setSettings, isDirty, revertSettings, activeProfile, calibration } = useControlCenter()

  return (
    <Panel title="QUICK CONTROLS" meta={activeProfile.name.toUpperCase()}>
      <div className="mt-2.5 flex flex-col gap-1.5">
        <SliderRow label="Sensitivity" value={settings.sensitivity} min={1} max={100} hint="Response gain" onChange={(v) => setSettings({ ...settings, sensitivity: v })} />
        <SliderRow label="Dead Zone" value={settings.deadZone} min={0} max={20} hint="Ignored input" onChange={(v) => setSettings({ ...settings, deadZone: v })} />
        <SliderRow label="Smoothing" value={settings.smoothing} min={0} max={100} hint="Signal filtering" onChange={(v) => setSettings({ ...settings, smoothing: v })} />
      </div>

      <p className="mt-2.5 text-[10px] leading-relaxed text-ink-subtle">
        {isDirty ? 'Unsaved changes. Save them in Device Settings.' : `Matches "${activeProfile.name}".`}{' '}
        {calibration.calibratedAt ? 'Calibration active.' : 'Not calibrated.'}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton variant="primary" icon={Crosshair} onClick={() => router.push('/calibration')}>
          CALIBRATE
        </ActionButton>
        <ActionButton icon={RotateCcw} onClick={revertSettings} disabled={!isDirty}>
          REVERT
        </ActionButton>
      </div>
    </Panel>
  )
}
