"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoveLetterData {
  letter: string
  blobUrl: string
  name: string
  loverName: string
  timestamp: number
  metadata: Record<string, unknown>
  isGenerating: boolean
  partialLetter?: string
}

export default function ResultContent() {
  const [letterData, setLetterData] = useState<LoveLetterData | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [isGenerating, setIsGenerating] = useState(true)
  const abortController = useRef<AbortController>()
  const router = useRouter()

  // 直接显示文本，同时保存到 localStorage
  const appendText = useCallback((text: string) => {
    setCurrentText(prev => {
      const newText = prev + text
      // 保存生成过程中的文本
      const storedData = localStorage.getItem("loveLetterData")
      if (storedData) {
        const data = JSON.parse(storedData)
        localStorage.setItem("loveLetterData", JSON.stringify({
          ...data,
          partialLetter: newText // 保存部分生成的内容
        }))
      }
      return newText
    })
  }, [])

  useEffect(() => {
    const storedData = localStorage.getItem("loveLetterData")
    if (!storedData) {
      router.push("/")
      return
    }

    const data = JSON.parse(storedData)
    setLetterData(data)

    // 检查是否已经有完整的生成内容
    if (data.letter) {
      setCurrentText(data.letter)
      setIsGenerating(false)
      return
    }

    // 检查是否有部分生成的内容
    if (data.partialLetter) {
      setCurrentText(data.partialLetter)
    }

    // 检查是否有正在进行的请求
    const storedRequest = localStorage.getItem("letterRequest")
    if (storedRequest) {
      const { timestamp } = JSON.parse(storedRequest)
      // 如果请求时间超过5分钟，认为是失效的请求
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return // 已有正在进行的请求，不再发起新请求
      } else {
        // 清除过期的请求记录
        localStorage.removeItem("letterRequest")
      }
    }

    // 只有在需要生成且没有正在进行的请求时才发起新请求
    if (data.isGenerating && !storedRequest) {
      const generateLetter = async () => {
        try {
          abortController.current = new AbortController()
          
          const response = await fetch('/api/generate-letter', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: data.name,
              loverName: data.loverName,
              story: data.story,
              blobUrl: data.blobUrl,
              metadata: data.metadata
            }),
            signal: abortController.current.signal
          })

          if (!response.ok) throw new Error('Failed to generate letter')

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          while (reader) {
            const { done, value } = await reader.read()
            if (done) break
            
            const text = decoder.decode(value, { stream: true })
            appendText(text)
          }

          // 完成后更新状态
          setIsGenerating(false)
          const updatedData = { 
            ...data, 
            letter: currentText, // 保存完整的信件
            isGenerating: false,
            partialLetter: undefined // 清除部分生成的内容
          }
          localStorage.setItem("loveLetterData", JSON.stringify(updatedData))
          setLetterData(updatedData)
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Request was aborted')
          } else {
            console.error('Error generating letter:', error)
          }
          setIsGenerating(false)
        }
      }

      generateLetter()
    }

    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [router, appendText, currentText])

  // 图片容器使用 memo 来防止不必要的重渲染
  const ImageContainer = useMemo(() => {
    if (!letterData) return null
    return (
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-xl bg-black/40">
        <div className={cn(
          "absolute inset-0 transition-opacity duration-500",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}>
          <Image
            src={imageError ? "/placeholder.svg" : letterData.blobUrl}
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

  if (!letterData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    )
  }

  // 渲染部分
  const paragraphs = currentText ? currentText.split('\n').filter(p => p.trim()) : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
        <div className="relative min-h-screen">
          {/* 背景效果 */}
          <div className="fixed inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
            <Image
              src={imageError ? "/placeholder.svg" : letterData.blobUrl}
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
                  transition={{ duration: 0.8, ease: "easeOut" }}
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

                  {/* 按钮 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="text-center sticky bottom-8"
                  >
                    <Link href="/">
                      <Button
                        variant="outline"
                        className="rounded-full px-10 py-6 bg-black/60 text-white border-white/30 hover:bg-white/10 hover:border-white/50 backdrop-blur-sm text-lg transition-all duration-300"
                      >
                        Create Another Letter
                      </Button>
                    </Link>
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

