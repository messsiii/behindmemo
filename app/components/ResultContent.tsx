"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// 定义 metadata 类型
interface Metadata {
  location?: string;
  exif?: Record<string, unknown>;
  // ... 其他可能的元数据字段
}

interface LoveLetterData {
  letter: string;
  blobUrl: string;
  name: string;
  loverName: string;
  timestamp: number;
  metadata: Metadata;  // 使用具体类型替代 any
  isGenerating: boolean;
  partialLetter?: string;
}

export default function ResultContent() {
  const [letterData, setLetterData] = useState<LoveLetterData | null>(null)
  const [isGenerating, setIsGenerating] = useState(true)
  const [currentText, setCurrentText] = useState('')
  const [isTextComplete, setIsTextComplete] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [_requestId, _setRequestId] = useState<string>('')  // 用于追踪请求状态
  const abortController = useRef<AbortController>()
  const lastTextRef = useRef('')
  const bufferRef = useRef('')
  const router = useRouter()

  // 先定义 handleError
  const handleError = useCallback(() => {
    setIsGenerating(false)
    localStorage.removeItem("letterRequest")
  }, [])

  // 然后再定义依赖 handleError 的函数
  const finishGeneration = useCallback((data: LoveLetterData) => {
    try {
      if (bufferRef.current) {
        setCurrentText(prev => {
          const newText = prev + (prev ? '\n' : '') + bufferRef.current
          lastTextRef.current = newText
          bufferRef.current = ''
          return newText
        })
      }

      setTimeout(() => {
        setIsGenerating(false)
        setIsTextComplete(true)
        
        try {
          const updatedData = { 
            ...data, 
            letter: lastTextRef.current,
            isGenerating: false,
            partialLetter: undefined
          }
          localStorage.setItem("loveLetterData", JSON.stringify(updatedData))
          localStorage.removeItem("letterRequest")
          setLetterData(updatedData)
        } catch (e) {
          console.error('Error updating final data:', e)
        }
      }, 500)
    } catch (e) {
      console.error('Error in finishGeneration:', e)
      handleError()
    }
  }, [handleError])

  // 修改文本处理逻辑
  const appendText = useCallback((text: string) => {
    try {
      bufferRef.current += text
      
      // 检查是否有完整的行
      if (bufferRef.current.includes('\n')) {
        const lines = bufferRef.current.split('\n')
        bufferRef.current = lines.pop() || ''
        
        const completeLines = lines.join('\n')
        if (completeLines) {
          setCurrentText(prev => {
            const newText = prev + (prev ? '\n' : '') + completeLines
            lastTextRef.current = newText
            
            // 保存到 localStorage
            const storedData = localStorage.getItem("loveLetterData")
            if (storedData) {
              try {
                const data = JSON.parse(storedData)
                localStorage.setItem("loveLetterData", JSON.stringify({
                  ...data,
                  partialLetter: newText
                }))
              } catch (e) {
                console.error('Error updating localStorage:', e)
              }
            }
            return newText
          })
        }
      }
    } catch (e) {
      console.error('Error in appendText:', e)
    }
  }, [])

  useEffect(() => {
    const storedData = localStorage.getItem("loveLetterData")
    if (!storedData) {
      router.push("/")
      return
    }

    const data = JSON.parse(storedData)
    setLetterData(data)
    setIsGenerating(true)
    setIsTextComplete(false)

    if (data.letter) {
      setCurrentText(data.letter)
      setTimeout(() => {
        setIsGenerating(false)
        setIsTextComplete(true)
      }, 1000)
      return
    }

    if (data.partialLetter) {
      setCurrentText(data.partialLetter)
    }

    // 检查是否有正在进行的请求
    const storedRequest = localStorage.getItem("letterRequest")
    if (storedRequest) {
      const { id, timestamp } = JSON.parse(storedRequest)
      // 如果请求时间超过5分钟，认为是失效的请求
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        _setRequestId(id)
        return // 已有正在进行的请求，不再发起新请求
      } else {
        // 清除过期的请求记录
        localStorage.removeItem("letterRequest")
      }
    }

    // 只有在需要生成且没有正在进行的请求时才发起新请求
    if (data.isGenerating && !storedRequest) {
      const newRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      _setRequestId(newRequestId)

      localStorage.setItem("letterRequest", JSON.stringify({
        id: newRequestId,
        timestamp: Date.now()
      }))

      const generateLetter = async () => {
        try {
          abortController.current = new AbortController()
          
          const response = await fetch('/api/generate-letter', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Request-Id': newRequestId
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
            if (done) {
              finishGeneration(data)  // 使用新的完成函数
              break
            }
            
            const text = decoder.decode(value, { stream: true })
            appendText(text)
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Request was aborted')
          } else {
            console.error('Error generating letter:', error)
          }
          setIsGenerating(false)
          localStorage.removeItem("letterRequest")
        }
      }

      generateLetter()
    }

    return () => {
      if (abortController.current) {
        abortController.current.abort()
        localStorage.removeItem("letterRequest")
      }
    }
  }, [router, appendText, finishGeneration])

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
                            Crafting your love letter...
                          </span>
                        </motion.div>
                      ) : isTextComplete && (
                        <motion.div
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, type: "spring" }}
                        >
                          <div className="w-2 h-2 bg-[#00FF66] rounded-full" />
                          <span className="text-[#00FF66] text-sm">
                            Love letter completed
                          </span>
                        </motion.div>
                      )}
                    </motion.div>

                    {/* 按钮 - 只在文本完全渲染后显示 */}
                    {isTextComplete && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          duration: 0.5,
                          delay: 0.2,
                          type: "spring",
                          bounce: 0.3
                        }}
                      >
                        <Link href="/">
                          <Button
                            variant="outline"
                            className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm text-sm transition-all duration-300"
                          >
                            Write Another Letter
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

