import type { Metadata } from 'next'
import { ProfilesSection } from '@/components/spacemouse/sections/profiles-section'

export const metadata: Metadata = { title: 'Application Profiles' }

export default function Page() {
  return <ProfilesSection />
}
