'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, CalendarIcon, Clock, Facebook, Linkedin, Share2, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa'

const articleData = {
  title: 'Share Your Heart Before It\'s Too Late: Stop Regretting, Start Expressing',
  date: '2025-02-14',
  readTime: '5 min',
  content: {
    en: `
      <div class="blog-content">
      <p>We live in a world of fleeting moments, instant connections, and constant distractions. It's easy to get caught up in the whirlwind, to let days, weeks, even years slip by without truly connecting with the people who matter most. We tell ourselves we're "too busy," we assume they "already know" how we feel, or we simply get lost in the endless scroll of daily life. But what happens when "someday" never comes? What happens when "<em class="highlight">too late</em>" becomes a reality?</p>

      <h2>The Pain of Unspoken Words: Missed Opportunities and Regret</h2>

      <p>I remember a friend – always prioritized work. He'd say, "After this project, I'll spend time with family." But projects kept coming. One day, his father got seriously ill. He realized then, he <em class="highlight">missed</em> so many chances to be with his dad, to talk, to say "I love you." Now, those are <em>forever regrets</em>, just silent tears by a hospital bed.</p>

      <p>Or think about the girl who had a fight with her best friend. They were inseparable, shared everything. But a silly argument made them stop talking. She wanted to apologize, but pride got in the way. She thought, "I'll wait, she'll cool down." Days turned into weeks, then months. Then, she heard her friend was moving abroad, maybe for years. She realized she <em class="highlight">missed</em> all those chances to laugh together, to support each other. Now, that friendship might never be the same.</p>

      <p>These stories, they're everywhere. They remind us: silence isn't always golden. Sometimes, silence is a sharp knife, cutting connections, leaving wounds that never heal. Those unspoken words, those unexpressed <em class="highlight">feelings</em>, they become our biggest <em class="highlight">regrets</em>. This isn't about perfect words. It's about the real, sometimes clumsy, act of saying, "I love you," "I appreciate you," "Thank you," "I'm sorry," or even "I'm thinking of you." It is about <em class="highlight">sharing your heart</em>. These simple words, said honestly, have huge power – to heal, to connect, to create lasting memories.</p>

      <h2>Why We Hold Back: Fear of Vulnerability, Fear of Loss</h2>

      <p>So why do we hesitate? Why let these chances to <em class="highlight">express love</em> disappear? It's often fear. Fear of being vulnerable, fear of rejection, fear of saying the "wrong" thing, fear of our own emotions. We build walls, thinking silence is safe, unspoken <em class="highlight">feelings</em> are less risky. We think: <em class="highlight">how to express my feelings</em> is just too difficult.</p>

      <p>How many times have you looked at photos of your parents, wanting to call, but didn't? How many times have you scrolled through old texts with a friend, wanting to say something, but only sent an emoji? How many times have you been with your partner, feeling so much, but only said, "I'm fine"?</p>

      <p>We fear rejection, we fear looking silly, we fear showing our weakness. We think if we open our hearts, we'll lose control, get hurt. So, we choose silence, we avoid, we hide those precious <em class="highlight">feelings</em> deep inside. But we forget, love <em>is</em> a risk. If we're not brave enough to risk, how can we feel the joy and happiness of love?</p>

      <p>But silence has its own risks. The risk of <em class="highlight">regret</em>, the risk of <em class="highlight">missed connections</em>, the risk of leaving things unsaid that could have changed everything. The risk of not <em class="highlight">sharing your heart</em>.</p>

      <h3>Stop Regretting: Don't Wait for "Someday"</h3>

      <p>We often think we have all the time in the world. We put off important talks, we delay <em class="highlight">expressing</em> gratitude, we think there's always a "someday" to say what we need to. But life is fragile, time is precious. "Someday" might never come. That's why it's so important to <em class="highlight">share your heart before it's too late</em>.</p>

      <p>Think about the people you've <em class="highlight">missed</em>, the chances you've <em class="highlight">missed</em>. If you could go back, what would you say? What would you do? Don't let that <em class="highlight">regret</em> happen again. Don't let "<em class="highlight">too late</em>" be the saddest words you know.</p>

      <h2>How to <em class="highlight">Express Your Feelings</em>: A Starting Point</h2>

      <p>How do you start? How do you get past that fear? Start small. Start with one memory. One photo. One shared moment. Let that be your guide.</p>

      <p>Think about a special time you shared with someone you care about. What made it special? What <em class="highlight">feelings</em> did you have? What do you want that person to know? Don't worry about perfect writing. Just write from your heart.</p>

      <h3>Behindmemory: Your Partner in <em class="highlight">Expressing Love</em></h3>

      <p>If you're still feeling stuck, or if you want to make your memories into a truly special gift, try <a href="https://www.behindmemory.com">Behindmemory</a>. We're not just another <em class="highlight">AI writing tool</em>. We're a helper on your journey of <em class="highlight">emotional expression</em>. We help you connect with your memories, find the right words, and create beautiful, personalized letters that capture your <em class="highlight">feelings</em>. We can help you <em class="highlight">write a love letter</em>, or any kind of heartfelt message.</p>

      <p>We know it's hard. We know being vulnerable is scary. But we also believe sharing your heart is worth it. We want to help you avoid that <em class="highlight">regret</em>, that "I wish I had said something..." feeling.</p>

      <h2><em class="highlight">Share Your Heart</em>: A Call to Action</h2>

      <p>Don't wait. Don't let another day pass without telling the people you love how much they mean to you. <em class="highlight">Express your feelings</em>. <em class="highlight">Share your heart before it's too late</em>. Write that letter. Make that call. Send that text. Whatever you do, let your love be known. The world needs more real connection, more honest <em class="highlight">expression</em>, more clumsy sincerity. And it starts with you. Don't <em class="highlight">miss out</em>, don't <em class="highlight">regret</em>.</p>

      <p>Start writing and <em class="highlight">express love</em> today!</p>
      </div>
    `,
    zh: `
      <div class="blog-content">
      <p>我们生活在一个转瞬即逝的世界中，充满着即时的连接和不断的干扰。很容易被这个漩涡所吸引，让日子、周、甚至年月在没有真正与最重要的人连接的情况下溜走。我们告诉自己我们"太忙了"，我们假设他们"已经知道"我们的感受，或者我们只是迷失在日常生活的无尽滚动中。但是，如果"某一天"永远不会到来怎么办？如果"<em class="highlight">太晚了</em>"成为现实怎么办？</p>

      <h2>未说之言的痛苦：错失的机会和遗憾</h2>

      <p>我记得一位朋友 - 总是把工作放在首位。他会说，"这个项目结束后，我会花时间陪家人。"但项目接踵而至。有一天，他的父亲病得很重。那时他才意识到，他<em class="highlight">错过</em>了很多与父亲在一起的机会，交谈的机会，说"我爱你"的机会。现在，这些是<em>永远的遗憾</em>，只能在病床旁默默流泪。</p>

      <p>或者想想那个与最好朋友吵架的女孩。她们形影不离，分享一切。但一场愚蠢的争论让她们停止了交流。她想道歉，但自尊心阻碍了她。她想，"我会等，她会冷静下来。"日子变成了几周，然后是几个月。然后，她听说她的朋友要出国，可能会离开几年。她意识到她<em class="highlight">错过</em>了所有一起笑的机会，互相支持的机会。现在，那段友谊可能永远不会恢复原样。</p>

      <p>这些故事，随处可见。它们提醒我们：沉默并不总是金子。有时，沉默是一把锋利的刀，切断联系，留下永远不会愈合的伤口。那些未说出口的话，那些未表达的<em class="highlight">感受</em>，它们成为我们最大的<em class="highlight">遗憾</em>。这不是关于完美的词语。这是关于真实的，有时笨拙的行为，说"我爱你"，"我欣赏你"，"谢谢你"，"对不起"，甚至是"我在想你"。这是关于<em class="highlight">分享你的心</em>。这些简单的话，诚实地说出来，拥有巨大的力量 - 去治愈，去连接，去创造持久的记忆。</p>
      </div>
    `,
  },
}

export default function ArticlePage() {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  
  // 获取完整URL用于分享
  const [pageUrl, setPageUrl] = useState('')
  const [showMoreShareOptions, setShowMoreShareOptions] = useState(false)
  const [showTikTokTip, setShowTikTokTip] = useState(false)
  const [showInstagramTip, setShowInstagramTip] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setPageUrl(`${window.location.origin}${pathname}`)
    }
  }, [pathname])

  // 社交媒体分享函数
  const shareToSocial = (platform: 'twitter' | 'facebook' | 'linkedin' | 'pinterest' | 'whatsapp' | 'tiktok' | 'telegram' | 'instagram') => {
    const title = articleData.title
    const description = "We often hide our true feelings, waiting for the perfect time to express them, only to lose our chance. Don't wait - share your feelings today. Learn tips to express your heart."
    const imageUrl = "https://behindmemory.com/images/blog/share-heart.jpg"
    const hashtags = "BehindMemory,HeartfeltLetter,ExpressYourFeelings"
    
    let shareUrl = ''
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}&hashtags=${encodeURIComponent(hashtags.replace(/#/g, '').replace(/,/g, ','))}&via=behindmemory`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(title)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}&source=BehindMemory`
        break
      case 'pinterest':
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(title + ' - ' + description)}`
        break
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + '\n\n' + description + '\n\n' + pageUrl)}`
        break
      case 'tiktok':
        // TikTok没有可靠的网页分享API，显示提示框
        setShowTikTokTip(true)
        setTimeout(() => setShowTikTokTip(false), 3000)
        // 复制链接到剪贴板
        navigator.clipboard.writeText(pageUrl)
        return
      case 'instagram':
        // Instagram没有网页分享API，显示提示框
        setShowInstagramTip(true)
        setTimeout(() => setShowInstagramTip(false), 3000)
        // 复制链接到剪贴板
        navigator.clipboard.writeText(pageUrl)
        return
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(title + '\n\n' + description)}`
        break
    }
    
    // 打开分享窗口
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes')
    }
  }
  
  // 使用Web Share API进行原生分享（适用于移动设备）
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: articleData.title,
          text: "Don't let unspoken feelings and missed opportunities become lifelong regrets. Learn how to express your love, overcome the fear of vulnerability, and write heartfelt letters.",
          url: pageUrl,
          // 注意：files属性目前仅在部分浏览器支持，可能会导致错误
          // 如果要分享图片，需要先获取图片的Blob对象
          // files: [imageFile] 
        })
        console.log('内容已成功分享')
      } catch (error) {
        console.log('分享失败:', error)
        // 如果Web Share API失败，回退到显示更多分享选项
        setShowMoreShareOptions(!showMoreShareOptions)
      }
    } else {
      // 如果Web Share API不可用，则显示更多分享选项
      setShowMoreShareOptions(!showMoreShareOptions)
    }
  }
  
  // 在客户端渲染前返回一个占位内容
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
        <div className="container mx-auto px-4 py-16 flex-1">
          <div className="animate-pulse space-y-8 max-w-3xl mx-auto">
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
      <Nav />
      
      <main className="relative z-10 flex-1 container mx-auto px-4 py-16">
        <article className="max-w-3xl mx-auto">
          {/* 返回按钮 */}
          <Link href="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'en' ? 'Back to Blog' : '返回博客'}
          </Link>
          
          {/* 文章标题 */}
          <h1 className="blog-title">{articleData.title}</h1>
          
          {/* 文章元数据 */}
          <div className="blog-meta">
            <div className="flex items-center">
              <CalendarIcon className="mr-1 h-3 w-3" />
              <time dateTime={articleData.date}>{formatDate(articleData.date)}</time>
            </div>
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              <span>{articleData.readTime}</span>
            </div>
          </div>
          
          {/* 封面图片 */}
          <div className="aspect-video w-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center rounded-lg mb-8 relative">
            <Image 
              src="/images/blog/share-heart.jpg" 
              alt={articleData.title}
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover rounded-lg"
              priority
            />
          </div>
          
          {/* 文章内容 */}
          <div 
            dangerouslySetInnerHTML={{ 
              __html: language === 'en' ? articleData.content.en : articleData.content.zh 
            }} 
          />
          
          {/* 结构化数据 */}
          <script 
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": articleData.title,
                "datePublished": articleData.date,
                "dateModified": articleData.date,
                "image": "https://behindmemory.com/images/blog/share-heart.jpg",
                "author": {
                  "@type": "Organization",
                  "name": "Behind Memory"
                },
                "publisher": {
                  "@type": "Organization",
                  "name": "Behind Memory",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://behindmemory.com/logo.png"
                  }
                },
                "mainEntityOfPage": {
                  "@type": "WebPage",
                  "@id": "https://behindmemory.com/blog/share-your-heart-before-its-too-late"
                },
                "description": "Don't let unspoken feelings and missed opportunities become lifelong regrets. Learn how to express your love, overcome the fear of vulnerability, and write heartfelt letters."
              })
            }}
          />
          
          {/* 分享按钮 */}
          <div className="mt-12 pt-6 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'en' ? 'Share this article' : '分享这篇文章'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'en' 
                    ? 'If you found this helpful, please share it with others who might benefit.' 
                    : '如果您觉得这篇文章有帮助，请与可能受益的人分享。'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareToSocial('facebook')}>
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareToSocial('twitter')}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareToSocial('linkedin')}>
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareToSocial('whatsapp')}>
                  <FaWhatsapp className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareToSocial('telegram')}>
                  <FaTelegramPlane className="h-4 w-4" />
                </Button>
                {/* 原生分享按钮 */}
                <Button variant="outline" size="icon" className="rounded-full" onClick={nativeShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </article>
      </main>
      
      {/* Instagram分享提示 */}
      {showInstagramTip && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg z-50 max-w-xs text-center">
          <p className="mb-2">链接已复制到剪贴板</p>
          <p>请手动粘贴到Instagram应用中分享</p>
        </div>
      )}
      
      {/* TikTok分享提示 */}
      {showTikTokTip && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg z-50 max-w-xs text-center">
          <p className="mb-2">链接已复制到剪贴板</p>
          <p>请手动粘贴到TikTok应用中分享</p>
        </div>
      )}
      
      <Footer />
    </div>
  )
} 