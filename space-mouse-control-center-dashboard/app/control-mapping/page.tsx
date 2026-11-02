import type { Metadata } from 'next'
import { DeviceSettingsSection } from '@/components/spacemouse/sections/device-settings-section'

export const metadata: Metadata = { title: 'Control Mapping' }

export default function Page() {
  return <DeviceSettingsSection />
}
