'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'
import { CalendarIcon, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// 博客文章数据
const blogPosts = [
  {
    id: 'share-your-heart',
    title: 'Share Your Heart Before It\'s Too Late: Stop Regretting, Start Expressing',
    slug: 'share-your-heart-before-its-too-late',
    description: '当我们太忙于日常生活时，我们常常忘记向我们爱的人表达我们的感受。了解为什么现在就表达你的情感是如此重要。',
    date: '2023-12-15',
    readTime: '5 min',
    imageUrl: '/images/blog/share-heart.jpg',
    excerpt: 'Don\'t let unspoken feelings and missed opportunities become lifelong regrets. Learn how to express your love, overcome the fear of vulnerability, and write heartfelt letters.',
  },
  {
    id: 'heartfelt-letter',
    title: 'How to Write a Heartfelt Letter to Someone You Love (Even If You\'re Not a Writer)',
    slug: 'how-to-write-heartfelt-letter-even-not-writer',
    description: '写情感信件并不需要专业的写作技巧。探索如何用真诚的话语触动你爱的人的心灵。',
    date: '2024-01-20',
    readTime: '7 min',
    imageUrl: '/images/blog/heartfelt-letter.jpg',
    excerpt: 'Learn practical tips for writing meaningful, authentic letters to your loved ones, regardless of your writing skills or experience.',
  },
]

export default function BlogPage() {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 在客户端渲染前返回一个占位内容
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
        <Nav />
        <div className="container mx-auto px-4 py-16 flex-1">
          <div className="space-y-6">
            <div className="h-10 w-1/3 bg-gray-200 animate-pulse rounded" />
            <div className="h-6 w-2/3 bg-gray-200 animate-pulse rounded" />
            <div className="grid gap-8 md:grid-cols-2 mt-12">
              <div className="h-80 bg-gray-200 animate-pulse rounded-lg" />
              <div className="h-80 bg-gray-200 animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
      <Nav />
      
      <main className="relative z-10 flex-1 container mx-auto px-4 py-16">
        <section className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] bg-clip-text text-transparent">
            {language === 'en' ? 'Our Blog' : '我们的博客'}
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            {language === 'en'
              ? 'Thoughts, stories and ideas about emotional connection and expressing feelings to your loved ones.'
              : '关于情感连接和向所爱之人表达感情的思考、故事和想法。'}
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {blogPosts.map((post, index) => (
              <Link href={`/blog/${post.slug}`} key={post.id}>
                <Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1 border border-gray-200 dark:border-gray-800">
                  <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <Image 
                      src={post.imageUrl} 
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        <time dateTime={post.date}>{formatDate(post.date)}</time>
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2 text-xl font-semibold tracking-tight">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <CardDescription className="line-clamp-3">
                      {language === 'en' ? post.excerpt : post.description}
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="p-0 h-auto font-medium text-primary hover:bg-transparent hover:underline">
                      {language === 'en' ? 'Read more' : '阅读更多'}
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
} 