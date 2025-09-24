'use client'

export const dynamic = 'force-dynamic'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { SimpleImageUpload } from '@/components/SimpleImageUpload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, Suspense } from 'react'

// 为Vimeo Player声明类型
declare global {
  interface Window {
    Vimeo?: {
      Player: any
    }
  }
}

// 为内容变体定义类型接口
interface BaseHeroContent {
  title: string
  subtitle: string
  description: string
  cta: string
}

interface TypewriterHeroContent extends BaseHeroContent {
  titlePrefix: string
  titleTypewriter: string[]
  titleSuffix: string
}

interface SectionContent {
  title: string
  description: string
  buttonText: string
}

interface CTAContent {
  title: string
  description: string
  button: string
}

interface ToolsContent {
  title: string
  subtitle: string
  tools: {
    name: string
    description: string
    credits: number
    href: string
    badge?: string
  }[]
}

interface ContentVariant {
  hero: BaseHeroContent | TypewriterHeroContent
  videoCard: SectionContent
  tools: ToolsContent
  cta: CTAContent
}

// 将这个接口标记为导出，这样TypeScript会认为它被用于其他文件中
export interface ContentLanguages {
  en: ContentVariant
  zh: ContentVariant
}

function HomeContent() {
  const { language } = useLanguage()
  const { status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const variant = searchParams?.get('variant') || 'default'

  const [mounted, setMounted] = useState(false)
  const [_scrollY, setScrollY] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const playerRef = useRef<any>(null)

  // 为表单添加新状态
  const [formData, setFormData] = useState({
    name: '',
    loverName: '',
    story: '',
    photo: null as File | null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({
    name: false,
    loverName: false,
    story: false,
    photo: false,
  })

  const router = useRouter()

  // 表单处理函数
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // 更新表单数据
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // 如果该字段有错误且现在有值了，清除错误状态
    if (fieldErrors[name as keyof typeof fieldErrors] && value) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: false,
      }))
    }
  }

  // 处理图片选择，同时清除错误状态
  const handleImageSelected = useCallback(
    (file: File) => {
      setFormData(prev => ({ ...prev, photo: file }))

      // 清除图片字段的错误状态
      if (fieldErrors.photo) {
        setFieldErrors(prev => ({
          ...prev,
          photo: false,
        }))
      }
    },
    [fieldErrors.photo]
  )

  // 表单验证函数
  const validateForm = () => {
    const errors: Record<string, boolean> = {
      name: !formData.name,
      loverName: !formData.loverName,
      story: !formData.story,
      photo: !formData.photo,
    }

    setFieldErrors(errors)

    // 返回表单是否有效
    const isValid = !Object.values(errors).some(error => error)

    // 如果表单无效，使用震动动画
    if (!isValid) {
      // 获取所有需要震动的输入元素
      const errorFields = Object.entries(errors)
        .filter(([_, hasError]) => hasError)
        .map(([fieldName]) => {
          if (fieldName === 'photo') {
            return document.querySelector('.simple-image-upload') // 确保图片上传组件有这个类名
          } else {
            return document.querySelector(`[name="${fieldName}"]`)
          }
        })
        .filter(el => el !== null) // 过滤掉可能找不到的元素

      // 为所有错误字段添加震动动画
      errorFields.forEach(field => {
        if (field) {
          field.classList.add('animate-shake')
          setTimeout(() => {
            field.classList.remove('animate-shake')
          }, 500)
        }
      })
    }

    return isValid
  }

  // 更新提交处理函数
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    // 表单验证
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(language === 'en' ? 'Preparing submission...' : '准备提交...')

    try {
      // 第一步：上传照片
      setSubmitStatus(language === 'en' ? 'Uploading photo...' : '上传照片中...')
      const uploadFormData = new FormData()
      if (formData.photo) {
        uploadFormData.append('file', formData.photo)
      }

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        // 获取详细的错误信息
        let errorMessage
        try {
          const errorData = await uploadResponse.json()
          errorMessage = errorData.error || 'Photo upload failed'
        } catch (e) {
          // 如果无法解析JSON，使用HTTP状态和状态文本
          errorMessage = `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
        }

        // 根据状态码提供更具体的错误信息
        if (uploadResponse.status === 413) {
          throw new Error(
            language === 'en' ? 'Image file size is too large' : '图片文件大小超出限制'
          )
        } else if (uploadResponse.status === 415) {
          throw new Error(
            language === 'en'
              ? 'Unsupported image format. Please try JPG or PNG'
              : '不支持的图片格式，请使用JPG或PNG格式'
          )
        } else {
          throw new Error(errorMessage)
        }
      }

      const uploadData = await uploadResponse.json()
      const { url: imageUrl, metadata: imageMetadata } = uploadData

      if (!imageUrl) {
        throw new Error(language === 'en' ? 'Failed to process image' : '图片处理失败')
      }

      // 区分已登录用户和未登录用户
      let generateEndpoint = '/api/anonymous/generate-letter'
      let generateData

      // 生成请求ID - 对标准API是必需的
      const requestId = `req_${Math.random().toString(36).substring(2, 15)}`

      // 使用会话状态检查用户是否已登录
      if (sessionStatus === 'authenticated') {
        // 已登录用户走标准信件生成流程
        console.log('使用标准信件生成API (已登录用户)')
        generateEndpoint = '/api/generate-letter'
        setSubmitStatus(language === 'en' ? 'Creating letter...' : '创建信件中...')

        // 发送生成请求（不等待内容生成完成）
        const generateResponse = await fetch(generateEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
          body: JSON.stringify({
            name: formData.name,
            loverName: formData.loverName,
            story: formData.story,
            blobUrl: imageUrl,
            metadata: {
              ...imageMetadata,
              name: formData.name,
              loverName: formData.loverName,
              language: language,
            },
          }),
        })

        // 处理可能的错误
        if (!generateResponse.ok) {
          await handleErrorResponse(generateResponse)
          return
        }

        // 获取信件ID并跳转到结果页
        generateData = await generateResponse.json()

        if (generateData.success && generateData.letterId) {
          console.log('Letter created successfully, redirecting to result page...')
          setSubmitStatus(language === 'en' ? 'Success! Redirecting...' : '成功！正在跳转...')
          router.push(`/result/${generateData.letterId}`)
        } else {
          throw new Error(language === 'en' ? 'Invalid response data' : '服务器返回异常数据')
        }
      } else {
        // 未登录用户走匿名信件生成流程
        console.log('使用匿名信件生成API (未登录用户)')
        setSubmitStatus(language === 'en' ? 'Creating letter...' : '创建信件中...')

        // 发送生成请求（不等待内容生成完成）
        const generateResponse = await fetch(generateEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            loverName: formData.loverName,
            story: formData.story,
            blobUrl: imageUrl,
            metadata: {
              ...imageMetadata,
              name: formData.name,
              loverName: formData.loverName,
              language: language,
            },
          }),
        })

        // 立即检查状态码，处理常见错误
        if (generateResponse.status === 429) {
          console.warn('Rate limit exceeded, showing user notification')
          toast({
            title: language === 'en' ? 'Rate limit exceeded' : '请求次数已达上限',
            description:
              language === 'en'
                ? 'You have reached the maximum number of requests for today. Please try again tomorrow or log in to continue.'
                : '您今天的请求次数已达上限，请明天再试或登录账号继续使用。',
            variant: 'destructive',
            duration: 10000,
          })
          setIsSubmitting(false)
          return
        }

        // 处理其他可能的错误
        if (!generateResponse.ok) {
          await handleErrorResponse(generateResponse)
          return
        }

        // 获取信件ID并跳转到匿名结果页
        generateData = await generateResponse.json()

        if (generateData.success && generateData.letterId) {
          console.log('Letter created successfully, redirecting to result page...')
          setSubmitStatus(language === 'en' ? 'Success! Redirecting...' : '成功！正在跳转...')
          router.push(`/anonymous/${generateData.letterId}`)
        } else {
          throw new Error(language === 'en' ? 'Invalid response data' : '服务器返回异常数据')
        }
      }
    } catch (error) {
      console.error('Error creating letter:', error)
      setSubmitStatus('')
      toast({
        title: language === 'en' ? 'Generation failed' : '生成失败',
        description:
          error instanceof Error
            ? error.message
            : language === 'en'
              ? 'Failed to generate your letter. Please try again later.'
              : '信件生成失败，请稍后重试。',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 辅助函数：处理API错误响应
  const handleErrorResponse = async (response: Response) => {
    let errorData
    try {
      errorData = await response.json()
      // 显示服务器返回的错误信息
      const errorMessage =
        errorData.message ||
        errorData.error ||
        (language === 'en' ? 'Failed to create letter' : '创建信件失败')

      console.error('API error:', errorData)
      toast({
        title: language === 'en' ? 'Process failed' : '处理失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } catch (e) {
      // 无法解析JSON时使用状态码信息
      console.error('Error parsing API response:', e, 'Status:', response.status)
      toast({
        title: language === 'en' ? 'Process failed' : '处理失败',
        description:
          language === 'en' ? `Server error: ${response.status}` : `服务器错误: ${response.status}`,
        variant: 'destructive',
      })
    }
    setIsSubmitting(false)
  }

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
        playerRef.current
          .setVolume(1.0)
          .then(() => {
            playerRef.current.play().catch(() => {
              setIsLoading(false) // 播放失败时重置加载状态
            })
          })
          .catch(() => {
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

  // 不同变体的内容定义
  const contentVariants: Record<string, ContentLanguages> = {
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
          description:
            'Watch how Behind Memo helps you create heartfelt letters from your cherished photos.',
          buttonText: 'Try It Now',
        },
        tools: {
          title: 'AI Creative Tools',
          subtitle:
            'Transform your ideas into stunning visuals with our AI-powered image generation tools',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: 'Professional AI image generation with high-quality results',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: 'Maximum quality AI image generation for premium results',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: "Google's latest AI model for creative image generation",
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: 'New',
            },
            {
              name: '🍌 Nano Banana',
              description: 'The most playful AI image editor on the internet!',
              credits: 10,
              href: '/nano-banana',
              badge: 'Fun',
            },
          ],
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
          buttonText: '立即体验',
        },
        tools: {
          title: 'AI创意工具',
          subtitle: '使用我们的AI图像生成工具，将您的创意转化为令人惊叹的视觉作品',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: '专业AI图像生成，高质量输出',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: '最高质量AI图像生成，适合高端需求',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: '谷歌最新AI模型，创意图像生成',
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: '新',
            },
            {
              name: '🍌 Nano Banana',
              description: '互联网上最有趣的 AI 图像编辑器！',
              credits: 10,
              href: '/nano-banana',
              badge: '趣味',
            },
          ],
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
          description:
            'Our AI helps you express deep emotions by analyzing your photos and guiding you through creating personalized love letters that truly capture your feelings.',
          cta: 'Write a Love Letter',
        },
        videoCard: {
          title: 'See How It Works',
          description:
            'Watch how Behind Memo helps you create meaningful love letters from your cherished photos.',
          buttonText: 'Try It Now',
        },
        tools: {
          title: 'AI Creative Tools',
          subtitle:
            'Transform your ideas into stunning visuals with our AI-powered image generation tools',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: 'Professional AI image generation with high-quality results',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: 'Maximum quality AI image generation for premium results',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: "Google's latest AI model for creative image generation",
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: 'New',
            },
            {
              name: '🍌 Nano Banana',
              description: 'The most playful AI image editor on the internet!',
              credits: 10,
              href: '/nano-banana',
              badge: 'Fun',
            },
          ],
        },
        cta: {
          title: 'Ready to express your love?',
          description:
            '✓ Personalized love letters\n✓ Photo-inspired writing\n✓ Emotional expression guide\n✓ Beautiful templates',
          button: 'Start Your Love Letter',
        },
      },
      zh: {
        hero: {
          title: '将你们的爱情故事化为美丽文字',
          subtitle: '基于你们的甜蜜瞬间，创造充满真情的爱情信件',
          description:
            '我们的AI通过分析你的照片和引导你表达深刻情感，帮助你创作真正能够表达心意的个性化情书。',
          cta: '写一封情书',
        },
        videoCard: {
          title: '了解我们如何工作',
          description: '观看Behind Memo如何帮助您从珍贵照片创建充满爱意的信件。',
          buttonText: '立即体验',
        },
        tools: {
          title: 'AI创意工具',
          subtitle: '使用我们的AI图像生成工具，将您的创意转化为令人惊叹的视觉作品',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: '专业AI图像生成，高质量输出',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: '最高质量AI图像生成，适合高端需求',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: '谷歌最新AI模型，创意图像生成',
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: '新',
            },
            {
              name: '🍌 Nano Banana',
              description: '互联网上最有趣的 AI 图像编辑器！',
              credits: 10,
              href: '/nano-banana',
              badge: '趣味',
            },
          ],
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
          description:
            'Express your gratitude and appreciation to friends through personalized letters inspired by your shared memories and photos.',
          cta: 'Write to a Friend',
        },
        videoCard: {
          title: 'See How It Works',
          description:
            'Watch how Behind Memo helps you create meaningful messages from your friendship photos.',
          buttonText: 'Try It Now',
        },
        tools: {
          title: 'AI Creative Tools',
          subtitle:
            'Transform your ideas into stunning visuals with our AI-powered image generation tools',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: 'Professional AI image generation with high-quality results',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: 'Maximum quality AI image generation for premium results',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: "Google's latest AI model for creative image generation",
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: 'New',
            },
            {
              name: '🍌 Nano Banana',
              description: 'The most playful AI image editor on the internet!',
              credits: 10,
              href: '/nano-banana',
              badge: 'Fun',
            },
          ],
        },
        cta: {
          title: 'Ready to thank your friends?',
          description:
            '✓ Friendship appreciation letters\n✓ Memories into words\n✓ Photo-based inspiration\n✓ Express gratitude easily',
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
          buttonText: '立即体验',
        },
        tools: {
          title: 'AI创意工具',
          subtitle: '使用我们的AI图像生成工具，将您的创意转化为令人惊叹的视觉作品',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: '专业AI图像生成，高质量输出',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: '最高质量AI图像生成，适合高端需求',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: '谷歌最新AI模型，创意图像生成',
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: '新',
            },
            {
              name: '🍌 Nano Banana',
              description: '互联网上最有趣的 AI 图像编辑器！',
              credits: 10,
              href: '/nano-banana',
              badge: '趣味',
            },
          ],
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
          description:
            'Express your love and gratitude to family members through personalized letters inspired by your shared moments and photos.',
          cta: 'Write to Family',
        },
        videoCard: {
          title: 'See How It Works',
          description:
            'Watch how Behind Memo helps you create meaningful family letters from your precious photos.',
          buttonText: 'Try It Now',
        },
        tools: {
          title: 'AI Creative Tools',
          subtitle:
            'Transform your ideas into stunning visuals with our AI-powered image generation tools',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: 'Professional AI image generation with high-quality results',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: 'Maximum quality AI image generation for premium results',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: "Google's latest AI model for creative image generation",
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: 'New',
            },
            {
              name: '🍌 Nano Banana',
              description: 'The most playful AI image editor on the internet!',
              credits: 10,
              href: '/nano-banana',
              badge: 'Fun',
            },
          ],
        },
        cta: {
          title: 'Ready to express family love?',
          description:
            '✓ Family appreciation letters\n✓ Preserve family stories\n✓ Photo-inspired writing\n✓ Heartfelt expressions',
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
          buttonText: '立即体验',
        },
        tools: {
          title: 'AI创意工具',
          subtitle: '使用我们的AI图像生成工具，将您的创意转化为令人惊叹的视觉作品',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: '专业AI图像生成，高质量输出',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: '最高质量AI图像生成，适合高端需求',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: '谷歌最新AI模型，创意图像生成',
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: '新',
            },
            {
              name: '🍌 Nano Banana',
              description: '互联网上最有趣的 AI 图像编辑器！',
              credits: 10,
              href: '/nano-banana',
              badge: '趣味',
            },
          ],
        },
        cta: {
          title: '准备好表达家庭之爱了吗？',
          description: '✓ 家庭感谢信\n✓ 保存家庭故事\n✓ 照片激发灵感\n✓ 真挚情感表达',
          button: '开始家庭信件',
        },
      },
    },

    // 场景版本 - 带打字机效果
    scenes: {
      en: {
        hero: {
          title: 'Turn Photos into Personalized Letters',
          titlePrefix: 'Turn a photo into a ',
          titleTypewriter: [
            'love letter',
            'thank you note',
            'family letter',
            'birthday message',
            'anniversary card',
            'graduation letter',
            'apology note',
            'congratulation',
          ],
          titleSuffix: '',
          subtitle: 'Your photo + your description = a heartfelt personalized letter',
          description:
            'Upload a photo, add a brief description, and our AI will guide you to create a personalized letter for any relationship and occasion.',
          cta: 'Create Your Letter',
        },
        videoCard: {
          title: 'See How It Works',
          description:
            'Watch how Behind Memo helps transform your photos into meaningful personalized letters.',
          buttonText: 'Try It Now',
        },
        tools: {
          title: 'AI Creative Tools',
          subtitle:
            'Transform your ideas into stunning visuals with our AI-powered image generation tools',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: 'Professional AI image generation with high-quality results',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: 'Maximum quality AI image generation for premium results',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: "Google's latest AI model for creative image generation",
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: 'New',
            },
            {
              name: '🍌 Nano Banana',
              description: 'The most playful AI image editor on the internet!',
              credits: 10,
              href: '/nano-banana',
              badge: 'Fun',
            },
          ],
        },
        cta: {
          title: 'Express your feelings with ease',
          description:
            '✓ Photo-inspired writing\n✓ Multiple relationships\n✓ Various occasions\n✓ Personalized guidance',
          button: 'Start Your Letter',
        },
      },
      zh: {
        hero: {
          title: '照片转化为个性化信件',
          titlePrefix: '用照片写一封',
          titleTypewriter: [
            '爱的情书',
            '感谢信',
            '家书',
            '生日祝福',
            '纪念日信',
            '毕业赠言',
            '道歉信',
            '祝贺信',
          ],
          titleSuffix: '',
          subtitle: '一张照片 + 简短描述 = 一封真挚的个性化信件',
          description: '上传照片，添加简短描述，我们的AI将引导您为任何关系和场合创作个性化信件。',
          cta: '开始创作信件',
        },
        videoCard: {
          title: '了解工作原理',
          description: '观看Behind Memo如何帮助您将照片转化为有意义的个性化信件。',
          buttonText: '立即体验',
        },
        tools: {
          title: 'AI创意工具',
          subtitle: '使用我们的AI图像生成工具，将您的创意转化为令人惊叹的视觉作品',
          tools: [
            {
              name: 'Flux Kontext Pro',
              description: '专业AI图像生成，高质量输出',
              credits: 10,
              href: '/flux-kontext-pro',
            },
            {
              name: 'Flux Kontext Max',
              description: '最高质量AI图像生成，适合高端需求',
              credits: 20,
              href: '/flux-kontext-max',
            },
            {
              name: 'Gemini 2.5 Flash',
              description: '谷歌最新AI模型，创意图像生成',
              credits: 10,
              href: '/gemini-2.5-flash-image',
              badge: '新',
            },
            {
              name: '🍌 Nano Banana',
              description: '互联网上最有趣的 AI 图像编辑器！',
              credits: 10,
              href: '/nano-banana',
              badge: '趣味',
            },
          ],
        },
        cta: {
          title: '轻松表达您的情感',
          description: '✓ 照片激发写作灵感\n✓ 适用多种关系\n✓ 覆盖各种场合\n✓ 个性化写作指导',
          button: '开始您的信件',
        },
      },
    },
  }

  // 根据 variant 参数选择对应内容，如果不存在则使用默认内容
  const content =
    contentVariants[variant as keyof typeof contentVariants] || contentVariants.default

  // 页面渐变背景可以根据不同的变体使用不同的配色
  const getBackgroundStyle = () => {
    switch (variant) {
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
        }
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
        }
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
        }
      case 'scenes':
        return {
          backgroundImage: `
            linear-gradient(135deg, 
              #6b7fd9 0%,
              #9d9ee2 20%,
              #cbc8ef 40%,
              #e7e7f9 60%,
              #b8b7e8 80%,
              #7f81d8 100%
            )
          `,
          opacity: 0.3,
        }
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
        }
    }
  }

  // 根据variant获取文字渐变样式
  const getTextGradient = () => {
    switch (variant) {
      case 'love':
        return 'from-[#d88193] via-[#e6a6b9] to-[#d5889c]'
      case 'friendship':
        return 'from-[#78a9d1] via-[#a3c9e3] to-[#8bade0]'
      case 'family':
        return 'from-[#7aad8c] via-[#a1c9af] to-[#8dc09e]'
      case 'scenes':
        return 'from-[#6b7fd9] via-[#9d9ee2] to-[#7f81d8]'
      default:
        return 'from-[#738fbd] via-[#db88a4] to-[#cc8eb1]'
    }
  }

  const getHighlightGradient = () => {
    switch (variant) {
      case 'love':
        return 'from-[#d88193] to-[#e9bec9]'
      case 'friendship':
        return 'from-[#78a9d1] to-[#c1d9eb]'
      case 'family':
        return 'from-[#7aad8c] to-[#bfdcca]'
      case 'scenes':
        return 'from-[#6b7fd9] to-[#b8b7e8]'
      default:
        return 'from-[#5d7cad] to-[#a971a1]'
    }
  }

  // 打字机效果相关状态
  const [typewriterIndex, setTypewriterIndex] = useState(0)
  const [typewriterText, setTypewriterText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [showCursor, setShowCursor] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 打字机效果
  useEffect(() => {
    if (!mounted || variant !== 'scenes') return

    const heroContent = content[language].hero as TypewriterHeroContent
    const words = heroContent.titleTypewriter || []
    if (words.length === 0) return

    // 确保初始化时选择第一个单词
    if (typewriterText === '' && isTyping) {
      setTypewriterText(words[typewriterIndex].charAt(0))
      return
    }

    const currentWord = words[typewriterIndex]

    const handleTyping = () => {
      if (typewriterText.length < currentWord.length) {
        setTypewriterText(currentWord.substring(0, typewriterText.length + 1))
      } else {
        // 输入完成后，暂停一段时间，然后开始删除
        setTimeout(() => {
          setIsTyping(false)
        }, 1500)
      }
    }

    const handleDeleting = () => {
      if (typewriterText.length > 0) {
        setTypewriterText(typewriterText.substring(0, typewriterText.length - 1))
      } else {
        // 删除完成后，进入下一个单词
        setTypewriterIndex(prev => (prev + 1) % words.length)
        setIsTyping(true)
      }
    }

    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // 设置新的定时器
    timerRef.current = setTimeout(
      () => {
        if (isTyping) {
          handleTyping()
        } else {
          handleDeleting()
        }
      },
      isTyping ? 100 : 50
    )

    // 光标闪烁效果
    if (!cursorTimerRef.current) {
      cursorTimerRef.current = setInterval(() => {
        setShowCursor(prev => !prev)
      }, 500)
    }

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current)
      }
    }
  }, [mounted, variant, language, typewriterText, typewriterIndex, isTyping, content])

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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 z-0" style={getBackgroundStyle()} />

      <Nav />

      <div className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] md:h-screen flex items-start md:items-center justify-start md:justify-center overflow-hidden">
          <div className="container mx-auto px-8 sm:px-4 pt-16 md:pt-0 md:-mt-16 mt-0 sm:mt-2">
            <div className="max-w-6xl mx-auto md:text-center text-left">
              {variant === 'scenes' ? (
                // 为scenes变体特别设计的紧凑型标题和内联表单
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  {/* 左侧：缩小的标题和副标题 */}
                  <div className="w-full md:w-2/5 space-y-4">
                    <motion.h1
                      className={`font-bold text-3xl md:text-4xl ${
                        language === 'en' ? 'font-serif' : 'font-serif-zh'
                      }`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      {language === 'en' ? (
                        <div className="md:text-left min-h-[100px]">
                          {(content[language].hero as TypewriterHeroContent).titlePrefix}
                          <span
                            className={`inline-block bg-gradient-to-r ${getHighlightGradient()} text-transparent bg-clip-text leading-relaxed px-1`}
                          >
                            {typewriterText}
                            <span
                              className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
                            >
                              |
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="md:text-left min-h-[100px]">
                          {(content[language].hero as TypewriterHeroContent).titlePrefix}
                          <span
                            className={`inline-block bg-gradient-to-r ${getHighlightGradient()} text-transparent bg-clip-text leading-relaxed px-1`}
                          >
                            {typewriterText}
                            <span
                              className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
                            >
                              |
                            </span>
                          </span>
                        </div>
                      )}
                    </motion.h1>
                    <motion.p
                      className={`text-base md:text-sm text-gray-700 ${
                        language === 'en' ? 'font-serif' : 'font-serif-zh'
                      }`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    >
                      {content[language].hero.subtitle}
                    </motion.p>
                  </div>

                  {/* 右侧：表单组件 */}
                  <motion.div
                    className="w-full md:w-3/5 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  >
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700 block mb-1 text-left">
                            {language === 'en' ? 'From' : '从'}
                          </label>
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder={language === 'en' ? 'Your name' : '发信人'}
                            className="w-full"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700 block mb-1 text-left">
                            {language === 'en' ? 'To' : '给'}
                          </label>
                          <Input
                            name="loverName"
                            value={formData.loverName}
                            onChange={handleInputChange}
                            placeholder={language === 'en' ? 'Their name' : '收信人'}
                            className="w-full"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1 text-left">
                          {language === 'en' ? 'Upload a Photo' : '上传照片'}
                        </label>
                        <SimpleImageUpload
                          onImageSelected={handleImageSelected}
                          className={`w-full simple-image-upload ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                          key="photo-upload"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1 text-left">
                          {language === 'en' ? 'Your Story' : '你们的故事'}
                        </label>
                        <Textarea
                          name="story"
                          value={formData.story}
                          onChange={handleInputChange}
                          placeholder={
                            language === 'en' ? 'Tell us about your story...' : '分享你们的故事...'
                          }
                          className="w-full h-24"
                          disabled={isSubmitting}
                        />
                      </div>

                      <Button
                        className={cn('w-full', variant === 'scenes' ? 'text-base' : '')}
                        size={variant === 'scenes' ? 'lg' : 'default'}
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-5 w-5 border-2 border-t-transparent border-white animate-spin rounded-full mr-2"></div>
                            <span>{submitStatus}</span>
                          </>
                        ) : language === 'en' ? (
                          'Generate Letter'
                        ) : (
                          '生成信件'
                        )}
                      </Button>

                      <p className="text-xs text-center text-gray-500">
                        {language === 'en'
                          ? 'Free to use. Limited to 5 letters per day.'
                          : '免费使用。每天限制生成5封信件。'}
                      </p>
                    </form>
                  </motion.div>
                </div>
              ) : (
                <>
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
                          {variant === 'default' ? (
                            <span className="block text-[45px] sm:text-[55px] leading-[1.1] tracking-tight">
                              <span
                                className={`bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] text-transparent bg-clip-text`}
                              >
                                {content[language].hero.title}
                              </span>
                            </span>
                          ) : variant === 'scenes' ? (
                            <>
                              <div className="h-[200px] flex items-center justify-center">
                                <span className="block text-[38px] sm:text-[46px] leading-[1.2] tracking-tight">
                                  {(content[language].hero as TypewriterHeroContent).titlePrefix}
                                  <span
                                    className={`inline-block bg-gradient-to-r ${getHighlightGradient()} text-transparent bg-clip-text leading-relaxed py-2 min-h-[60px] px-1`}
                                  >
                                    {typewriterText}
                                    <span
                                      className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
                                    >
                                      |
                                    </span>
                                  </span>
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="block text-[45px] sm:text-[55px] leading-[1.1] tracking-tight">
                              <span
                                className={`bg-gradient-to-r ${getTextGradient()} text-transparent bg-clip-text`}
                              >
                                {content[language].hero.title}
                              </span>
                            </span>
                          )}
                        </span>
                        <span className="hidden md:block text-5xl sm:text-7xl">
                          {variant === 'scenes' ? (
                            <div className="min-h-[200px] flex flex-col justify-center">
                              {(content[language].hero as TypewriterHeroContent).titlePrefix}
                              <span
                                className={`inline-block bg-gradient-to-r ${getHighlightGradient()} text-transparent bg-clip-text leading-relaxed py-2 min-h-[70px] px-1`}
                              >
                                {typewriterText}
                                <span
                                  className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
                                >
                                  |
                                </span>
                              </span>
                            </div>
                          ) : (
                            content[language].hero.title
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="text-5xl sm:text-7xl">
                        {variant === 'scenes' ? (
                          <>
                            <span className="md:hidden block">
                              <div className="h-[200px] flex items-center justify-center">
                                <span className="block text-[35px] sm:text-[45px] leading-[1.2] tracking-tight">
                                  {(content[language].hero as TypewriterHeroContent).titlePrefix}
                                  <span
                                    className={`inline-block bg-gradient-to-r ${getHighlightGradient()} text-transparent bg-clip-text leading-relaxed py-2 min-h-[60px] px-1`}
                                  >
                                    {typewriterText}
                                    <span
                                      className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
                                    >
                                      |
                                    </span>
                                  </span>
                                </span>
                              </div>
                            </span>
                            <span className="hidden md:block">
                              <div className="min-h-[200px] flex flex-col justify-center">
                                {(content[language].hero as TypewriterHeroContent).titlePrefix}
                                <span
                                  className={`inline-block bg-gradient-to-r ${getHighlightGradient()} text-transparent bg-clip-text leading-relaxed py-2 min-h-[70px] px-1`}
                                >
                                  {typewriterText}
                                  <span
                                    className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
                                  >
                                    |
                                  </span>
                                </span>
                                {(content[language].hero as TypewriterHeroContent).titleSuffix}
                              </div>
                            </span>
                          </>
                        ) : variant === 'love' ? (
                          <>
                            <span className="md:hidden">
                              <span className="block text-[40px] sm:text-[50px] leading-[1.1] tracking-tight">
                                将
                                <span className="inline-block bg-gradient-to-r from-[#d88193] to-[#e9bec9] text-transparent bg-clip-text">
                                  爱情故事
                                </span>
                              </span>
                              <span className="block text-[40px] sm:text-[50px] leading-[1.1] tracking-tight">
                                化为
                                <span className="inline-block bg-gradient-to-r from-[#e9bec9] to-[#d5889c] text-transparent bg-clip-text">
                                  美丽文字
                                </span>
                              </span>
                            </span>
                            <span className="hidden md:block">{content[language].hero.title}</span>
                          </>
                        ) : variant === 'friendship' ? (
                          <>
                            <span className="md:hidden">
                              <span className="block text-[40px] sm:text-[50px] leading-[1.1] tracking-tight">
                                将
                                <span className="inline-block bg-gradient-to-r from-[#78a9d1] to-[#c1d9eb] text-transparent bg-clip-text">
                                  友情回忆
                                </span>
                              </span>
                              <span className="block text-[40px] sm:text-[50px] leading-[1.1] tracking-tight">
                                化为
                                <span className="inline-block bg-gradient-to-r from-[#c1d9eb] to-[#8bade0] text-transparent bg-clip-text">
                                  温暖文字
                                </span>
                              </span>
                            </span>
                            <span className="hidden md:block">{content[language].hero.title}</span>
                          </>
                        ) : variant === 'family' ? (
                          <>
                            <span className="md:hidden">
                              <span className="block text-[40px] sm:text-[50px] leading-[1.1] tracking-tight">
                                将
                                <span className="inline-block bg-gradient-to-r from-[#7aad8c] to-[#bfdcca] text-transparent bg-clip-text">
                                  家庭瞬间
                                </span>
                              </span>
                              <span className="block text-[40px] sm:text-[50px] leading-[1.1] tracking-tight">
                                化为
                                <span className="inline-block bg-gradient-to-r from-[#bfdcca] to-[#8dc09e] text-transparent bg-clip-text">
                                  珍贵信件
                                </span>
                              </span>
                            </span>
                            <span className="hidden md:block">{content[language].hero.title}</span>
                          </>
                        ) : (
                          content[language].hero.title
                        )}
                      </span>
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
                          {variant === 'default' ? (
                            <span className={`block text-gray-700`}>
                              {content[language].hero.subtitle}
                            </span>
                          ) : (
                            <span
                              className={`block bg-gradient-to-r ${getTextGradient()} text-transparent bg-clip-text`}
                            >
                              {content[language].hero.subtitle}
                            </span>
                          )}
                        </span>
                        <span
                          className={`hidden md:block text-2xl sm:text-3xl bg-gradient-to-r ${getTextGradient()} text-transparent bg-clip-text`}
                        >
                          {content[language].hero.subtitle}
                        </span>
                      </span>
                    ) : (
                      <span className="block">
                        <span
                          className={`md:hidden text-[18px] sm:text-[22px] leading-[1.3] bg-gradient-to-r ${getTextGradient()} text-transparent bg-clip-text`}
                        >
                          {content[language].hero.subtitle}
                        </span>
                        <span
                          className={`hidden md:block text-base sm:text-xl md:text-2xl lg:text-3xl bg-gradient-to-r ${getTextGradient()} text-transparent bg-clip-text`}
                        >
                          {content[language].hero.subtitle}
                        </span>
                      </span>
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
                  {variant !== 'scenes' && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                      className="md:text-center text-left mb-12 md:mb-0"
                    >
                      <Button
                        className={`rounded-full ${variant === 'default' ? 'bg-gradient-to-r from-[#738fbd] to-[#cc8eb1]' : `bg-gradient-to-r ${getTextGradient()}`} hover:opacity-90 text-white px-10 md:px-12 py-6 md:py-7 text-xl md:text-2xl font-medium`}
                        asChild
                      >
                        <Link href="/write">{content[language].hero.cta}</Link>
                      </Button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="absolute md:bottom-16 bottom-1 left-1/2 transform -translate-x-1/2 z-50">
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
                className={`h-6 w-6 ${variant === 'default' ? 'text-[#738fbd]' : variant === 'love' ? 'text-[#d88193]' : variant === 'friendship' ? 'text-[#78a9d1]' : 'text-[#7aad8c]'}`}
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
                className={`text-2xl md:text-4xl font-bold mb-3 md:mb-4 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {language === 'en' ? 'How It Works' : '使用指南'}
              </motion.h2>
              <motion.p
                className={`text-base md:text-xl text-gray-700 max-w-3xl mx-auto ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {language === 'en'
                  ? 'Watch our tutorial to see how Behind Memo helps you express your feelings'
                  : '观看我们的教程，了解 Behind Memo 如何帮助您表达情感'}
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
                <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlayback} />

                {/* 加载指示器 - 仅在加载时显示 */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/10 backdrop-blur-sm">
                    <div
                      className={`w-16 h-16 rounded-full border-4 border-white/30 border-t-${variant === 'default' ? '[#738fbd]' : variant === 'love' ? '[#d88193]' : variant === 'friendship' ? '[#78a9d1]' : '[#7aad8c]'} animate-spin`}
                    ></div>
                  </div>
                )}

                {/* 自定义播放按钮 - 仅在视频未播放且不在加载状态时显示 */}
                {!isPlaying && !isLoading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
                    onClick={togglePlayback}
                  >
                    <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/90 transition-all duration-300 shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={`w-10 h-10 text-${variant === 'default' ? '[#738fbd]' : variant === 'love' ? '[#d88193]' : variant === 'friendship' ? '[#78a9d1]' : '[#7aad8c]'} ml-1`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <div
                className={`absolute inset-0 bg-gradient-to-r ${variant === 'default' ? 'from-[#738fbd]/20 to-[#cc8eb1]/20' : variant === 'love' ? 'from-[#d88193]/20 to-[#e9bec9]/20' : variant === 'friendship' ? 'from-[#78a9d1]/20 to-[#c1d9eb]/20' : 'from-[#7aad8c]/20 to-[#bfdcca]/20'} pointer-events-none rounded-xl md:rounded-2xl`}
              ></div>
            </motion.div>

            <motion.div
              className="mt-4 md:mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Button
                className={`rounded-full ${variant === 'default' ? 'bg-gradient-to-r from-[#738fbd] to-[#cc8eb1]' : `bg-gradient-to-r ${getTextGradient()}`} hover:opacity-90 text-white px-6 py-3 md:px-8 md:py-4 text-base md:text-lg`}
                asChild
              >
                <Link href="/write">{language === 'en' ? 'Try It Now' : '立即尝试'}</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Tools Section */}
        <section className="py-16 md:py-24 bg-gray-50/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h2
                  className={`text-3xl md:text-4xl font-bold mb-4 ${
                    language === 'en' ? 'font-serif' : 'font-serif-zh'
                  }`}
                >
                  {content[language].tools.title}
                </h2>
                <p
                  className={`text-lg md:text-xl text-gray-700 max-w-3xl mx-auto ${
                    language === 'en' ? 'font-serif' : 'font-serif-zh'
                  }`}
                >
                  {content[language].tools.subtitle}
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {content[language].tools.tools.map((tool, index) => (
                  <motion.div
                    key={tool.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link href={tool.href}>
                      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-gray-200">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <h3
                              className={`text-xl font-bold ${
                                language === 'en' ? 'font-serif' : 'font-serif-zh'
                              }`}
                            >
                              {tool.name}
                            </h3>
                            {tool.badge && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {tool.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-4">{tool.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              {tool.credits} {language === 'en' ? 'credits per use' : '积分/次'}
                            </span>
                            <span className="text-sm font-medium text-blue-600">
                              {language === 'en' ? 'Try Now →' : '立即体验 →'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
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
                className={`rounded-full ${variant === 'default' ? 'bg-gradient-to-r from-[#738fbd] to-[#cc8eb1]' : `bg-gradient-to-r ${getTextGradient()}`} hover:opacity-90 text-white px-8 py-6 text-lg mt-8 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
                asChild
              >
                <Link href="/write">{content[language].cta.button}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto" />
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
