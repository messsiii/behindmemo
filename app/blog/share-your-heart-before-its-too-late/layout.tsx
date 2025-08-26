import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Share Your Heart Before It\'s Too Late - Behind Memory',
  description: 'Life is unpredictable. Learn why expressing your feelings to loved ones matters and how to do it authentically before it\'s too late.',
  openGraph: {
    title: 'Share Your Heart Before It\'s Too Late - Behind Memory',
    description: 'Life is unpredictable. Learn why expressing your feelings to loved ones matters and how to do it authentically before it\'s too late.',
    type: 'article',
    url: 'https://behindmemory.com/blog/share-your-heart-before-its-too-late',
    images: [
      {
        url: 'https://behindmemory.com/images/blog/share-heart.jpg',
        width: 1200,
        height: 630,
        alt: 'Share Your Heart Before It\'s Too Late',
      },
    ],
    siteName: 'Behind Memory',
    locale: 'en_US',
    authors: ['Behind Memory'],
    publishedTime: '2025-02-14T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Share Your Heart Before It\'s Too Late - Behind Memory',
    description: 'Life is unpredictable. Learn why expressing your feelings to loved ones matters and how to do it authentically before it\'s too late.',
    images: ['https://behindmemory.com/images/blog/share-heart.jpg'],
    creator: '@behindmemory',
    site: '@behindmemory',
  },
  alternates: {
    canonical: 'https://behindmemory.com/blog/share-your-heart-before-its-too-late',
    languages: {
      'en': 'https://behindmemory.com/blog/share-your-heart-before-its-too-late',
      'zh': 'https://behindmemory.com/blog/share-your-heart-before-its-too-late?lang=zh',
    },
  },
}

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 