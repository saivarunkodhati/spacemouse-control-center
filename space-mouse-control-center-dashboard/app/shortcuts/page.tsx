import type { Metadata } from 'next'
import { PlannedModule } from '@/components/spacemouse/sections/planned-module'

export const metadata: Metadata = { title: 'Shortcut Manager' }

export default function Page() {
  return <PlannedModule moduleId="shortcuts" />
}
