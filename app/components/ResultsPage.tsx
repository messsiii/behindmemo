'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Loader2, Home } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Letter {
  id: string
  content: string
  imageUrl: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  metadata?: {
    name: string
    loverName: string
    story: string
  }
}

export default function ResultsPage({ id }: { id: string }) {
  const router = useRouter()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // 获取信件详情
  useEffect(() => {
    const fetchLetter = async () => {
      try {
        const res = await fetch(`/api/letters/${id}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch letter')
        }

        setLetter(data.letter)
      } catch (error) {
        console.error('[FETCH_LETTER_ERROR]', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch letter details',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchLetter()
  }, [id])

  // 如果是新创建的信件，自动开始生成
  useEffect(() => {
    if (!letter) return
    if (letter.status === 'completed' && letter.content) return

    const generateContent = async () => {
      try {
        const response = await fetch(`/api/letters/${letter.id}/generate`, {
          method: 'POST',
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || data.details || 'Failed to generate content')
        }

        if (!data.content) {
          throw new Error('No content received from server')
        }

        // 更新信件内容
        setLetter(prev => ({
          ...prev!,
          content: data.content,
          status: 'completed',
        }))
      } catch (error) {
        console.error('[GENERATE_ERROR]', error)
        setLetter(prev => ({
          ...prev!,
          status: 'failed',
        }))
        toast({
          title: 'Error',
          description: 'Failed to generate letter content',
          variant: 'destructive',
        })
      }
    }

    generateContent()
  }, [letter])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!letter) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4 text-white">Letter not found</h1>
        <Button onClick={() => router.push('/')} variant="outline">
          Write a new letter
        </Button>
      </div>
    )
  }

  const paragraphs = letter.content ? letter.content.split('\n').filter(p => p.trim()) : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black overflow-x-hidden">
      {/* 返回首页按钮 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-[14px] left-4 z-50"
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
            {letter.imageUrl && (
              <Image
                src={imageError ? '/placeholder.svg' : letter.imageUrl}
                alt="Background"
                fill
                className="filter blur-2xl scale-110 object-cover mix-blend-overlay"
                priority
                unoptimized
              />
            )}
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
                  {letter.imageUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.8 }}
                    >
                      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-xl bg-black/40">
                        <div
                          className={cn(
                            'absolute inset-0 transition-opacity duration-500',
                            imageLoaded ? 'opacity-100' : 'opacity-0'
                          )}
                        >
                          <Image
                            src={imageError ? '/placeholder.svg' : letter.imageUrl}
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
                    </motion.div>
                  )}

                  {/* 信件内容 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border border-white/10"
                  >
                    <div className="prose prose-lg prose-invert max-w-none">
                      {letter.status === 'pending' && (
                        <div className="flex items-center justify-center space-x-3 py-8">
                          <div className="w-3 h-3 bg-white/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-3 h-3 bg-white/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-3 h-3 bg-white/30 rounded-full animate-bounce" />
                        </div>
                      )}

                      {letter.status === 'generating' && (
                        <div className="flex items-center justify-center space-x-3 py-8">
                          <div className="w-3 h-3 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-3 h-3 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-3 h-3 bg-primary/70 rounded-full animate-bounce" />
                        </div>
                      )}

                      {letter.status === 'completed' &&
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
                        ))}
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
                      {letter.status === 'pending' && (
                        <motion.div
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" />
                          <span className="text-white/50 text-sm">Creating your letter...</span>
                        </motion.div>
                      )}

                      {letter.status === 'generating' && (
                        <motion.div
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-primary/20"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          <span className="text-primary text-sm">Generating your letter...</span>
                        </motion.div>
                      )}

                      {letter.status === 'completed' && (
                        <motion.div
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-[#00FF66]/20"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, type: 'spring' }}
                        >
                          <div className="w-2 h-2 bg-[#00FF66] rounded-full" />
                          <span className="text-[#00FF66] text-sm">Letter completed</span>
                        </motion.div>
                      )}
                    </motion.div>

                    {/* 按钮 - 只在文本完全渲染后显示 */}
                    {letter.status === 'completed' && (
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
                            View History
                          </Button>
                        </Link>
                        <Link href="/write">
                          <Button
                            variant="outline"
                            className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm text-sm transition-all duration-300"
                          >
                            Write Another
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
