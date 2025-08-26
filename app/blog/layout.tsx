import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'Blog - Behind Memory',
  description: 'Explore articles about expressing emotions, writing heartfelt letters, and creating meaningful memories with your loved ones.',
  openGraph: {
    title: 'Blog - Behind Memory',
    description: 'Explore articles about expressing emotions, writing heartfelt letters, and creating meaningful memories with your loved ones.',
    type: 'website',
    url: 'https://behindmemory.com/blog',
  },
  alternates: {
    canonical: 'https://behindmemory.com/blog',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 