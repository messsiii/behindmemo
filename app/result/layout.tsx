import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Love Letter - Behind Memory',
  description: 'View your personalized love letter',
}

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children
}
