import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Write a Heartfelt Letter to Someone You Love (Even If You\'re Not a Writer) | Behind Memory',
  description: 'Discover how to write authentic, meaningful letters to your loved ones, even if you\'re not a writer. Learn practical tips and find inspiration to express your feelings.',
  keywords: 'heartfelt letter, love letter, writing tips, express feelings, emotional writing, letter to loved one, personal letter, writing inspiration',
  
  openGraph: {
    title: 'How to Write a Heartfelt Letter to Someone You Love (Even If You\'re Not a Writer)',
    description: 'Discover how to write authentic, meaningful letters to your loved ones, even if you\'re not a writer. Learn practical tips and find inspiration to express your feelings.',
    type: 'article',
    publishedTime: '2023-03-12T00:00:00Z',
    authors: ['Behind Memory Team'],
    tags: ['letter writing', 'love letter', 'heartfelt writing', 'emotional expression'],
    images: [
      {
        url: 'https://behindmemo.com/images/blog/write-heartfelt-letter.jpg', // 替换为实际图片URL
        width: 1200,
        height: 630,
        alt: 'Writing a heartfelt letter',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'How to Write a Heartfelt Letter to Someone You Love',
    description: 'Discover how to write authentic, meaningful letters to your loved ones, even if you\'re not a writer.',
    images: ['https://behindmemo.com/images/blog/write-heartfelt-letter.jpg'], // 替换为实际图片URL
  },
  
  alternates: {
    canonical: 'https://behindmemo.com/blog/how-to-write-heartfelt-letter-even-not-writer',
  },
  
  // 结构化数据，帮助搜索引擎理解内容
  other: {
    'articleSection': 'Writing Guides',
    'wordCount': '1500',
  }
}; 