import type { Metadata } from 'next'
import { DiagnosticsSection } from '@/components/spacemouse/sections/diagnostics-section'

export const metadata: Metadata = { title: 'Diagnostics' }

export default function Page() {
  return <DiagnosticsSection />
}
