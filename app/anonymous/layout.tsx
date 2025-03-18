import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Letter - Behind Memory',
  description: 'View your personalized letter',
}

export default function AnonymousLayout({ children }: { children: React.ReactNode }) {
  return children
} 