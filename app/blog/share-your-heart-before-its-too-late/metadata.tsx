import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Share Your Heart Before It\'s Too Late: Why Now is the Best Time | Behind Memory',
  description: 'Explore why expressing your feelings to loved ones today matters more than waiting for tomorrow. Learn how to overcome barriers and share your heart in meaningful ways.',
  keywords: 'express feelings, share emotions, emotional connection, heartfelt communication, relationships, meaningful connection, overcoming barriers',
  
  openGraph: {
    title: 'Share Your Heart Before It\'s Too Late: Why Now is the Best Time',
    description: 'Explore why expressing your feelings to loved ones today matters more than waiting for tomorrow. Learn how to overcome barriers and share your heart in meaningful ways.',
    type: 'article',
    publishedTime: '2023-03-10T00:00:00Z',
    authors: ['Behind Memory Team'],
    tags: ['emotional expression', 'relationships', 'communication', 'love', 'life lessons'],
    images: [
      {
        url: 'https://behindmemo.com/images/blog/share-your-heart.jpg', // 替换为实际图片URL
        width: 1200,
        height: 630,
        alt: 'Sharing your heart with loved ones',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Share Your Heart Before It\'s Too Late: Why Now is the Best Time',
    description: 'Explore why expressing your feelings today matters more than waiting for tomorrow.',
    images: ['https://behindmemo.com/images/blog/share-your-heart.jpg'], // 替换为实际图片URL
  },
  
  alternates: {
    canonical: 'https://behindmemo.com/blog/share-your-heart-before-its-too-late',
  },
  
  // 结构化数据，帮助搜索引擎理解内容
  other: {
    'articleSection': 'Life & Relationships',
    'wordCount': '1600',
  }
}; 