'use client'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import html2canvas from 'html2canvas'
import { Download, Home } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ImagePreviewDialog } from './ImagePreviewDialog'

interface Letter {
  id: string
  content: string
  imageUrl: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  metadata?: {
    name: string
    loverName: string
    story: string
    orientation: number
  }
}

// 添加模板常量
const TEMPLATES = {
  classic: {
    name: 'Classic Dark',
    style: {
      width: 1200,
      padding: 80,
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      titleFont: '"Cormorant Garamond", serif',
      contentFont: '"Cormorant Garamond", serif',
    }
  },
  postcard: {
    name: 'Postcard',
    style: {
      width: 1200,
      padding: 60,
      background: 'linear-gradient(to right, #f9f7f7 0%, #ffffff 100%)',
      titleFont: '"Playfair Display", serif',
      contentFont: '"Cormorant Garamond", serif',
    }
  },
  magazine: {
    name: 'Magazine',
    style: {
      width: 1200,
      padding: 80,
      background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
      titleFont: '"Playfair Display", serif',
      contentFont: '"Cormorant Garamond", serif',
    }
  }
}

export default function ResultsPage({ id }: { id: string }) {
  const router = useRouter()
  const { language } = useLanguage()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('classic')
  const [isGenerating, setIsGenerating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

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

  // 修改保存为图片的函数
  const saveAsImage = async (templateKey: keyof typeof TEMPLATES = selectedTemplate) => {
    if (!contentRef.current || isSaving) return
    
    try {
      setIsSaving(true)
      setIsGenerating(true)
      
      const template = TEMPLATES[templateKey]
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.width = `${template.style.width}px`
      document.body.appendChild(tempContainer)
      
      // 根据不同模板创建内容
      tempContainer.innerHTML = await generateTemplateHtml(letter, template.style, language, templateKey)

      // 生成图片
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: template.style.background.startsWith('#') 
          ? template.style.background 
          : '#000000',
        logging: false,
      })

      // 清理临时容器
      document.body.removeChild(tempContainer)

      // 获取图片 URL
      const image = canvas.toDataURL('image/png', 1.0)
      setPreviewImage(image)
      setSelectedTemplate(templateKey)
      
      if (!showPreview) {
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Error generating image:', error)
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setIsSaving(false)
    }
  }

  // 处理模板切换
  const handleTemplateChange = async (templateKey: keyof typeof TEMPLATES) => {
    if (templateKey !== selectedTemplate) {
      await saveAsImage(templateKey)
    }
  }

  // 添加模板 HTML 生成函数
  const generateTemplateHtml = async (
    letter: Letter | null, 
    style: typeof TEMPLATES[keyof typeof TEMPLATES]['style'],
    language: string,
    templateType: keyof typeof TEMPLATES = 'classic'
  ) => {
    if (!letter) return ''

    // 根据语言选择字体
    const fontFamily = language === 'zh' ? style.contentFont + ', "Noto Serif SC"' : style.contentFont

    switch (templateType) {
      case 'postcard':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background: ${style.background};
            position: relative;
            font-family: ${fontFamily};
            color: #2c3e50;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 8px;
              background: linear-gradient(90deg, #738fbd, #cc8eb1);
            "></div>

            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.1);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 24px;
              line-height: 1.8;
              color: #2c3e50;
              font-style: italic;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: rgba(255,255,255,0.8);
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            ">
              <div style="
                position: absolute;
                top: 20px;
                left: 20px;
                font-size: 60px;
                line-height: 1;
                color: #738fbd;
                opacity: 0.2;
                font-family: Georgia, serif;
              ">"</div>
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
              <div style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                font-size: 60px;
                line-height: 1;
                color: #cc8eb1;
                opacity: 0.2;
                font-family: Georgia, serif;
              ">"</div>
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              <img src="/watermark-light.svg" style="height: 35px;" alt="watermark" />
            </div>
          </div>
        `

      case 'magazine':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background: ${style.background};
            font-family: ${style.contentFont};
            color: #333;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin-bottom: 60px;
                position: relative;
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    border-radius: 8px;
                    box-shadow: 0 12px 36px rgba(0,0,0,0.15);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              column-count: 2;
              column-gap: 60px;
              font-size: 22px;
              line-height: 1.8;
              text-align: justify;
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            ">${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}</div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              <img src="/watermark-light.svg" style="height: 35px;" alt="watermark" />
            </div>
          </div>
        `

      default: // classic
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background: ${style.background};
            color: white;
            font-family: ${fontFamily};
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            border-radius: 12px;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: radial-gradient(circle at top right, rgba(115,143,189,0.1), transparent 70%),
                          radial-gradient(circle at bottom left, rgba(204,142,177,0.1), transparent 70%);
            "></div>

            ${letter.imageUrl ? `
              <div style="
                margin: 40px 0;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 12px 36px rgba(0,0,0,0.3);
                position: relative;
              ">
                <div style="
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(to bottom, transparent 80%, rgba(0,0,0,0.2));
                  pointer-events: none;
                "></div>
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 24px;
              line-height: 1.8;
              color: rgba(255,255,255,0.9);
              font-style: italic;
              text-align: justify;
              padding: 60px;
              background: rgba(255,255,255,0.05);
              border-radius: 16px;
              border: 1px solid rgba(255,255,255,0.1);
              position: relative;
              backdrop-filter: blur(10px);
            ">
              <div style="
                position: absolute;
                top: 20px;
                left: 20px;
                width: 40px;
                height: 40px;
                border-left: 2px solid rgba(115,143,189,0.3);
                border-top: 2px solid rgba(115,143,189,0.3);
              "></div>
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
              <div style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                width: 40px;
                height: 40px;
                border-right: 2px solid rgba(204,142,177,0.3);
                border-bottom: 2px solid rgba(204,142,177,0.3);
              "></div>
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              font-style: italic;
              color: rgba(255,255,255,0.5);
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              <img src="/watermark-dark.svg" style="height: 35px;" alt="watermark" />
            </div>
          </div>
        `
    }
  }

  // 下载图片
  const downloadImage = () => {
    if (!previewImage) return
    
    const link = document.createElement('a')
    link.download = `love-letter-${id}.png`
    link.href = previewImage
    link.click()
    
    toast({
      title: "Success",
      description: "Your love letter has been downloaded!",
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
          <div className="relative min-h-screen flex flex-col items-center justify-center py-10">
            <div className="w-full max-w-4xl space-y-12">
              {/* 标题占位 */}
              <div className="h-16 w-96 mx-auto bg-white/5 rounded-lg animate-pulse" />
              
              {/* 图片占位 */}
              <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-xl bg-white/5 animate-pulse" />
              
              {/* 内容占位 */}
              <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border border-white/10 space-y-4">
                <div className="h-6 bg-white/5 rounded animate-pulse w-[85%]" />
                <div className="h-6 bg-white/5 rounded animate-pulse w-[90%]" />
                <div className="h-6 bg-white/5 rounded animate-pulse w-[80%]" />
                <div className="h-6 bg-white/5 rounded animate-pulse w-[95%]" />
              </div>
            </div>
          </div>
        </div>
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
    <>
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
                    ref={contentRef}
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
                      className="text-5xl md:text-6xl font-bold text-center font-display tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1]"
                    >
                      Your Love Letter
                    </motion.h1>
                    <motion.div
                      className="mt-8 w-20 h-1 mx-auto bg-gradient-to-r from-[#738fbd] to-[#cc8eb1]"
                      initial={{ width: 0 }}
                      animate={{ width: 80 }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                    />

                    {/* 图片容器 */}
                    {letter.imageUrl && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                      >
                        <div className="relative w-full rounded-xl bg-black/40 overflow-hidden">
                          <div
                            className={cn(
                              'relative w-full pt-[56.25%]', // 16:9 默认比例
                              'max-h-[80vh]', // 最大高度限制
                              'transition-opacity duration-500',
                              imageLoaded ? 'opacity-100' : 'opacity-0'
                            )}
                          >
                            <Image
                              src={imageError ? '/placeholder.svg' : letter.imageUrl}
                              alt="Your special moment"
                              fill
                              className={cn(
                                'absolute top-0 left-0 w-full h-full object-contain',
                                letter.metadata?.orientation === 6 && 'rotate-90',
                                letter.metadata?.orientation === 3 && 'rotate-180',
                                letter.metadata?.orientation === 8 && '-rotate-90'
                              )}
                              onError={() => setImageError(true)}
                              onLoad={(e) => {
                                // 获取图片实际尺寸
                                const img = e.target as HTMLImageElement
                                const container = img.parentElement
                                if (container) {
                                  // 计算宽高比
                                  const ratio = img.naturalHeight / img.naturalWidth
                                  // 如果图片高度超过宽度的1.5倍（3:2），则限制高度
                                  if (ratio > 1.5) {
                                    container.style.paddingTop = '150%'
                                  } else {
                                    // 否则使用实际比例
                                    container.style.paddingTop = `${ratio * 100}%`
                                  }
                                }
                                setImageLoaded(true)
                              }}
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
                        {/* 内容区域的 loading 状态 */}
                        {letter.status === 'pending' && (
                          <div className="flex items-center justify-center space-x-3 py-8">
                            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" />
                          </div>
                        )}

                        {letter.status === 'generating' && (
                          <div className="flex items-center justify-center space-x-3 py-8">
                            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" />
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
                      {/* 底部状态指示器 */}
                      <motion.div
                        className="flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        {letter.status === 'pending' && (
                          <motion.div
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
                            <span className="text-white/80 text-sm">
                              {language === 'en' ? 'Creating your letter...' : '正在创建信件...'}
                            </span>
                          </motion.div>
                        )}

                        {letter.status === 'generating' && (
                          <motion.div
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
                            <span className="text-white/80 text-sm">
                              {language === 'en' ? 'Generating your letter...' : '正在生成信件...'}
                            </span>
                          </motion.div>
                        )}

                        {letter.status === 'completed' && (
                          <motion.div
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-[#00FF66]/20"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, type: 'spring' }}
                          >
                            <div className="w-2 h-2 bg-[#00FF66] rounded-full" />
                            <span className="text-[#00FF66] text-sm">
                              {language === 'en' ? 'Letter completed' : '信件已完成'}
                            </span>
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
                          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0"
                        >
                          <Button
                            variant="outline"
                            className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm text-sm transition-all duration-300 w-full sm:w-auto"
                            onClick={() => saveAsImage()}
                            disabled={isSaving}
                          >
                            <span className="flex items-center justify-center gap-2">
                              {isSaving ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  {language === 'en' ? 'Generating...' : '生成中...'}
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  {language === 'en' ? 'Save as Image' : '保存为图片'}
                                </>
                              )}
                            </span>
                          </Button>
                          <Link href="/history" className="w-full sm:w-auto">
                            <Button
                              variant="outline"
                              className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm text-sm transition-all duration-300 w-full"
                            >
                              {language === 'en' ? 'View History' : '查看历史'}
                            </Button>
                          </Link>
                          <Link href="/write" className="w-full sm:w-auto">
                            <Button
                              variant="outline"
                              className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm text-sm transition-all duration-300 w-full"
                            >
                              {language === 'en' ? 'Write Another' : '再写一封'}
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

      {/* Preview Dialog */}
      <ImagePreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        imageUrl={previewImage || ''}
        onDownload={downloadImage}
        templates={TEMPLATES}
        selectedTemplate={selectedTemplate}
        onTemplateChange={handleTemplateChange}
        isGenerating={isGenerating}
      />
    </>
  )
}
