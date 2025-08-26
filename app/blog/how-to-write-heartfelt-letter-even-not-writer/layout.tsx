import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Write a Heartfelt Letter to Someone You Love (Even If You\'re Not a Writer) - Behind Memory',
  description: 'Learn practical tips for writing meaningful, authentic letters to your loved ones, regardless of your writing skills or experience.',
  openGraph: {
    title: 'How to Write a Heartfelt Letter to Someone You Love (Even If You\'re Not a Writer)',
    description: 'Learn practical tips for writing meaningful, authentic letters to your loved ones, regardless of your writing skills or experience.',
    type: 'article',
    url: 'https://behindmemory.com/blog/how-to-write-heartfelt-letter-even-not-writer',
    images: [
      {
        url: 'https://behindmemory.com/images/blog/heartfelt-letter.jpg',
        width: 1200,
        height: 630,
        alt: 'Writing a heartfelt letter',
      },
    ],
    siteName: 'Behind Memory',
    locale: 'en_US',
    authors: ['Behind Memory'],
    publishedTime: '2025-03-12T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Write a Heartfelt Letter (Even If You\'re Not a Writer)',
    description: 'Learn practical tips for writing meaningful, authentic letters to your loved ones, regardless of your writing skills or experience.',
    images: ['https://behindmemory.com/images/blog/heartfelt-letter.jpg'],
    creator: '@behindmemory',
    site: '@behindmemory',
  },
  alternates: {
    canonical: 'https://behindmemory.com/blog/how-to-write-heartfelt-letter-even-not-writer',
    languages: {
      'en': 'https://behindmemory.com/blog/how-to-write-heartfelt-letter-even-not-writer',
      'zh': 'https://behindmemory.com/blog/how-to-write-heartfelt-letter-even-not-writer?lang=zh',
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