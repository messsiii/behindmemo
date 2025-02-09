'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArrowLeft, Home } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'

// 定义 metadata 类型
interface Metadata {
  location?: string
  exif?: Record<string, unknown>
  // ... 其他可能的元数据字段
}

interface LoveLetterData {
  letter: string
  blobUrl: string
  name: string
  loverName: string
  story: string
  timestamp: number
  metadata: Metadata
  isGenerating: boolean
  partialLetter?: string
  fromHistory?: boolean
  isComplete?: boolean
  id: string
}

interface ResultContentProps {
  initialData: LoveLetterData
}

const content = {
  en: {
    error: 'Generation failed',
    generating: 'Generating your love letter...',
    completed: 'Love letter completed',
    viewHistory: 'View History',
    writeAnother: 'Write Another',
    tryAgain: 'Try Again',
    goHome: 'Go Home',
  },
  zh: {
    error: '生成失败',
    generating: '正在生成你的情书...',
    completed: '情书已完成',
    viewHistory: '查看历史',
    writeAnother: '再写一封',
    tryAgain: '重试',
    goHome: '返回首页',
  },
} as const

export default function ResultContent({ initialData }: ResultContentProps) {
  const [letterData, setLetterData] = useState<LoveLetterData>(initialData)
  const [isGenerating, setIsGenerating] = useState(!initialData.isComplete)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()

  // 处理生成内容
  useEffect(() => {
    // 如果是从写作页面来的新信件，且未完成，则开始生成
    if (!letterData.fromHistory && !letterData.isComplete) {
      const startGeneration = async () => {
        try {
          const response = await fetch(`/api/letters/generate/${letterData.id}`, {
            method: 'POST',
            credentials: 'include',
          })

          if (!response.ok) {
            throw new Error('Failed to start generation')
          }

          if (!response.body) {
            throw new Error('No response body')
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let content = letterData.letter || ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value)
            const lines = text.split('\n')

            for (const line of lines) {
              if (!line.trim()) continue

              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6)
                if (jsonStr === '[DONE]') break

                try {
                  const json = JSON.parse(jsonStr)
                  if (json?.choices?.[0]?.delta?.text) {
                    content += json.choices[0].delta.text
                    setLetterData(prev => ({
                      ...prev,
                      letter: content,
                    }))
                  }
                } catch (e) {
                  console.warn('JSON parsing warning:', e)
                }
              }
            }
          }

          // 生成完成，更新状态
          setLetterData(prev => ({
            ...prev,
            letter: content,
            isComplete: true,
            isGenerating: false,
          }))
          setIsGenerating(false)

          // 清除 localStorage 中的临时数据
          localStorage.removeItem('loveLetterData')
        } catch (error) {
          console.error('Generation error:', error)
          setError(error instanceof Error ? error.message : String(error))
          setIsGenerating(false)
          toast({
            title: content[language].error,
            description: error instanceof Error ? error.message : String(error),
            variant: 'destructive',
          })
        }
      }

      startGeneration()
    }
  }, [
    letterData.id,
    letterData.fromHistory,
    letterData.isComplete,
    letterData.letter,
    language,
    toast,
  ])

  // 图片容器使用 memo 来防止不必要的重渲染
  const ImageContainer = useMemo(() => {
    if (!letterData) return null
    return (
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-xl bg-black/40">
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Image
            src={imageError ? '/placeholder.svg' : letterData.blobUrl}
            alt="Your special moment"
            fill
            className="object-contain"
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1280px"
          />
        </div>
      </div>
    )
  }, [letterData, imageLoaded, imageError])

  // 渲染返回按钮
  const BackButton = useMemo(() => {
    if (!letterData?.fromHistory) return null
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-[14px] left-4 z-50"
      >
        <Link href="/history">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-transparent"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Button>
        </Link>
      </motion.div>
    )
  }, [letterData?.fromHistory])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="text-center space-y-4 p-8 bg-black/40 backdrop-blur-lg rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold text-red-500">Generation Error</h2>
          <p className="text-white/80">{error}</p>
          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem('letterRequest')
                localStorage.removeItem('loveLetterData')
                router.push('/write')
              }}
              className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/10"
            >
              {content[language].tryAgain}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/10"
            >
              {content[language].goHome}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!letterData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    )
  }

  // 渲染部分
  const paragraphs = letterData.letter ? letterData.letter.split('\n').filter(p => p.trim()) : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black overflow-x-hidden">
      {/* 返回历史页按钮 */}
      {BackButton}

      {/* 返回首页按钮 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed top-[14px] z-50"
        style={{ left: letterData?.fromHistory ? '44px' : '4px' }}
      >
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-transparent"
          >
            <Home className="h-[18px] w-[18px]" />
          </Button>
        </Link>
      </motion.div>

      <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
        <div className="relative min-h-screen">
          {/* 背景效果 */}
          <div className="fixed inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
            <Image
              src={imageError ? '/placeholder.svg' : letterData.blobUrl}
              alt="Background"
              fill
              className="filter blur-2xl scale-110 object-cover mix-blend-overlay"
              priority
              unoptimized
            />
          </div>

          {/* 内容部分 */}
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-10">
            <div className="w-full max-w-4xl">
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="space-y-12"
                >
                  {/* 标题 */}
                  <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-5xl md:text-6xl font-bold text-white text-center font-serif tracking-wide"
                  >
                    Your Love Letter
                  </motion.h1>

                  {/* 图片容器 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  >
                    {ImageContainer}
                  </motion.div>

                  {/* 信件内容 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border border-white/10"
                  >
                    <div className="prose prose-lg prose-invert max-w-none">
                      {isGenerating ? (
                        <div className="flex items-center justify-center space-x-3 py-8">
                          <div className="w-3 h-3 bg-white/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-3 h-3 bg-white/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-3 h-3 bg-white/30 rounded-full animate-bounce" />
                        </div>
                      ) : paragraphs.length > 0 ? (
                        paragraphs.map((paragraph, index) => (
                          <motion.p
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="text-gray-100 font-serif italic leading-relaxed text-lg md:text-xl"
                            style={{ fontFamily: '"Cormorant Garamond", serif' }}
                          >
                            {paragraph.trim()}
                          </motion.p>
                        ))
                      ) : null}
                    </div>
                  </motion.div>

                  {/* 底部状态和按钮 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="text-center space-y-6"
                  >
                    {/* 状态指示器 */}
                    <motion.div
                      className="flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {isGenerating ? (
                        <motion.div
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          <span className="text-primary text-sm">
                            {content[language].generating}
                          </span>
                        </motion.div>
                      ) : error ? (
                        <motion.div
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-red-500/20"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, type: 'spring' }}
                        >
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="text-red-500 text-sm">{error}</span>
                        </motion.div>
                      ) : letterData.isComplete ? (
                        <motion.div
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, type: 'spring' }}
                        >
                          <div className="w-2 h-2 bg-[#00FF66] rounded-full" />
                          <span className="text-[#00FF66] text-sm">
                            {content[language].completed}
                          </span>
                        </motion.div>
                      ) : null}
                    </motion.div>

                    {/* 按钮 - 只在文本完全渲染后显示 */}
                    {letterData.isComplete && !isGenerating && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.2,
                          type: 'spring',
                          bounce: 0.3,
                        }}
                        className="flex items-center justify-center gap-4"
                      >
                        <Link href="/history">
                          <Button
                            variant="outline"
                            className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm text-sm transition-all duration-300"
                          >
                            {content[language].viewHistory}
                          </Button>
                        </Link>
                        <Link href="/write">
                          <Button
                            variant="outline"
                            className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm text-sm transition-all duration-300"
                          >
                            {content[language].writeAnother}
                          </Button>
                        </Link>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
