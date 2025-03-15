'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, CalendarIcon, Clock, Facebook, Linkedin, Share2, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa'

const articleData = {
  title: 'How to Write a Heartfelt Letter to Someone You Love (Even If You\'re Not a Writer)',
  date: '2025-03-12',
  readTime: '7 min',
  content: {
    en: `
      <div class="blog-content">
      <p>In this instant communication age, how long time you no pick up pen and <em class="highlight">write a letter</em>? Or, even on keyboard, type a long, serious email? We get used to use emojis instead of thousand words, use "likes" instead of looking at them with deep feeling, use group messages instead of one-on-one real talk. So, "<em class="highlight">write a letter</em>" this thing, seem become more and more far, more and more strange.</p>
      
      <h2>The Lost Art of Letter Writing (and Why It Still Matters)</h2>
      
      <p>But, you know? More fast the times is, more we need slow down power. More noisy the world is, more we need quiet corner. <em class="highlight">Writing a letter</em>, is this kind of power, this kind corner. It let you slow, let you quiet, to think, to feel, to face your inside deep heart, those real <em class="highlight">feelings for people you love</em>.</p>
      
      <p>It forces you to connect, not just communicate. To truly <em class="highlight">express your feelings</em>, not just send information. This is especially important when trying to write a <em class="highlight">love letter</em> or a <em class="highlight">letter to a loved one</em>.</p>
      
      <h2>How to <em class="highlight">Write a Letter</em> to Those Who Matter</h2>
      
      <p>So, how to <em class="highlight">write a letter</em> to those you love – family, lover, or friend?</p>
      
      <h3>Finding Your Inspiration: Memories and Photos</h3>
      
      <p>Don't scare by "I not good at write." <em class="highlight">Write letter</em>, not literature creation, no need fancy words, no need super skills. It need, only real. And real, always hide in those normal memories.</p>
      
      <p>Where to start? Open your phone photo album. There, must have many many photos, record you and <em class="highlight">people you love's</em> little moments. Maybe a trip, a dinner together, a birthday, even just a normal weekend afternoon. These <em class="highlight">photo memories</em> are a goldmine for <em class="highlight">letter writing</em> inspiration.</p>
      
      <p>Choose one photo. One photo that make you feel something. It no need be "perfect," even no need be very "clear." Only it can wake up some feeling deep in your heart – happy, moved, miss them, thankful… anything is ok. This photo, is your letter's "anchor point." This is key for writing a <em class="highlight">meaningful letter</em>.</p>
      
      <h3>Rebuilding the Scene: The Power of Details</h3>
      
      <p>How do you start <em class="highlight">expressing love in writing</em>? Start with the details.</p>
      
      <p>Look at this photo, close your eyes, take deep breath. Try remember the time when photo was take:</p>
      
      <ul>
        <li>What time was it? Where?</li>
        <li>What sound around? What smell?</li>
        <li>What you doing? What you talking?</li>
        <li>How you feel that time?</li>
        <li>The other person's face, action, you still remember?</li>
      </ul>
      
      <p>Don't try remember all detail at one time. Little by little. Like puzzle, slowly put those memory fragment, make a whole picture.</p>
      
      <p>Detail, is letter's soul. More specific the detail, more can touch people's heart. Because in detail, hide real feeling. This is how you write a <em class="highlight">heartfelt letter</em>.</p>
      
      <h3>Honest "Heart Voice": Don't Be Afraid of Vulnerability</h3>
      
      <p>Now, you can start write.</p>
      
      <p><em class="highlight">Don't know what to write in a letter</em>? Don't think "write good or not good," don't worry "too cheesy or not." The scene you remember, the feeling you have inside, use most simple words write down.</p>
      
      <p>Can start like this:</p>
      
      <ul>
        <li>"Dear XX, see this photo, I remember…"</li>
        <li>"XX, remember that day? We…"</li>
        <li>"XX, recent I always thinking, if no you…"</li>
      </ul>
      
      <p>Then, follow your thinking, the words you want say, all write down.</p>
      
      <p>Don't scare show your weakness. <em class="highlight">Real emotional expression</em>, always with weakness. And weakness, is most can touch people heart's power.</p>
      
      <h3>Overcoming Writer's Block: Tips and Tools</h3>
      
      <p><em class="highlight">Struggling to express your feelings</em>? You are not alone. Many people find it <em class="highlight">hard to write emotional letters.</em></p>
      
      <p>If you still feel no where to start, or want make your <em class="highlight">letter</em> more beautiful, maybe try <a href="https://www.behindmemory.com">Behindmemory.com</a>.</p>
      
      <p>Behindmemory not a simple <em class="highlight">AI writing tool</em>. It more like a friend, a guide. It can help you look at photo's feeling clues, give you <em class="highlight">write inspiration</em> and advice. More important, it can use your real story, make a letter full of <em class="highlight">your</em> style, <em class="highlight">your</em> warm. This letter, not just cold words put together, is your inside heart feeling's real flow. It helps you create a truly <em class="highlight">personalized gift</em>. It is a powerful tool to assist you in <em class="highlight">personal writing</em>.</p>
      
      <h3>Sending Your Letter: The Form Doesn't Matter</h3>
      
      <p>After write letter, you can choose print it out, put in envelope, put on stamp, send. Or can choose copy to email, send to them. Even, you can just read the letter content, to them face to face.</p>
      
      <p>Form not important. Important is, you use <em class="highlight">write letter</em> this way, to people you love, send your heart meaning.</p>
      
      <h2>Conclusion: The Power of the Written Word</h2>
      
      <p>In this fast time, <em class="highlight">write letter</em>, maybe seem a little "old," a little "out of date." But, is this "old" and "out of date," make it more precious. Because, it mean a slow down manner, a real attitude, a to people you love, most deep care.</p>
      
      <p>So, pick up pen, or open computer, to those you love, <em class="highlight">write a letter</em>. Even clumsy, even rough, but if it is real, must can touch heart. Because, most precious things, always with a little clumsy mark. Like love. Like true heart. Like the letter you about to write.</p>
      </div>
    `,
    zh: `
      <div class="blog-content">
      <p>在这个即时通讯的时代，你有多久没有拿起笔来<em class="highlight">写一封信</em>了？或者，即使在键盘上，打出一封长长的、认真的电子邮件？我们习惯用表情符号代替千言万语，用"点赞"代替深情凝视，用群发消息代替一对一的真实交流。所以，"<em class="highlight">写信</em>"这件事，似乎变得越来越遥远，越来越陌生。</p>
      
      <h2>书信写作的失落艺术（以及为什么它仍然重要）</h2>
      
      <p>但是，你知道吗？时代越快，我们越需要减速的力量。世界越嘈杂，我们越需要安静的角落。<em class="highlight">写信</em>，就是这样一种力量，这样一个角落。它让你放慢脚步，让你安静下来，去思考，去感受，去面对你内心深处对<em class="highlight">所爱之人的感受</em>。</p>
      
      <p>它迫使你连接，而不仅仅是交流。真正地<em class="highlight">表达你的感受</em>，而不仅仅是发送信息。这在尝试写一封<em class="highlight">情书</em>或给<em class="highlight">所爱之人的信</em>时尤为重要。</p>
      
      <h2>如何给那些重要的人<em class="highlight">写信</em></h2>
      
      <p>那么，如何给你所爱的人——家人、爱人或朋友<em class="highlight">写信</em>呢？</p>
      
      <h3>寻找灵感：回忆和照片</h3>
      
      <p>不要因为"我不擅长写作"而害怕。<em class="highlight">写信</em>，不是文学创作，不需要华丽的词藻，不需要超凡的技巧。它需要的，只是真实。而真实，总是藏在那些普通的回忆中。</p>
      
      <p>从哪里开始？打开你的手机相册。那里，一定有很多很多照片，记录着你和<em class="highlight">你爱的人</em>的点点滴滴。也许是一次旅行，一顿共进的晚餐，一个生日，甚至只是一个普通的周末下午。这些<em class="highlight">照片记忆</em>是<em class="highlight">写信</em>灵感的金矿。</p>
      
      <p>选择一张照片。一张能让你感受到什么的照片。它不需要"完美"，甚至不需要很"清晰"。只要它能唤醒你内心深处的某种感觉——快乐、感动、想念、感激……什么都行。这张照片，就是你信件的"锚点"。这是写一封<em class="highlight">有意义的信</em>的关键。</p>
      
      <h3>重建场景：细节的力量</h3>
      
      <p>如何开始<em class="highlight">在写作中表达爱</em>？从细节开始。</p>
      
      <p>看着这张照片，闭上眼睛，深呼吸。试着回忆照片拍摄时的情景：</p>
      
      <ul>
        <li>那是什么时候？在哪里？</li>
        <li>周围有什么声音？什么气味？</li>
        <li>你在做什么？在说什么？</li>
        <li>那时你的感受如何？</li>
        <li>对方的表情、动作，你还记得吗？</li>
      </ul>
      
      <p>不要试图一次记住所有细节。慢慢来。像拼图一样，慢慢把那些记忆碎片拼凑起来，组成一幅完整的画面。</p>
      
      <p>细节，是信件的灵魂。细节越具体，越能触动人心。因为在细节中，藏着真实的感受。这就是如何写一封<em class="highlight">走心的信</em>。</p>
      
      <h3>真实的"心声"：不要害怕脆弱</h3>
      
      <p>现在，你可以开始写了。</p>
      
      <p><em class="highlight">不知道信中该写什么</em>？不要想"写得好不好"，不要担心"太肉麻不肉麻"。你记得的场景，你内心的感受，用最简单的词语写下来就好。</p>
      
      <p>可以这样开始：</p>
      
      <ul>
        <li>"亲爱的XX，看到这张照片，我想起……"</li>
        <li>"XX，记得那天吗？我们……"</li>
        <li>"XX，最近我一直在想，如果没有你……"</li>
      </ul>
      
      <p>然后，跟随你的思绪，把你想说的话，全部写下来。</p>
      
      <p>不要害怕展示你的弱点。<em class="highlight">真实的情感表达</em>，总是伴随着弱点。而弱点，正是最能触动人心的力量。</p>
      
      <h3>克服写作障碍：技巧和工具</h3>
      
      <p><em class="highlight">难以表达你的感受</em>？你并不孤独。很多人都发现<em class="highlight">写情感信件很难</em>。</p>
      
      <p>如果你仍然感到无从下手，或者想让你的<em class="highlight">信件</em>更加美丽，也许可以尝试<a href="https://www.behindmemory.com" class="text-primary hover:underline">Behindmemory.com</a>。</p>
      
      <p>Behindmemory不是一个简单的<em class="highlight">AI写作工具</em>。它更像一个朋友，一个向导。它可以帮助你看到照片中的情感线索，给你<em class="highlight">写作灵感</em>和建议。更重要的是，它可以利用你的真实故事，制作一封充满<em class="highlight">你的</em>风格，<em class="highlight">你的</em>温度的信件。这封信，不仅仅是冰冷的文字拼凑，而是你内心感受的真实流露。它帮助你创造一份真正<em class="highlight">个性化的礼物</em>。它是辅助你进行<em class="highlight">个人写作</em>的强大工具。</p>
      
      <h3>寄出你的信：形式并不重要</h3>
      
      <p>写完信后，你可以选择打印出来，放入信封，贴上邮票，寄出去。或者可以选择复制到电子邮件中，发送给他们。甚至，你可以直接面对面地朗读信的内容给他们听。</p>
      
      <p>形式不重要。重要的是，你通过<em class="highlight">写信</em>这种方式，向你爱的人，传达你的心意。</p>
      
      <h2>结论：文字的力量</h2>
      
      <p>在这个快节奏的时代，<em class="highlight">写信</em>，也许显得有点"老派"，有点"过时"。但，正是这种"老派"和"过时"，使它更加珍贵。因为，它意味着一种放慢脚步的态度，一种真实的态度，一种对你爱的人，最深切的关怀。</p>
      
      <p>所以，拿起笔，或者打开电脑，给那些你爱的人，<em class="highlight">写一封信</em>吧。即使笨拙，即使粗糙，但如果是真实的，一定能触动人心。因为，最珍贵的东西，总是带着一点笨拙的痕迹。像爱一样。像真心一样。像你即将写的那封信一样。</p>
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
      setPageUrl(window.location.href)
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
          text: "Struggling to express your feelings? Learn how to write a heartfelt letter to someone you love, even if words are hard to find.",
          url: pageUrl,
        })
      } catch (error) {
        console.error('分享失败:', error)
      }
    } else {
      // 如果不支持原生分享，显示更多分享选项
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
          
          {/* 文章内容 */}
          <div 
            dangerouslySetInnerHTML={{ 
              __html: language === 'en' ? articleData.content.en : articleData.content.zh 
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