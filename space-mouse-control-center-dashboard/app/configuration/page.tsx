import type { Metadata } from 'next'
import { ConfigurationSection } from '@/components/spacemouse/sections/configuration-section'

export const metadata: Metadata = { title: 'Configuration Manager' }

export default function Page() {
  return <ConfigurationSection />
}
