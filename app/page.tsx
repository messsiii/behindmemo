'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// 为Vimeo Player声明类型
declare global {
  interface Window {
    Vimeo?: {
      Player: any;
    };
  }
}

export default function Home() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const variant = searchParams?.get('variant') || 'default'
  
  const [mounted, setMounted] = useState(false)
  const [_scrollY, setScrollY] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const playerRef = useRef<any>(null)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    // 确保页面加载时滚动到顶部
    window.scrollTo(0, 0)

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 加载Vimeo播放器脚本
  useEffect(() => {
    if (mounted) {
      // 动态加载Vimeo Player SDK
      const script = document.createElement('script')
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      script.onload = () => {
        // 脚本加载完成后初始化播放器
        const iframe = document.querySelector('iframe.vimeo-player')
        if (iframe && window.Vimeo) {
          const vimeoPlayer = new window.Vimeo.Player(iframe)
          playerRef.current = vimeoPlayer
          
          // 监听播放状态
          vimeoPlayer.on('play', () => {
            setIsLoading(true) // 开始加载
          })
          
          vimeoPlayer.on('playing', () => {
            setIsPlaying(true)
            setIsLoading(false) // 实际开始播放
            // 确保视频不是静音的
            vimeoPlayer.getVolume().then((volume: number) => {
              if (volume === 0) {
                vimeoPlayer.setVolume(1.0)
              }
            })
          })
          
          vimeoPlayer.on('pause', () => {
            setIsPlaying(false)
            setIsLoading(false)
          })
          
          vimeoPlayer.on('ended', () => {
            setIsPlaying(false)
            setIsLoading(false)
          })
        }
      }
      
      document.body.appendChild(script)
      
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [mounted])

  // 控制视频播放和暂停
  const togglePlayback = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause()
      } else {
        setIsLoading(true) // 点击播放按钮时设置加载状态
        // 确保声音开启
        playerRef.current.setVolume(1.0).then(() => {
          playerRef.current.play().catch(() => {
            setIsLoading(false) // 播放失败时重置加载状态
          })
        }).catch(() => {
          playerRef.current.play().catch(() => {
            setIsLoading(false)
          })
        })
      }
    }
  }

  // 确保组件挂载后页面滚动到顶部
  useEffect(() => {
    if (mounted) {
      window.scrollTo(0, 0)
    }
  }, [mounted])

  // 在客户端渲染前返回一个占位内容
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
        <Nav />
        <div className="relative z-10 flex-1">
          <section className="relative h-screen flex items-center justify-center">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <div className="h-12 w-3/4 mx-auto bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-1/2 mx-auto bg-gray-200 animate-pulse rounded" />
                <div className="h-24 w-2/3 mx-auto bg-gray-200 animate-pulse rounded" />
                <div className="h-12 w-48 mx-auto bg-gray-200 animate-pulse rounded-full" />
              </div>
            </div>
          </section>
        </div>
        <Footer />
      </div>
    )
  }

  // 不同变体的内容定义
  const contentVariants = {
    // 默认版本
    default: {
      en: {
        hero: {
          title: 'Turn Photos into Letters, Memories into Words',
          subtitle:
            'Not just another AI writer - we help you express your true feelings to the ones you love',
          description:
            "Unlike traditional AI writers, we don't generate generic letters. We help you find your own words, turn your photos into inspiration, and guide you through emotional expression.",
          cta: 'Start Writing',
        },
        videoCard: {
          title: 'See How It Works',
          description: 'Watch how Behind Memo helps you create heartfelt letters from your cherished photos.',
          buttonText: 'Try It Now'
        },
        cta: {
          title: 'Ready to express your true feelings?',
          description:
            '✓ No generic letters\n✓ Your own words, your story\n✓ Photos as inspiration\n✓ Guided emotional expression',
          button: 'Begin Your Journey',
        },
      },
      zh: {
        hero: {
          title: '照片化为文字，回忆成就情书',
          subtitle: '不只是AI写作 - 我们帮你向爱的人表达真挚情感',
          description:
            '不同于传统AI写作，我们不生成模板化的内容。我们帮你找到自己的语言，将照片转化为灵感，引导你表达真实情感。',
          cta: '开始写作',
        },
        videoCard: {
          title: '了解我们如何工作',
          description: '观看Behind Memo如何帮助您从珍贵照片创建充满感情的信件。',
          buttonText: '立即体验'
        },
        cta: {
          title: '准备好表达真挚情感了吗？',
          description: '✓ 告别模板化内容\n✓ 你的文字，你的故事\n✓ 照片化作灵感\n✓ 情感表达引导',
          button: '开启心动之旅',
        },
      },
    },
    
    // 爱情版本
    love: {
      en: {
        hero: {
          title: 'Turn Your Love Story into Beautiful Words',
          subtitle: 'Create heartfelt love letters inspired by your special moments together',
          description: 'Our AI helps you express deep emotions by analyzing your photos and guiding you through creating personalized love letters that truly capture your feelings.',
          cta: 'Write a Love Letter',
        },
        videoCard: {
          title: 'See How It Works',
          description: 'Watch how Behind Memo helps you create meaningful love letters from your cherished photos.',
          buttonText: 'Try It Now'
        },
        cta: {
          title: 'Ready to express your love?',
          description: '✓ Personalized love letters\n✓ Photo-inspired writing\n✓ Emotional expression guide\n✓ Beautiful templates',
          button: 'Start Your Love Letter',
        },
      },
      zh: {
        hero: {
          title: '将你们的爱情故事化为美丽文字',
          subtitle: '基于你们的甜蜜瞬间，创造充满真情的爱情信件',
          description: '我们的AI通过分析你的照片和引导你表达深刻情感，帮助你创作真正能够表达心意的个性化情书。',
          cta: '写一封情书',
        },
        videoCard: {
          title: '了解我们如何工作',
          description: '观看Behind Memo如何帮助您从珍贵照片创建充满爱意的信件。',
          buttonText: '立即体验'
        },
        cta: {
          title: '准备好表达你的爱意了吗？',
          description: '✓ 个性化情书\n✓ 照片激发灵感\n✓ 情感表达指南\n✓ 精美模板',
          button: '开始你的情书',
        },
      },
    },
    
    // 友情版本
    friendship: {
      en: {
        hero: {
          title: 'Turn Friendship Memories into Heartfelt Words',
          subtitle: 'Create meaningful messages for the friends who shaped your life',
          description: 'Express your gratitude and appreciation to friends through personalized letters inspired by your shared memories and photos.',
          cta: 'Write to a Friend',
        },
        videoCard: {
          title: 'See How It Works',
          description: 'Watch how Behind Memo helps you create meaningful messages from your friendship photos.',
          buttonText: 'Try It Now'
        },
        cta: {
          title: 'Ready to thank your friends?',
          description: '✓ Friendship appreciation letters\n✓ Memories into words\n✓ Photo-based inspiration\n✓ Express gratitude easily',
          button: 'Start Your Message',
        },
      },
      zh: {
        hero: {
          title: '将友情回忆化为温暖文字',
          subtitle: '为那些陪伴你成长的朋友创作真挚的话语',
          description: '通过基于共同回忆和照片的个性化信件，向朋友表达你的感激和欣赏。',
          cta: '写给朋友',
        },
        videoCard: {
          title: '了解我们如何工作',
          description: '观看Behind Memo如何帮助您从友谊照片创建有意义的信件。',
          buttonText: '立即体验'
        },
        cta: {
          title: '准备好感谢你的朋友了吗？',
          description: '✓ 友情感谢信\n✓ 回忆变成文字\n✓ 照片激发灵感\n✓ 轻松表达感激',
          button: '开始你的信件',
        },
      },
    },
    
    // 家庭版本
    family: {
      en: {
        hero: {
          title: 'Turn Family Moments into Treasured Letters',
          subtitle: 'Create meaningful messages for your loved ones based on family memories',
          description: 'Express your love and gratitude to family members through personalized letters inspired by your shared moments and photos.',
          cta: 'Write to Family',
        },
        videoCard: {
          title: 'See How It Works',
          description: 'Watch how Behind Memo helps you create meaningful family letters from your precious photos.',
          buttonText: 'Try It Now'
        },
        cta: {
          title: 'Ready to express family love?',
          description: '✓ Family appreciation letters\n✓ Preserve family stories\n✓ Photo-inspired writing\n✓ Heartfelt expressions',
          button: 'Start Your Family Letter',
        },
      },
      zh: {
        hero: {
          title: '将家庭瞬间化为珍贵信件',
          subtitle: '基于家庭回忆，为亲人创作有意义的信息',
          description: '通过基于共同时刻和照片的个性化信件，向家人表达你的爱和感激。',
          cta: '写给家人',
        },
        videoCard: {
          title: '了解我们如何工作',
          description: '观看Behind Memo如何帮助您从珍贵的家庭照片创建有意义的信件。',
          buttonText: '立即体验'
        },
        cta: {
          title: '准备好表达家庭之爱了吗？',
          description: '✓ 家庭感谢信\n✓ 保存家庭故事\n✓ 照片激发灵感\n✓ 真挚情感表达',
          button: '开始家庭信件',
        },
      },
    },
  }

  // 根据 variant 参数选择对应内容，如果不存在则使用默认内容
  const content = contentVariants[variant as keyof typeof contentVariants] || contentVariants.default
  
  // 页面渐变背景可以根据不同的变体使用不同的配色
  const getBackgroundStyle = () => {
    switch(variant) {
      case 'love':
        return {
          backgroundImage: `
            linear-gradient(135deg, 
              #d88193 0%,
              #e6a6b9 20%,
              #ecc6d0 40%,
              #f7e6e9 60%,
              #e9bec9 80%,
              #d5889c 100%
            )
          `,
          opacity: 0.3,
        };
      case 'friendship':
        return {
          backgroundImage: `
            linear-gradient(135deg, 
              #78a9d1 0%,
              #a3c9e3 20%,
              #cce0ef 40%,
              #e5eff7 60%,
              #c1d9eb 80%,
              #8bade0 100%
            )
          `,
          opacity: 0.3,
        };
      case 'family':
        return {
          backgroundImage: `
            linear-gradient(135deg, 
              #7aad8c 0%,
              #a1c9af 20%,
              #cce4d5 40%,
              #e5f4eb 60%,
              #bfdcca 80%,
              #8dc09e 100%
            )
          `,
          opacity: 0.3,
        };
      default:
        return {
          backgroundImage: `
            linear-gradient(135deg, 
              #738fbd 0%,
              #a8c3d4 20%,
              #dbd6df 40%,
              #ecc6c7 60%,
              #db88a4 80%,
              #cc8eb1 100%
            )
          `,
          opacity: 0.3,
        };
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="fixed inset-0 z-0"
        style={getBackgroundStyle()}
      />

      <Nav />

      <div className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] md:h-screen flex items-start md:items-center justify-start md:justify-center overflow-hidden">
          <div className="container mx-auto px-8 sm:px-4 pt-16 md:pt-0 md:-mt-16 mt-20 sm:mt-24">
            <div className="max-w-6xl mx-auto md:text-center text-left">
              <motion.h1
                className={`font-bold mb-3 md:mb-6 text-gray-900 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {language === 'en' ? (
                  <span className="block">
                    <span className="md:hidden">
                      <span className="block text-[50px] sm:text-[60px] leading-[1.1] tracking-tight">
                        Turn <span className="inline-block bg-gradient-to-r from-[#5d7cad] to-[#a971a1] text-transparent bg-clip-text">photos</span>
                      </span>
                      <span className="block text-[50px] sm:text-[60px] leading-[1.1] tracking-tight">
                        into <span className="inline-block bg-gradient-to-r from-[#a971a1] to-[#cc8eb1] text-transparent bg-clip-text">letters</span>
                      </span>
                    </span>
                    <span className="hidden md:block text-5xl sm:text-7xl">{content[language].hero.title}</span>
                  </span>
                ) : (
                  <span className="text-5xl sm:text-7xl">{content[language].hero.title}</span>
                )}
              </motion.h1>
              <motion.p
                className={`mb-8 md:mb-8 text-gray-700 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {language === 'en' ? (
                  <span className="block">
                    <span className="md:hidden text-[18px] sm:text-[24px] leading-[1.3]">
                      <span className="block mb-1">Not just another AI writer.</span>
                      <span className="block">Your memories, your words.</span>
                    </span>
                    <span className="hidden md:block text-2xl sm:text-3xl bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent">{content[language].hero.subtitle}</span>
                  </span>
                ) : (
                  <span className="text-base sm:text-xl md:text-2xl lg:text-3xl bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent">{content[language].hero.subtitle}</span>
                )}
              </motion.p>
              <motion.p
                className={`text-lg text-gray-600 mb-8 max-w-2xl mx-auto md:mx-auto ml-0 ${language === 'en' ? 'font-literary md:block hidden' : ''}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                {content[language].hero.description}
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="md:text-center text-left mb-12 md:mb-0"
              >
                <Button
                  className="rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-10 md:px-12 py-6 md:py-7 text-xl md:text-2xl font-medium"
                  asChild
                >
                  <Link href="/write">
                    {content[language].hero.cta}
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-4 md:bottom-28 left-1/2 transform -translate-x-1/2">
            <motion.div
              animate={{
                y: [0, 10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'reverse',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[#738fbd]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.div>
          </div>
        </section>

        {/* Video Section */}
        <section className="py-16 md:py-24 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center mb-6 md:mb-8">
              <motion.h2
                className={`text-2xl md:text-4xl font-bold mb-3 md:mb-4 ${language === "en" ? "font-serif" : "font-serif-zh"}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {language === "en" ? "How It Works" : "使用指南"}
              </motion.h2>
              <motion.p
                className={`text-base md:text-xl text-gray-700 max-w-3xl mx-auto ${language === "en" ? "font-serif" : "font-serif-zh"}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {language === "en"
                  ? "Watch our tutorial to see how Behind Memo helps you express your feelings"
                  : "观看我们的教程，了解 Behind Memo 如何帮助您表达情感"}
              </motion.p>
            </div>

            <motion.div
              className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-xl md:shadow-2xl max-w-4xl mx-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src="https://player.vimeo.com/video/1065944553?autoplay=0&amp;loop=0&amp;title=0&amp;byline=0&amp;portrait=0&amp;sidedock=0&amp;controls=0&amp;color=738fbd&amp;dnt=1&amp;transparent=0&amp;muted=0"
                  frameBorder="0" 
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  className="w-full h-full vimeo-player"
                  title="Three steps to transforming your memories into heartfelt letters."
                ></iframe>
                
                {/* 视频覆盖层 - 用于点击播放/暂停 */}
                <div 
                  className="absolute inset-0 z-10 cursor-pointer" 
                  onClick={togglePlayback}
                />
                
                {/* 加载指示器 - 仅在加载时显示 */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/10 backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-[#738fbd] animate-spin"></div>
                  </div>
                )}
                
                {/* 自定义播放按钮 - 仅在视频未播放且不在加载状态时显示 */}
                {!isPlaying && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer" 
                    onClick={togglePlayback}
                  >
                    <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/90 transition-all duration-300 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-[#738fbd] ml-1">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#738fbd]/20 to-[#cc8eb1]/20 pointer-events-none rounded-xl md:rounded-2xl"></div>
            </motion.div>

            <motion.div
              className="mt-4 md:mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Button
                className="rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-6 py-3 md:px-8 md:py-4 text-base md:text-lg"
                asChild
              >
                <Link href="/write">{language === "en" ? "Try It Now" : "立即尝试"}</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-8 max-w-3xl mx-auto">
              <h2
                className={`text-4xl font-bold leading-tight text-gray-900 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
              >
                {content[language].cta.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                {content[language].cta.description.split('\n').map((point, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 bg-white/50 backdrop-blur-sm p-4 rounded-lg"
                  >
                    <span className="text-primary font-bold">{point.split(' ')[0]}</span>
                    <span className="text-gray-700">{point.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className={`rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-8 py-6 text-lg mt-8 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
                asChild
              >
                <Link href="/write">
                  {content[language].cta.button}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
