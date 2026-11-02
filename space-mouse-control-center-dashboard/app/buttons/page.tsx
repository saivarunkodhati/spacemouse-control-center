import type { Metadata } from 'next'
import { PlannedModule } from '@/components/spacemouse/sections/planned-module'

export const metadata: Metadata = { title: 'Button Configuration' }

export default function Page() {
  return <PlannedModule moduleId="buttons" />
}
