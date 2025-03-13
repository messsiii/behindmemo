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
  title: 'How to Write a Heartfelt Letter to Someone You Love (Even If You\'re Not a Writer)',
  date: '2025-03-12',
  readTime: '7 min',
  content: {
    en: `
      <p class="text-lg leading-relaxed mb-6">In this instant communication age, how long time you no pick up pen and <em class="font-semibold text-primary">write a letter</em>? Or, even on keyboard, type a long, serious email? We get used to use emojis instead of thousand words, use "likes" instead of looking at them with deep feeling, use group messages instead of one-on-one real talk. So, "<em class="font-semibold text-primary">write a letter</em>" this thing, seem become more and more far, more and more strange.</p>
      
      <h2 class="text-2xl font-bold mt-10 mb-6">The Lost Art of Letter Writing (and Why It Still Matters)</h2>
      
      <p class="leading-relaxed mb-5">But, you know? More fast the times is, more we need slow down power. More noisy the world is, more we need quiet corner. <em class="font-semibold text-primary">Writing a letter</em>, is this kind of power, this kind corner. It let you slow, let you quiet, to think, to feel, to face your inside deep heart, those real <em class="font-semibold text-primary">feelings for people you love</em>.</p>
      
      <p class="leading-relaxed mb-5">It forces you to connect, not just communicate. To truly <em class="font-semibold text-primary">express your feelings</em>, not just send information. This is especially important when trying to write a <em class="font-semibold text-primary">love letter</em> or a <em class="font-semibold text-primary">letter to a loved one</em>.</p>
      
      <h2 class="text-2xl font-bold mt-10 mb-6">How to <em class="font-semibold text-primary">Write a Letter</em> to Those Who Matter</h2>
      
      <p class="leading-relaxed mb-5">So, how to <em class="font-semibold text-primary">write a letter</em> to those you love – family, lover, or friend?</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">Finding Your Inspiration: Memories and Photos</h3>
      
      <p class="leading-relaxed mb-5">Don't scare by "I not good at write." <em class="font-semibold text-primary">Write letter</em>, not literature creation, no need fancy words, no need super skills. It need, only real. And real, always hide in those normal memories.</p>
      
      <p class="leading-relaxed mb-5">Where to start? Open your phone photo album. There, must have many many photos, record you and <em class="font-semibold text-primary">people you love's</em> little moments. Maybe a trip, a dinner together, a birthday, even just a normal weekend afternoon. These <em class="font-semibold text-primary">photo memories</em> are a goldmine for <em class="font-semibold text-primary">letter writing</em> inspiration.</p>
      
      <p class="leading-relaxed mb-5">Choose one photo. One photo that make you feel something. It no need be "perfect," even no need be very "clear." Only it can wake up some feeling deep in your heart – happy, moved, miss them, thankful… anything is ok. This photo, is your letter's "anchor point." This is key for writing a <em class="font-semibold text-primary">meaningful letter</em>.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">Rebuilding the Scene: The Power of Details</h3>
      
      <p class="leading-relaxed mb-5">How do you start <em class="font-semibold text-primary">expressing love in writing</em>? Start with the details.</p>
      
      <p class="leading-relaxed mb-5">Look at this photo, close your eyes, take deep breath. Try remember the time when photo was take:</p>
      
      <ul class="space-y-2 mb-6">
        <li class="leading-relaxed">What time was it? Where?</li>
        <li class="leading-relaxed">What sound around? What smell?</li>
        <li class="leading-relaxed">What you doing? What you talking?</li>
        <li class="leading-relaxed">How you feel that time?</li>
        <li class="leading-relaxed">The other person's face, action, you still remember?</li>
      </ul>
      
      <p class="leading-relaxed mb-5">Don't try remember all detail at one time. Little by little. Like puzzle, slowly put those memory fragment, make a whole picture.</p>
      
      <p class="leading-relaxed mb-5">Detail, is letter's soul. More specific the detail, more can touch people's heart. Because in detail, hide real feeling. This is how you write a <em class="font-semibold text-primary">heartfelt letter</em>.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">Honest "Heart Voice": Don't Be Afraid of Vulnerability</h3>
      
      <p class="leading-relaxed mb-5">Now, you can start write.</p>
      
      <p class="leading-relaxed mb-5"><em class="font-semibold text-primary">Don't know what to write in a letter</em>? Don't think "write good or not good," don't worry "too cheesy or not." The scene you remember, the feeling you have inside, use most simple words write down.</p>
      
      <p class="leading-relaxed mb-5">Can start like this:</p>
      
      <ul class="space-y-2 mb-6">
        <li class="leading-relaxed">"Dear XX, see this photo, I remember…"</li>
        <li class="leading-relaxed">"XX, remember that day? We…"</li>
        <li class="leading-relaxed">"XX, recent I always thinking, if no you…"</li>
      </ul>
      
      <p class="leading-relaxed mb-5">Then, follow your thinking, the words you want say, all write down.</p>
      
      <p class="leading-relaxed mb-5">Don't scare show your weakness. <em class="font-semibold text-primary">Real emotional expression</em>, always with weakness. And weakness, is most can touch people heart's power.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">Overcoming Writer's Block: Tips and Tools</h3>
      
      <p class="leading-relaxed mb-5"><em class="font-semibold text-primary">Struggling to express your feelings</em>? You are not alone. Many people find it <em class="font-semibold text-primary">hard to write emotional letters.</em></p>
      
      <p class="leading-relaxed mb-5">If you still feel no where to start, or want make your <em class="font-semibold text-primary">letter</em> more beautiful, maybe try <a href="https://www.behindmemory.com" class="text-primary hover:underline">Behindmemory.com</a>.</p>
      
      <p class="leading-relaxed mb-5">Behindmemory not a simple <em class="font-semibold text-primary">AI writing tool</em>. It more like a friend, a guide. It can help you look at photo's feeling clues, give you <em class="font-semibold text-primary">write inspiration</em> and advice. More important, it can use your real story, make a letter full of <em class="font-semibold text-primary">your</em> style, <em class="font-semibold text-primary">your</em> warm. This letter, not just cold words put together, is your inside heart feeling's real flow. It helps you create a truly <em class="font-semibold text-primary">personalized gift</em>. It is a powerful tool to assist you in <em class="font-semibold text-primary">personal writing</em>.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">Sending Your Letter: The Form Doesn't Matter</h3>
      
      <p class="leading-relaxed mb-5">After write letter, you can choose print it out, put in envelope, put on stamp, send. Or can choose copy to email, send to them. Even, you can just read the letter content, to them face to face.</p>
      
      <p class="leading-relaxed mb-5">Form not important. Important is, you use <em class="font-semibold text-primary">write letter</em> this way, to people you love, send your heart meaning.</p>
      
      <h2 class="text-2xl font-bold mt-10 mb-6">Conclusion: The Power of the Written Word</h2>
      
      <p class="leading-relaxed mb-5">In this fast time, <em class="font-semibold text-primary">write letter</em>, maybe seem a little "old," a little "out of date." But, is this "old" and "out of date," make it more precious. Because, it mean a slow down manner, a real attitude, a to people you love, most deep care.</p>
      
      <p class="leading-relaxed mb-5">So, pick up pen, or open computer, to those you love, <em class="font-semibold text-primary">write a letter</em>. Even clumsy, even rough, but if it is real, must can touch heart. Because, most precious things, always with a little clumsy mark. Like love. Like true heart. Like the letter you about to write.</p>
    `,
    zh: `
      <p class="text-lg leading-relaxed mb-6">在这个即时通讯的时代，你有多久没有拿起笔来<em class="font-semibold text-primary">写一封信</em>了？或者，即使在键盘上，打出一封长长的、认真的电子邮件？我们习惯用表情符号代替千言万语，用"点赞"代替深情凝视，用群发消息代替一对一的真实交流。所以，"<em class="font-semibold text-primary">写信</em>"这件事，似乎变得越来越遥远，越来越陌生。</p>
      
      <h2 class="text-2xl font-bold mt-10 mb-6">书信写作的失落艺术（以及为什么它仍然重要）</h2>
      
      <p class="leading-relaxed mb-5">但是，你知道吗？时代越快，我们越需要减速的力量。世界越嘈杂，我们越需要安静的角落。<em class="font-semibold text-primary">写信</em>，就是这样一种力量，这样一个角落。它让你放慢脚步，让你安静下来，去思考，去感受，去面对你内心深处对<em class="font-semibold text-primary">所爱之人的感受</em>。</p>
      
      <p class="leading-relaxed mb-5">它迫使你连接，而不仅仅是交流。真正地<em class="font-semibold text-primary">表达你的感受</em>，而不仅仅是发送信息。这在尝试写一封<em class="font-semibold text-primary">情书</em>或给<em class="font-semibold text-primary">所爱之人的信</em>时尤为重要。</p>
      
      <h2 class="text-2xl font-bold mt-10 mb-6">如何给那些重要的人<em class="font-semibold text-primary">写信</em></h2>
      
      <p class="leading-relaxed mb-5">那么，如何给你所爱的人——家人、爱人或朋友<em class="font-semibold text-primary">写信</em>呢？</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">寻找灵感：回忆和照片</h3>
      
      <p class="leading-relaxed mb-5">不要因为"我不擅长写作"而害怕。<em class="font-semibold text-primary">写信</em>，不是文学创作，不需要华丽的词藻，不需要超凡的技巧。它需要的，只是真实。而真实，总是藏在那些普通的回忆中。</p>
      
      <p class="leading-relaxed mb-5">从哪里开始？打开你的手机相册。那里，一定有很多很多照片，记录着你和<em class="font-semibold text-primary">你爱的人</em>的点点滴滴。也许是一次旅行，一顿共进的晚餐，一个生日，甚至只是一个普通的周末下午。这些<em class="font-semibold text-primary">照片记忆</em>是<em class="font-semibold text-primary">写信</em>灵感的金矿。</p>
      
      <p class="leading-relaxed mb-5">选择一张照片。一张能让你感受到什么的照片。它不需要"完美"，甚至不需要很"清晰"。只要它能唤醒你内心深处的某种感觉——快乐、感动、想念、感激……什么都行。这张照片，就是你信件的"锚点"。这是写一封<em class="font-semibold text-primary">有意义的信</em>的关键。</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">重建场景：细节的力量</h3>
      
      <p class="leading-relaxed mb-5">如何开始<em class="font-semibold text-primary">在写作中表达爱</em>？从细节开始。</p>
      
      <p class="leading-relaxed mb-5">看着这张照片，闭上眼睛，深呼吸。试着回忆照片拍摄时的情景：</p>
      
      <ul class="space-y-2 mb-6">
        <li class="leading-relaxed">那是什么时候？在哪里？</li>
        <li class="leading-relaxed">周围有什么声音？什么气味？</li>
        <li class="leading-relaxed">你在做什么？在说什么？</li>
        <li class="leading-relaxed">那时你的感受如何？</li>
        <li class="leading-relaxed">对方的表情、动作，你还记得吗？</li>
      </ul>
      
      <p class="leading-relaxed mb-5">不要试图一次记住所有细节。慢慢来。像拼图一样，慢慢把那些记忆碎片拼凑起来，组成一幅完整的画面。</p>
      
      <p class="leading-relaxed mb-5">细节，是信件的灵魂。细节越具体，越能触动人心。因为在细节中，藏着真实的感受。这就是如何写一封<em class="font-semibold text-primary">走心的信</em>。</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">真实的"心声"：不要害怕脆弱</h3>
      
      <p class="leading-relaxed mb-5">现在，你可以开始写了。</p>
      
      <p class="leading-relaxed mb-5"><em class="font-semibold text-primary">不知道信中该写什么</em>？不要想"写得好不好"，不要担心"太肉麻不肉麻"。你记得的场景，你内心的感受，用最简单的词语写下来就好。</p>
      
      <p class="leading-relaxed mb-5">可以这样开始：</p>
      
      <ul class="space-y-2 mb-6">
        <li class="leading-relaxed">"亲爱的XX，看到这张照片，我想起……"</li>
        <li class="leading-relaxed">"XX，记得那天吗？我们……"</li>
        <li class="leading-relaxed">"XX，最近我一直在想，如果没有你……"</li>
      </ul>
      
      <p class="leading-relaxed mb-5">然后，跟随你的思绪，把你想说的话，全部写下来。</p>
      
      <p class="leading-relaxed mb-5">不要害怕展示你的弱点。<em class="font-semibold text-primary">真实的情感表达</em>，总是伴随着弱点。而弱点，正是最能触动人心的力量。</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">克服写作障碍：技巧和工具</h3>
      
      <p class="leading-relaxed mb-5"><em class="font-semibold text-primary">难以表达你的感受</em>？你并不孤独。很多人都发现<em class="font-semibold text-primary">写情感信件很难</em>。</p>
      
      <p class="leading-relaxed mb-5">如果你仍然感到无从下手，或者想让你的<em class="font-semibold text-primary">信件</em>更加美丽，也许可以尝试<a href="https://www.behindmemory.com" class="text-primary hover:underline">Behindmemory.com</a>。</p>
      
      <p class="leading-relaxed mb-5">Behindmemory不是一个简单的<em class="font-semibold text-primary">AI写作工具</em>。它更像一个朋友，一个向导。它可以帮助你看到照片中的情感线索，给你<em class="font-semibold text-primary">写作灵感</em>和建议。更重要的是，它可以利用你的真实故事，制作一封充满<em class="font-semibold text-primary">你的</em>风格，<em class="font-semibold text-primary">你的</em>温度的信件。这封信，不仅仅是冰冷的文字拼凑，而是你内心感受的真实流露。它帮助你创造一份真正<em class="font-semibold text-primary">个性化的礼物</em>。它是辅助你进行<em class="font-semibold text-primary">个人写作</em>的强大工具。</p>
      
      <h3 class="text-xl font-bold mt-8 mb-4">寄出你的信：形式并不重要</h3>
      
      <p class="leading-relaxed mb-5">写完信后，你可以选择打印出来，放入信封，贴上邮票，寄出去。或者可以选择复制到电子邮件中，发送给他们。甚至，你可以直接面对面地朗读信的内容给他们听。</p>
      
      <p class="leading-relaxed mb-5">形式不重要。重要的是，你通过<em class="font-semibold text-primary">写信</em>这种方式，向你爱的人，传达你的心意。</p>
      
      <h2 class="text-2xl font-bold mt-10 mb-6">结论：文字的力量</h2>
      
      <p class="leading-relaxed mb-5">在这个快节奏的时代，<em class="font-semibold text-primary">写信</em>，也许显得有点"老派"，有点"过时"。但，正是这种"老派"和"过时"，使它更加珍贵。因为，它意味着一种放慢脚步的态度，一种真实的态度，一种对你爱的人，最深切的关怀。</p>
      
      <p class="leading-relaxed mb-5">所以，拿起笔，或者打开电脑，给那些你爱的人，<em class="font-semibold text-primary">写一封信</em>吧。即使笨拙，即使粗糙，但如果是真实的，一定能触动人心。因为，最珍贵的东西，总是带着一点笨拙的痕迹。像爱一样。像真心一样。像你即将写的那封信一样。</p>
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
    const description = "Struggling to express your feelings? Learn how to write a heartfelt letter to someone you love, even if words are hard to find. Discover tips, tools, and how to use your photos to inspire your writing."
    const imageUrl = "https://behindmemory.com/images/blog/heartfelt-letter.jpg"
    const hashtags = "BehindMemory,HeartfeltLetter,WritingTips"
    
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
          text: "Struggling to express your feelings? Learn how to write a heartfelt letter to someone you love, even if words are hard to find. Discover tips, tools, and how to use your photos to inspire your writing.",
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
              src="/images/blog/heartfelt-letter.jpg" 
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
                "image": "https://behindmemory.com/images/blog/heartfelt-letter.jpg",
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
                  "@id": "https://behindmemory.com/blog/how-to-write-heartfelt-letter-even-not-writer"
                },
                "keywords": "write a letter, heartfelt letter, love letter, express feelings, emotional expression, photo memories, letter writing, meaningful letter, personalized gift, personal writing",
                "description": "Struggling to express your feelings? Learn how to write a heartfelt letter to someone you love, even if words are hard to find. Discover tips, tools, and how to use your photos to inspire your writing."
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