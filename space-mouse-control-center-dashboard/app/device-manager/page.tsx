import type { Metadata } from 'next'
import { DeviceManagerSection } from '@/components/spacemouse/sections/device-manager-section'

export const metadata: Metadata = { title: 'Device Manager' }

export default function Page() {
  return <DeviceManagerSection />
}
