import type { Metadata } from 'next'
import { CalibrationSection } from '@/components/spacemouse/sections/calibration-section'

export const metadata: Metadata = { title: 'Calibration' }

export default function Page() {
  return <CalibrationSection />
}
