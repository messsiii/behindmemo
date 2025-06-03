'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import {
    formatFileSize,
    getImageDimensions,
    isValidImageFile,
    resizeImageTo1080p
} from '@/lib/imageUtils'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
    Download,
    Home,
    Image as ImageIcon,
    Info,
    Loader2,
    Scissors,
    Sparkles,
    Upload,
    Wand2
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import useSWR from 'swr'

// 积分信息接口
interface CreditsInfo {
  credits: number
  isVIP: boolean
  vipExpiresAt: string | null
}

// 图片信息接口
interface ImageInfo {
  originalDimensions?: { width: number; height: number }
  processedDimensions?: { width: number; height: number }
  originalSize?: number
  processedSize?: number
}

// 数据获取函数
const fetcher = (url: string) =>
  fetch(url, {
    credentials: 'include',
  }).then(res => {
    if (!res.ok) throw new Error('Failed to fetch credits')
    return res.json()
  })

export default function FluxKontextPro() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [outputImage, setOutputImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageInfo, setImageInfo] = useState<ImageInfo>({})
  const [isMobile, setIsMobile] = useState(false)

  // 获取用户积分信息
  const {
    data: creditsInfo,
    mutate: mutateCredits
  } = useSWR<CreditsInfo>(
    session?.user?.id ? '/api/user/credits' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
    }
  )

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 页面加载时恢复保存的状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPrompt = localStorage.getItem('flux_prompt')
      const savedInputImage = localStorage.getItem('flux_input_image')
      const savedOutputImage = localStorage.getItem('flux_output_image')
      const savedImageInfo = localStorage.getItem('flux_image_info')
      
      if (savedPrompt) setPrompt(savedPrompt)
      if (savedInputImage) setInputImage(savedInputImage)
      if (savedOutputImage) setOutputImage(savedOutputImage)
      if (savedImageInfo) {
        try {
          setImageInfo(JSON.parse(savedImageInfo))
        } catch (e) {
          setImageInfo({})
        }
      }
    }
  }, [])

  // 保存状态到localStorage
  const saveState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flux_prompt', prompt)
      if (inputImage) localStorage.setItem('flux_input_image', inputImage)
      if (outputImage) localStorage.setItem('flux_output_image', outputImage)
      localStorage.setItem('flux_image_info', JSON.stringify(imageInfo))
    }
  }, [prompt, inputImage, outputImage, imageInfo])

  // 实时保存状态
  useEffect(() => {
    saveState()
  }, [saveState])

  // 处理图片文件
  const processImageFile = useCallback(async (file: File) => {
    // 在开始新的处理前，清理之前的输出图片
    setOutputImage(null)
    setIsProcessingImage(true)
    
    // 清理可能存在的旧图片内存
    if (typeof window !== 'undefined') {
      // 强制垃圾回收（如果可用）
      if (window.gc) {
        window.gc()
      }
    }
    
    try {
      // 验证文件格式
      if (!isValidImageFile(file)) {
        throw new Error(language === 'en' ? 'Please select a valid image file' : '请选择有效的图片文件')
      }

      // 获取原始尺寸
      const originalDimensions = await getImageDimensions(file)
      const originalSize = file.size

      // 调整图片尺寸
      const resizedBase64 = await resizeImageTo1080p(file)
      
      // 计算处理后的大小（base64大约比二进制大37%）
      const processedSize = Math.round(resizedBase64.length / 1.37)
      
      // 计算处理后的尺寸（从base64获取）
      const processedDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        if (typeof window === 'undefined') {
          // 服务器端无法处理图片，返回默认尺寸
          resolve({ width: 1920, height: 1080 })
          return
        }
        
        const img = new window.Image()
        
        // 设置超时，避免永久挂起
        const timeout = setTimeout(() => {
          img.onload = null
          img.onerror = null
          reject(new Error('Image processing timeout'))
        }, 10000) // 10秒超时
        
        img.onload = () => {
          clearTimeout(timeout)
          resolve({ width: img.width, height: img.height })
          // 清理Image对象
          img.onload = null
          img.onerror = null
          img.src = ''
        }
        img.onerror = () => {
          clearTimeout(timeout)
          img.onload = null
          img.onerror = null
          reject(new Error('Failed to load processed image'))
        }
        img.src = resizedBase64
      })

      const newImageInfo: ImageInfo = {
        originalDimensions,
        processedDimensions,
        originalSize,
        processedSize,
      }

      // 批量更新状态，避免多次渲染
      setInputImage(resizedBase64)
      setImageInfo(newImageInfo)

      toast({
        title: language === 'en' ? 'Image processed successfully!' : '图片处理成功！',
        description: language === 'en' 
          ? `Resized from ${originalDimensions.width}×${originalDimensions.height} to ${processedDimensions.width}×${processedDimensions.height}`
          : `已从 ${originalDimensions.width}×${originalDimensions.height} 调整为 ${processedDimensions.width}×${processedDimensions.height}`,
      })

    } catch (error) {
      console.error('Image processing error:', error)
      
      // 处理失败时清理状态
      setInputImage(null)
      setImageInfo({})
      
      toast({
        title: language === 'en' ? 'Image processing failed' : '图片处理失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setIsProcessingImage(false)
    }
  }, [language])

  // 文件上传处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB限制
        toast({
          title: language === 'en' ? 'File too large' : '文件过大',
          description: language === 'en' ? 'Please select an image smaller than 50MB' : '请选择小于50MB的图片',
          variant: 'destructive',
        })
        return
      }

      processImageFile(file)
    }
  }, [language, processImageFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  })

  // 生成图片
  const generateImage = async () => {
    if (!inputImage || !prompt.trim()) {
      toast({
        title: language === 'en' ? 'Missing inputs' : '缺少输入',
        description: language === 'en' ? 'Please upload an image and enter a prompt' : '请上传图片并输入提示词',
        variant: 'destructive',
      })
      return
    }

    if ((creditsInfo?.credits || 0) < 10) {
      toast({
        title: language === 'en' ? 'Insufficient credits' : '积分不足',
        description: language === 'en' ? 'You need 10 credits to generate an image' : '您需要10个积分来生成图片',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    setOutputImage(null)

    try {
      console.log('Starting image generation...')
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          input_image: inputImage,
        }),
        // 添加超时处理
        signal: AbortSignal.timeout(300000), // 5分钟超时
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Generation successful, received data')

      if (!data.output) {
        throw new Error('No output received from API')
      }

      setOutputImage(data.output)
      // 刷新积分信息
      mutateCredits()
      
      toast({
        title: language === 'en' ? 'Generation successful!' : '生成成功！',
        description: language === 'en' ? 'Your image has been generated' : '您的图片已生成',
      })

    } catch (error) {
      console.error('Generation error:', error)
      
      // 根据错误类型提供不同的处理
      const errorMessage = language === 'en' ? 'Generation failed' : '生成失败'
      let errorDescription = language === 'en' ? 'Please try again' : '请重试'
      let shouldRefresh = false
      
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          errorDescription = language === 'en' ? 'Request timed out. Please try again.' : '请求超时，请重试。'
        } else if (error.message.includes('fetch')) {
          errorDescription = language === 'en' ? 'Network error. Please check your connection.' : '网络错误，请检查连接。'
        } else if (error.message.includes('memory') || error.message.includes('Memory')) {
          errorDescription = language === 'en' ? 'Memory error. Page will refresh to free memory.' : '内存错误，页面将刷新以释放内存。'
          shouldRefresh = true
        } else {
          errorDescription = error.message
        }
      }
      
      toast({
        title: errorMessage,
        description: errorDescription + (shouldRefresh ? (language === 'en' ? ' Refreshing...' : ' 正在刷新...') : ''),
        variant: 'destructive',
      })

      // 只在必要时刷新页面
      if (shouldRefresh) {
        // 保存状态
        saveState()
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        // 刷新积分信息以防状态不一致
        mutateCredits()
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // 下载图片
  const downloadImage = () => {
    if (outputImage) {
      const link = document.createElement('a')
      link.href = outputImage
      link.download = `flux-generated-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 清空所有内容
  const clearAll = useCallback(() => {
    // 批量清理状态
    setInputImage(null)
    setPrompt('')
    setOutputImage(null)
    setImageInfo({})
    setIsProcessingImage(false)
    setIsGenerating(false)
    
    // 清理localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flux_prompt')
      localStorage.removeItem('flux_input_image')
      localStorage.removeItem('flux_output_image')
      localStorage.removeItem('flux_image_info')
      
      // 强制垃圾回收
      if (window.gc) {
        window.gc()
      }
    }
    
    toast({
      title: language === 'en' ? 'All content cleared' : '已清空所有内容',
      description: language === 'en' ? 'Ready for new image generation' : '准备进行新的图片生成',
    })
  }, [language])

  // 添加内存监控和清理
  useEffect(() => {
    let memoryCheckInterval: NodeJS.Timeout

    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      memoryCheckInterval = setInterval(() => {
        const memory = (window.performance as any).memory
        if (memory && memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
          console.warn('High memory usage detected, suggesting cleanup')
          // 不自动清理，只记录日志
        }
      }, 30000) // 每30秒检查一次
    }

    return () => {
      if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval)
      }
    }
  }, [])

  // 页面卸载时清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 清理可能的大对象
      if (typeof window !== 'undefined' && window.gc) {
        window.gc()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
              <Home className="w-4 h-4" />
              {language === 'en' ? 'Back to Home' : '返回首页'}
            </Link>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                AI Image Generation
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              {language === 'en' 
                ? 'Transform your images with AI-powered generation using Flux Kontext Pro'
                : '使用 Flux Kontext Pro 的 AI 技术转换您的图片'
              }
            </p>
          </motion.div>
        </div>

        {/* 积分显示 */}
        {creditsInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <div className="bg-black/20 backdrop-blur-lg rounded-full px-6 py-3 border border-white/10">
              <div className="flex items-center gap-3 text-white">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="font-medium">
                  <span className={creditsInfo.isVIP ? "text-yellow-400" : "text-white"}>
                    {creditsInfo.isVIP && <span className="text-yellow-400">VIP </span>}
                    {creditsInfo.credits} {language === 'en' ? 'Credits' : '积分'}
                  </span>
                </span>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/60">
                  {language === 'en' ? '10 credits per generation' : '每次生成消耗10积分'}
                </span>
                <span className="text-white/60">•</span>
                <Link href="/gen/results" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                  {language === 'en' ? 'View History' : '查看历史'}
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 输入图片 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  {language === 'en' ? 'Input Image' : '输入图片'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {language === 'en' ? 'Upload an image to transform' : '上传要转换的图片'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                    isDragActive || dragActive
                      ? "border-purple-400 bg-purple-400/10"
                      : "border-white/20 hover:border-white/40 hover:bg-white/5",
                    inputImage && "border-green-400"
                  )}
                >
                  <input {...getInputProps()} />
                  {isProcessingImage ? (
                    <div className="space-y-4">
                      <Scissors className="w-12 h-12 text-purple-400 mx-auto animate-pulse" />
                      <div>
                        <p className="text-purple-400 font-medium">
                          {language === 'en' ? 'Processing image...' : '正在处理图片...'}
                        </p>
                        <p className="text-sm text-white/60 mt-2">
                          {language === 'en' ? 'Resizing to 1080p and optimizing' : '正在调整为1080p并优化'}
                        </p>
                      </div>
                    </div>
                  ) : inputImage ? (
                    <div className="space-y-4">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden">
                        <Image
                          src={inputImage}
                          alt="Input"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="text-left space-y-2">
                        <p className="text-sm text-green-400 font-medium">
                          {language === 'en' ? 'Image processed successfully' : '图片处理成功'}
                        </p>
                        {imageInfo.originalDimensions && imageInfo.processedDimensions && (
                          <div className="text-xs text-white/60 space-y-1">
                            <div className="flex items-center gap-2">
                              <Info className="w-3 h-3" />
                              <span>
                                {language === 'en' ? 'Original:' : '原始:'} {imageInfo.originalDimensions.width}×{imageInfo.originalDimensions.height}
                                {imageInfo.originalSize && ` (${formatFileSize(imageInfo.originalSize)})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Scissors className="w-3 h-3" />
                              <span>
                                {language === 'en' ? 'Processed:' : '处理后:'} {imageInfo.processedDimensions.width}×{imageInfo.processedDimensions.height}
                                {imageInfo.processedSize && ` (${formatFileSize(imageInfo.processedSize)})`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 text-white/40 mx-auto" />
                      <div>
                        <p className="text-white/80">
                          {language === 'en' ? 'Drop an image here or click to upload' : '将图片拖放到此处或点击上传'}
                        </p>
                        <p className="text-sm text-white/60 mt-2">
                          {language === 'en' ? 'Supports PNG, JPG, JPEG, WebP (max 50MB)' : '支持 PNG、JPG、JPEG、WebP（最大50MB）'}
                        </p>
                        <p className="text-xs text-purple-400 mt-1">
                          {language === 'en' ? 'Auto-resize to 1080p for optimal processing' : '自动调整为1080p以优化处理'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 提示词输入 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-pink-400" />
                  {language === 'en' ? 'Prompt' : '提示词'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {language === 'en' ? 'Describe how you want to transform the image' : '描述您希望如何转换图片'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt" className="text-white/80">
                    {language === 'en' ? 'Transformation prompt' : '转换提示词'}
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder={language === 'en' 
                      ? "Make this a 90s cartoon, cyberpunk style, oil painting..." 
                      : "制作成90年代卡通风格、赛博朋克风格、油画风格..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
                    rows={6}
                  />
                </div>

                {/* 生成按钮 */}
                <Button
                  onClick={generateImage}
                  disabled={!inputImage || !prompt.trim() || isGenerating || isProcessingImage || (creditsInfo?.credits || 0) < 10}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'en' ? 'Generating...' : '生成中...'}
                    </>
                  ) : isProcessingImage ? (
                    <>
                      <Scissors className="w-4 h-4 mr-2 animate-pulse" />
                      {language === 'en' ? 'Processing Image...' : '处理图片中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Generate Image' : '生成图片'}
                    </>
                  )}
                </Button>

                {/* 清空按钮 */}
                <Button
                  onClick={clearAll}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  {language === 'en' ? 'Clear All' : '清空所有'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* 输出预览 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  {language === 'en' ? 'Generated Output' : '生成结果'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {language === 'en' ? 'Your AI-transformed image will appear here' : 'AI转换后的图片将显示在这里'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <p className="text-white/80 text-center">
                      {language === 'en' ? 'AI is processing your image...' : 'AI正在处理您的图片...'}
                    </p>
                    <p className="text-sm text-white/60 text-center">
                      {language === 'en' ? 'This may take 30-60 seconds' : '这可能需要30-60秒'}
                    </p>
                  </div>
                ) : outputImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-64 rounded-lg overflow-hidden">
                      <Image
                        src={outputImage}
                        alt="Generated"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    {isMobile ? (
                      <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-sm text-white/80 mb-2">
                          {language === 'en' ? 'To save image:' : '保存图片:'}
                        </p>
                        <p className="text-xs text-white/60">
                          {language === 'en' ? 'Long press the image above and select "Save Image"' : '长按上方图片并选择"保存图片"'}
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={downloadImage}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {language === 'en' ? 'Download Image' : '下载图片'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-16 h-16 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white/60 text-center">
                      {language === 'en' ? 'Generated image will appear here' : '生成的图片将显示在这里'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
} 