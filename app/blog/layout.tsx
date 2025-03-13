import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog - Behind Memory',
  description: 'Explore articles about expressing emotions, writing heartfelt letters, and creating meaningful memories with your loved ones.',
  keywords: 'love letters, emotional expression, heartfelt writing, memories, relationships',
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