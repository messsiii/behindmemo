'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, CalendarIcon, Clock, Facebook, Linkedin, Share2, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaInstagram, FaPinterestP, FaTelegramPlane, FaTiktok, FaWhatsapp } from 'react-icons/fa'

const articleData = {
  title: 'Share Your Heart Before It\'s Too Late: Stop Regretting, Start Expressing',
  date: '2025-02-14',
  readTime: '5 min',
  content: {
    en: `
      <p class="text-lg leading-relaxed mb-6">We live in a world of fleeting moments, instant connections, and constant distractions. It's easy to get caught up in the whirlwind, to let days, weeks, even years slip by without truly connecting with the people who matter most. We tell ourselves we're "too busy," we assume they "already know" how we feel, or we simply get lost in the endless scroll of daily life. But what happens when "someday" never comes? What happens when "<em class="font-semibold text-primary">too late</em>" becomes a reality?</p>

      <h2 class="text-2xl font-bold mt-10 mb-6">The Pain of Unspoken Words: Missed Opportunities and Regret</h2>

      <p class="leading-relaxed mb-5">I remember a friend – always prioritized work. He'd say, "After this project, I'll spend time with family." But projects kept coming. One day, his father got seriously ill. He realized then, he <em class="font-semibold text-primary">missed</em> so many chances to be with his dad, to talk, to say "I love you." Now, those are <em class="font-semibold">forever regrets</em>, just silent tears by a hospital bed.</p>

      <p class="leading-relaxed mb-5">Or think about the girl who had a fight with her best friend. They were inseparable, shared everything. But a silly argument made them stop talking. She wanted to apologize, but pride got in the way. She thought, "I'll wait, she'll cool down." Days turned into weeks, then months. Then, she heard her friend was moving abroad, maybe for years. She realized she <em class="font-semibold text-primary">missed</em> all those chances to laugh together, to support each other. Now, that friendship might never be the same.</p>

      <p class="leading-relaxed mb-5">These stories, they're everywhere. They remind us: silence isn't always golden. Sometimes, silence is a sharp knife, cutting connections, leaving wounds that never heal. Those unspoken words, those unexpressed <em class="font-semibold text-primary">feelings</em>, they become our biggest <em class="font-semibold text-primary">regrets</em>. This isn't about perfect words. It's about the real, sometimes clumsy, act of saying, "I love you," "I appreciate you," "Thank you," "I'm sorry," or even "I'm thinking of you." It is about <em class="font-semibold text-primary">sharing your heart</em>. These simple words, said honestly, have huge power – to heal, to connect, to create lasting memories.</p>

      <h2 class="text-2xl font-bold mt-10 mb-6">Why We Hold Back: Fear of Vulnerability, Fear of Loss</h2>

      <p class="leading-relaxed mb-5">So why do we hesitate? Why let these chances to <em class="font-semibold text-primary">express love</em> disappear? It's often fear. Fear of being vulnerable, fear of rejection, fear of saying the "wrong" thing, fear of our own emotions. We build walls, thinking silence is safe, unspoken <em class="font-semibold text-primary">feelings</em> are less risky. We think: <em class="font-semibold text-primary">how to express my feelings</em> is just too difficult.</p>

      <p class="leading-relaxed mb-5">How many times have you looked at photos of your parents, wanting to call, but didn't? How many times have you scrolled through old texts with a friend, wanting to say something, but only sent an emoji? How many times have you been with your partner, feeling so much, but only said, "I'm fine"?</p>

      <p class="leading-relaxed mb-5">We fear rejection, we fear looking silly, we fear showing our weakness. We think if we open our hearts, we'll lose control, get hurt. So, we choose silence, we avoid, we hide those precious <em class="font-semibold text-primary">feelings</em> deep inside. But we forget, love <em class="font-semibold">is</em> a risk. If we're not brave enough to risk, how can we feel the joy and happiness of love?</p>

      <p class="leading-relaxed mb-5">But silence has its own risks. The risk of <em class="font-semibold text-primary">regret</em>, the risk of <em class="font-semibold text-primary">missed connections</em>, the risk of leaving things unsaid that could have changed everything. The risk of not <em class="font-semibold text-primary">sharing your heart</em>.</p>

      <h3 class="text-xl font-bold mt-8 mb-4">Stop Regretting: Don't Wait for "Someday"</h3>

      <p class="leading-relaxed mb-5">We often think we have all the time in the world. We put off important talks, we delay <em class="font-semibold text-primary">expressing</em> gratitude, we think there's always a "someday" to say what we need to. But life is fragile, time is precious. "Someday" might never come. That's why it's so important to <em class="font-semibold text-primary">share your heart before it's too late</em>.</p>

      <p class="leading-relaxed mb-5">Think about the people you've <em class="font-semibold text-primary">missed</em>, the chances you've <em class="font-semibold text-primary">missed</em>. If you could go back, what would you say? What would you do? Don't let that <em class="font-semibold text-primary">regret</em> happen again. Don't let "<em class="font-semibold text-primary">too late</em>" be the saddest words you know.</p>

      <h2 class="text-2xl font-bold mt-10 mb-6">How to <em class="font-semibold text-primary">Express Your Feelings</em>: A Starting Point</h2>

      <p class="leading-relaxed mb-5">How do you start? How do you get past that fear? Start small. Start with one memory. One photo. One shared moment. Let that be your guide.</p>

      <p class="leading-relaxed mb-5">Think about a special time you shared with someone you care about. What made it special? What <em class="font-semibold text-primary">feelings</em> did you have? What do you want that person to know? Don't worry about perfect writing. Just write from your heart.</p>

      <h3 class="text-xl font-bold mt-8 mb-4">Behindmemory: Your Partner in <em class="font-semibold text-primary">Expressing Love</em></h3>

      <p class="leading-relaxed mb-5">If you're still feeling stuck, or if you want to make your memories into a truly special gift, try <a href="https://www.behindmemory.com" class="text-primary font-medium hover:underline">Behindmemory</a>. We're not just another <em class="font-semibold text-primary">AI writing tool</em>. We're a helper on your journey of <em class="font-semibold text-primary">emotional expression</em>. We help you connect with your memories, find the right words, and create beautiful, personalized letters that capture your <em class="font-semibold text-primary">feelings</em>. We can help you <em class="font-semibold text-primary">write a love letter</em>, or any kind of heartfelt message.</p>

      <p class="leading-relaxed mb-5">We know it's hard. We know being vulnerable is scary. But we also believe sharing your heart is worth it. We want to help you avoid that <em class="font-semibold text-primary">regret</em>, that "I wish I had said something..." feeling.</p>

      <h2 class="text-2xl font-bold mt-10 mb-6"><em class="font-semibold text-primary">Share Your Heart</em>: A Call to Action</h2>

      <p class="leading-relaxed mb-5">Don't wait. Don't let another day pass without telling the people you love how much they mean to you. <em class="font-semibold text-primary">Express your feelings</em>. <em class="font-semibold text-primary">Share your heart before it's too late</em>. Write that letter. Make that call. Send that text. Whatever you do, let your love be known. The world needs more real connection, more honest <em class="font-semibold text-primary">expression</em>, more clumsy sincerity. And it starts with you. Don't <em class="font-semibold text-primary">miss out</em>, don't <em class="font-semibold text-primary">regret</em>.</p>

      <p class="leading-relaxed font-medium">Start writing and <em class="font-semibold text-primary">express love</em> today!</p>
    `,
    zh: `
      <p class="text-lg leading-relaxed mb-6">我们生活在一个转瞬即逝的世界中，充满着即时的连接和不断的干扰。很容易被这个漩涡所吸引，让日子、周、甚至年月在没有真正与最重要的人连接的情况下溜走。我们告诉自己我们"太忙了"，我们假设他们"已经知道"我们的感受，或者我们只是迷失在日常生活的无尽滚动中。但是，如果"某一天"永远不会到来怎么办？如果"<em class="font-semibold text-primary">太晚了</em>"成为现实怎么办？</p>

      <h2 class="text-2xl font-bold mt-10 mb-6">未说之言的痛苦：错失的机会和遗憾</h2>

      <p class="leading-relaxed mb-5">我记得一位朋友 - 总是把工作放在首位。他会说，"这个项目结束后，我会花时间陪家人。"但项目接踵而至。有一天，他的父亲病得很重。那时他才意识到，他<em class="font-semibold text-primary">错过</em>了很多与父亲在一起的机会，交谈的机会，说"我爱你"的机会。现在，这些是<em class="font-semibold">永远的遗憾</em>，只能在病床旁默默流泪。</p>

      <p class="leading-relaxed mb-5">或者想想那个与最好朋友吵架的女孩。她们形影不离，分享一切。但一场愚蠢的争论让她们停止了交流。她想道歉，但自尊心阻碍了她。她想，"我会等，她会冷静下来。"日子变成了几周，然后是几个月。然后，她听说她的朋友要出国，可能会离开几年。她意识到她<em class="font-semibold text-primary">错过</em>了所有一起笑的机会，互相支持的机会。现在，那段友谊可能永远不会恢复原样。</p>

      <p class="leading-relaxed mb-5">这些故事，随处可见。它们提醒我们：沉默并不总是金子。有时，沉默是一把锋利的刀，切断联系，留下永远不会愈合的伤口。那些未说出口的话，那些未表达的<em class="font-semibold text-primary">感受</em>，它们成为我们最大的<em class="font-semibold text-primary">遗憾</em>。这不是关于完美的词语。这是关于真实的，有时笨拙的行为，说"我爱你"，"我欣赏你"，"谢谢你"，"对不起"，甚至是"我在想你"。这是关于<em class="font-semibold text-primary">分享你的心</em>。这些简单的话，诚实地说出来，拥有巨大的力量 - 去治愈，去连接，去创造持久的记忆。</p>

      <h2 class="text-2xl font-bold mt-10 mb-6">为什么我们退缩：对脆弱的恐惧，对失去的恐惧</h2>

      <p class="leading-relaxed mb-5">那么为什么我们犹豫呢？为什么让这些<em class="font-semibold text-primary">表达爱</em>的机会消失？通常是因为恐惧。害怕变得脆弱，害怕被拒绝，害怕说"错"话，害怕自己的情绪。我们筑起墙壁，认为沉默是安全的，未说出口的<em class="font-semibold text-primary">感受</em>风险较小。我们想：<em class="font-semibold text-primary">如何表达我的感受</em>太困难了。</p>

      <p class="leading-relaxed mb-5">你有多少次看着父母的照片，想打电话，但没有？你有多少次翻看与朋友的旧短信，想说些什么，但只发了一个表情符号？你有多少次与伴侣在一起，感受到很多，但只说"我很好"？</p>

      <p class="leading-relaxed mb-5">我们害怕被拒绝，害怕看起来愚蠢，害怕展示我们的弱点。我们认为如果打开心扉，我们会失去控制，受到伤害。所以，我们选择沉默，我们避开，我们将那些珍贵的<em class="font-semibold text-primary">感受</em>深藏心底。但我们忘记了，爱<em class="font-semibold">就是</em>一种风险。如果我们不够勇敢去冒险，我们怎么能感受到爱的喜悦和幸福？</p>

      <p class="leading-relaxed mb-5">但沉默有自己的风险。<em class="font-semibold text-primary">遗憾</em>的风险，<em class="font-semibold text-primary">错失连接</em>的风险，留下可能改变一切的未说之言的风险。不<em class="font-semibold text-primary">分享你的心</em>的风险。</p>

      <h3 class="text-xl font-bold mt-8 mb-4">停止后悔：不要等待"某一天"</h3>

      <p class="leading-relaxed mb-5">我们常常认为我们有无尽的时间。我们推迟重要的谈话，我们延迟<em class="font-semibold text-primary">表达</em>感谢，我们认为总有一个"某一天"可以说出我们需要说的话。但生命脆弱，时间宝贵。"某一天"可能永远不会到来。这就是为什么<em class="font-semibold text-primary">在为时已晚之前分享你的心</em>如此重要。</p>

      <p class="leading-relaxed mb-5">想想你<em class="font-semibold text-primary">错过</em>的人，<em class="font-semibold text-primary">错过</em>的机会。如果可以回去，你会说什么？你会做什么？不要让那种<em class="font-semibold text-primary">遗憾</em>再次发生。不要让"<em class="font-semibold text-primary">太晚了</em>"成为你知道的最悲伤的词语。</p>

      <h2 class="text-2xl font-bold mt-10 mb-6">如何<em class="font-semibold text-primary">表达你的感受</em>：一个起点</h2>

      <p class="leading-relaxed mb-5">如何开始？如何克服那种恐惧？从小事开始。从一个记忆开始。一张照片。一个共同的时刻。让它成为你的向导。</p>

      <p class="leading-relaxed mb-5">想想你与关心的人共度的特别时光。是什么让它特别？你有什么<em class="font-semibold text-primary">感受</em>？你想让那个人知道什么？不用担心完美的写作。只要从你的心里写出来。</p>

      <h3 class="text-xl font-bold mt-8 mb-4">Behindmemory：你<em class="font-semibold text-primary">表达爱</em>的伙伴</h3>

      <p class="leading-relaxed mb-5">如果你仍然感到困惑，或者如果你想把你的记忆变成一份真正特别的礼物，试试<a href="https://www.behindmemory.com" class="text-primary font-medium hover:underline">Behindmemory</a>。我们不仅仅是另一个<em class="font-semibold text-primary">AI写作工具</em>。我们是你<em class="font-semibold text-primary">情感表达</em>旅程中的助手。我们帮助你与你的记忆联系，找到合适的词语，创造美丽、个性化的信件，捕捉你的<em class="font-semibold text-primary">感受</em>。我们可以帮助你<em class="font-semibold text-primary">写一封情书</em>，或任何一种走心的信息。</p>

      <p class="leading-relaxed mb-5">我们知道这很难。我们知道变得脆弱是可怕的。但我们也相信分享你的心是值得的。我们想帮助你避免那种<em class="font-semibold text-primary">遗憾</em>，那种"我希望我曾经说过什么..."的感觉。</p>

      <h2 class="text-2xl font-bold mt-10 mb-6"><em class="font-semibold text-primary">分享你的心</em>：行动的呼吁</h2>

      <p class="leading-relaxed mb-5">不要等待。不要让另一天过去，而不告诉你爱的人他们对你意味着什么。<em class="font-semibold text-primary">表达你的感受</em>。<em class="font-semibold text-primary">在为时已晚之前分享你的心</em>。写那封信。打那通电话。发那条短信。无论你做什么，让你的爱被了解。世界需要更多真实的连接，更多诚实的<em class="font-semibold text-primary">表达</em>，更多笨拙的真诚。而这从你开始。不要<em class="font-semibold text-primary">错过</em>，不要<em class="font-semibold text-primary">后悔</em>。</p>

      <p class="leading-relaxed font-medium">今天就开始写作并<em class="font-semibold text-primary">表达爱</em>！</p>
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
    const description = "Don't let unspoken feelings and missed opportunities become lifelong regrets. Learn how to express your love, overcome the fear of vulnerability, and write heartfelt letters."
    const imageUrl = "https://behindmemory.com/images/blog/share-heart.jpg"
    const hashtags = "BehindMemory,ExpressYourFeelings,HeartfeltLetter"
    
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
      
      <main className="relative z-10 flex-1 container mx-auto px-4 py-10">
        <article className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 md:p-10">
          <Link 
            href="/blog" 
            className="inline-flex items-center text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'en' ? 'Back to blog' : '返回博客'}
          </Link>
          
          <div className="mb-8 pb-6 border-b">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{articleData.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CalendarIcon className="mr-1 h-3 w-3" />
                <time dateTime={articleData.date}>{formatDate(articleData.date)}</time>
              </div>
              <div className="flex items-center">
                <Clock className="mr-1 h-3 w-3" />
                <span>{articleData.readTime}</span>
              </div>
            </div>
          </div>
          
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
          
          <div 
            className="prose prose-gray max-w-none dark:prose-invert article-content"
            dangerouslySetInnerHTML={{ 
              __html: language === 'en' ? articleData.content.en : articleData.content.zh 
            }}
          />
          
          {/* 添加结构化数据 */}
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
                "keywords": "share your heart, express love, express feelings, write a letter, love letter, heartfelt letter, emotional expression, regret, missed opportunities, say it now, before it's too late, Behindmemory, personal writing, meaningful gifts, overcome fear, vulnerability, how to write a love letter, how to express feelings, stop regretting",
                "description": "Don't let unspoken feelings and missed opportunities become lifelong regrets. Learn how to express your love, overcome the fear of vulnerability, and write heartfelt letters."
              })
            }}
          />
          
          <div className="border-t mt-12 pt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="relative">
                <h3 className="font-medium text-sm mb-2">
                  {language === 'en' ? 'Share this article' : '分享这篇文章'}
                </h3>
                <div className="flex items-center gap-2">
                  {/* 主要分享按钮 */}
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full h-8 w-8 hover:bg-black hover:text-white transition-colors"
                    onClick={() => shareToSocial('twitter')}
                    title={language === 'en' ? 'Share on X (Twitter)' : '分享到X (Twitter)'}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">X (Twitter)</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                    onClick={() => shareToSocial('facebook')}
                    title={language === 'en' ? 'Share on Facebook' : '分享到Facebook'}
                  >
                    <Facebook className="h-4 w-4" />
                    <span className="sr-only">Facebook</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full h-8 w-8 hover:bg-gradient-to-br from-pink-500 to-yellow-500 hover:text-white transition-colors"
                    onClick={() => shareToSocial('instagram')}
                    title={language === 'en' ? 'Share on Instagram' : '分享到Instagram'}
                  >
                    <FaInstagram className="h-4 w-4" />
                    <span className="sr-only">Instagram</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full h-8 w-8 hover:bg-pink-100 hover:text-pink-600 transition-colors"
                    onClick={() => shareToSocial('tiktok')}
                    title={language === 'en' ? 'Share on TikTok' : '分享到抖音'}
                  >
                    <FaTiktok className="h-3 w-3" />
                    <span className="sr-only">TikTok</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full h-8 w-8 hover:bg-green-100 hover:text-green-600 transition-colors"
                    onClick={() => shareToSocial('whatsapp')}
                    title={language === 'en' ? 'Share on WhatsApp' : '分享到WhatsApp'}
                  >
                    <FaWhatsapp className="h-4 w-4" />
                    <span className="sr-only">WhatsApp</span>
                  </Button>
                  
                  {/* 更多分享选项按钮 */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-8 w-8 hover:bg-gray-100 transition-colors"
                    onClick={nativeShare}
                    title={language === 'en' ? 'More sharing options' : '更多分享选项'}
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">More</span>
                  </Button>

                  {/* 抖音分享提示 */}
                  {showTikTokTip && (
                    <div className="absolute top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg z-20 w-60">
                      {language === 'en' 
                        ? 'Link copied! Open TikTok app and paste it in your post.' 
                        : '链接已复制！请打开抖音应用并在你的帖子中粘贴。'}
                    </div>
                  )}

                  {/* Instagram分享提示 */}
                  {showInstagramTip && (
                    <div className="absolute top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg z-20 w-60">
                      {language === 'en' 
                        ? 'Link copied! Open Instagram app and paste it in your story or bio.' 
                        : '链接已复制！请打开Instagram应用并在你的故事或个人简介中粘贴。'}
                    </div>
                  )}
                  
                  {/* 更多分享选项弹出面板 */}
                  {showMoreShareOptions && (
                    <div className="absolute mt-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="rounded-full h-8 w-8 hover:bg-blue-200 hover:text-blue-700 transition-colors"
                        onClick={() => shareToSocial('linkedin')}
                        title={language === 'en' ? 'Share on LinkedIn' : '分享到LinkedIn'}
                      >
                        <Linkedin className="h-4 w-4" />
                        <span className="sr-only">LinkedIn</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="rounded-full h-8 w-8 hover:bg-red-100 hover:text-red-600 transition-colors"
                        onClick={() => shareToSocial('pinterest')}
                        title={language === 'en' ? 'Share on Pinterest' : '分享到Pinterest'}
                      >
                        <FaPinterestP className="h-4 w-4" />
                        <span className="sr-only">Pinterest</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="rounded-full h-8 w-8 hover:bg-blue-100 hover:text-blue-500 transition-colors"
                        onClick={() => shareToSocial('telegram')}
                        title={language === 'en' ? 'Share on Telegram' : '分享到Telegram'}
                      >
                        <FaTelegramPlane className="h-4 w-4" />
                        <span className="sr-only">Telegram</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <Link href="/blog">
                <Button variant="outline">
                  {language === 'en' ? 'View all articles' : '查看所有文章'}
                </Button>
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
} 