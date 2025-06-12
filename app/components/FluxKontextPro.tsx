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
    Edit3,
    History,
    Home,
    Image as ImageIcon,
    Info,
    Loader2,
    RefreshCw,
    Scissors,
    Sparkles,
    Trash2,
    Upload,
    Wand2
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { memo, useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import useSWR from 'swr'
import MultiImageEditor, { EditState } from './MultiImageEditor'

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

// 图片生成记录接口
interface ImageGenerationRecord {
  id: string
  prompt: string
  inputImageUrl: string
  outputImageUrl: string | null
  localOutputImageUrl?: string | null
  status: 'pending' | 'completed' | 'failed'
  creditsUsed: number
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

// 数据获取函数
const fetcher = (url: string) =>
  fetch(url, {
    credentials: 'include',
  }).then(res => {
    if (!res.ok) throw new Error('Failed to fetch credits')
    return res.json()
  })

// 优化的输入图片组件 - 防止重新渲染导致闪烁
const InputImagePreview = memo(({ 
  src, 
  onError
}: { 
  src: string, 
  onError: (e: any) => void
}) => {
  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden">
      <Image
        src={src}
        alt="Input"
        fill
        className="object-contain"
        unoptimized
        onError={onError}
        priority
      />
    </div>
  )
})
InputImagePreview.displayName = 'InputImagePreview'

// 优化的输出图片组件 - 防止重新渲染导致闪烁
const OutputImagePreview = memo(({ 
  src, 
  onError
}: { 
  src: string, 
  onError: (e: any) => void
}) => {
  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden">
      <Image
        src={src}
        alt="Generated"
        fill
        className="object-contain"
        unoptimized
        onError={onError}
        priority
      />
    </div>
  )
})
OutputImagePreview.displayName = 'OutputImagePreview'

// 优化的历史图片组件 - 防止重新渲染导致闪烁
const HistoryImagePreview = memo(({ 
  src, 
  alt,
  onError 
}: { 
  src: string, 
  alt: string,
  onError: (e: any) => void
}) => {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        unoptimized
        onError={onError}
        loading="lazy"
      />
    </div>
  )
})
HistoryImagePreview.displayName = 'HistoryImagePreview'

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
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationInfo, setTranslationInfo] = useState<{
    originalText: string
    translatedText: string
    detectedLanguage: string
    isTranslated: boolean
  } | null>(null)
  const [historyRecords, setHistoryRecords] = useState<ImageGenerationRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [historyPage, setHistoryPage] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false)
  const [editorImages, setEditorImages] = useState<File[]>([])

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

  // 获取历史记录
  useEffect(() => {
    if (session?.user?.id) {
      fetchGenerationHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // 创建稳定的错误处理函数 - 防止图片组件重新渲染
  const handleInputImageError = useCallback((e: any) => {
    console.warn('Input image load error:', e)
  }, [])

  const handleOutputImageError = useCallback((e: any) => {
    console.warn('Output image load error:', e)
  }, [])

  const handleHistoryImageError = useCallback((e: any) => {
    console.warn('History image load error:', e)
  }, [])



  // 分离prompt保存以减少重新渲染
  const savePrompt = useCallback((promptValue: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('flux_prompt', promptValue)
      } catch (error) {
        console.warn('Failed to save prompt:', error)
      }
    }
  }, [])

  // 保存图片状态（优化版本）
  const saveImageState = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        // 只保存non-blob图片URL，避免内存泄漏
        if (inputImage && !inputImage.startsWith('blob:')) {
          localStorage.setItem('flux_input_image', inputImage)
        } else {
          localStorage.removeItem('flux_input_image')
        }
        
        if (outputImage && !outputImage.startsWith('blob:')) {
          localStorage.setItem('flux_output_image', outputImage)
        } else {
          localStorage.removeItem('flux_output_image')
        }
        
        // 简化图片信息存储
        const simpleImageInfo = {
          processedDimensions: imageInfo.processedDimensions,
          processedSize: imageInfo.processedSize
        }
        localStorage.setItem('flux_image_info', JSON.stringify(simpleImageInfo))
      } catch (error) {
        // localStorage可能满了，清理旧数据
        console.warn('localStorage save failed:', error)
        try {
          localStorage.removeItem('flux_input_image')
          localStorage.removeItem('flux_output_image')
        } catch (e) {
          // 忽略清理错误
        }
      }
    }
  }, [inputImage, outputImage, imageInfo])

  // 实时保存prompt（防抖优化）
  useEffect(() => {
    const timer = setTimeout(() => {
      savePrompt(prompt)
    }, 300) // 300ms防抖
    
    return () => clearTimeout(timer)
  }, [prompt, savePrompt])

  // 保存图片状态（当图片改变时）
  useEffect(() => {
    saveImageState()
  }, [saveImageState])

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 清理可能的内存泄漏
      if (typeof window !== 'undefined') {
        // 清理可能存在的URL对象
        const urlsToClean = [inputImage, outputImage].filter((url): url is string => 
          url !== null && url !== undefined && url.startsWith('blob:')
        )
        urlsToClean.forEach(url => {
          try {
            URL.revokeObjectURL(url)
          } catch (e) {
            // 忽略清理错误
          }
        })
        
        // 强制垃圾回收（如果可用）
        if (window.gc) {
          window.gc()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 处理图片文件
  const processImageFile = useCallback(async (file: File) => {
    // 在开始新的处理前，清理之前的输出图片
    setOutputImage(null)
    setIsProcessingImage(true)
    
    // 清理之前的blob URL
    if (inputImage && inputImage.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(inputImage)
      } catch (e) {
        // 忽略清理错误
      }
    }
    
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
  }, [language, inputImage])

  // 打开图片编辑器
  const openImageEditor = useCallback(() => {
    // 每次都提供干净的编辑环境
    const initialImages: File[] = []
    
    // 如果当前有输入图片，转换为File对象作为初始图片
    if (inputImage && inputImage.startsWith('data:')) {
      try {
        // 从base64创建File对象
        const byteString = atob(inputImage.split(',')[1])
        const mimeString = inputImage.split(',')[0].split(':')[1].split(';')[0]
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        const blob = new Blob([ab], { type: mimeString })
        const file = new File([blob], 'current-image.jpg', { type: mimeString })
        initialImages.push(file)
      } catch (error) {
        console.warn('Failed to convert current image to File:', error)
      }
    }
    
    setEditorImages(initialImages)
    setIsImageEditorOpen(true)
    console.log('打开干净的图片编辑器，初始图片:', initialImages.length)
  }, [inputImage])

  // 处理图片编辑确认
  const handleImageEditConfirm = useCallback(async (resultImage: File, editState: EditState) => {
    try {
      setIsImageEditorOpen(false)
      
      // 记录编辑状态（用于调试和未来功能扩展）
      console.log('Image editing completed with state:', {
        imageCount: editState.images.length,
        ratio: editState.ratio,
        markBoxesCount: editState.markBoxes.length
      })
      
      // 使用编辑结果处理图片
      await processImageFile(resultImage)
      
      toast({
        title: language === 'en' ? 'Image editing completed' : '图片编辑完成',
        description: language === 'en' ? 'Multi-image composition applied successfully' : '多图拼合已成功应用',
      })
    } catch (error) {
      console.error('Error applying edited image:', error)
      toast({
        title: language === 'en' ? 'Edit application failed' : '编辑应用失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    }
  }, [language, processImageFile])

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

    // 创建AbortController来管理请求
    const abortController = new AbortController()
    
    setIsGenerating(true)
    setOutputImage(null)
    setTranslationInfo(null)

    try {
      console.log('Starting prompt translation check...')
      setIsTranslating(true)
      
      // 首先检测和翻译提示词
      const translateResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt.trim(),
        }),
        signal: abortController.signal,
      })

      if (!translateResponse.ok) {
        console.warn('Translation failed, using original prompt')
        // 翻译失败时继续使用原提示词
      }

      let finalPrompt = prompt.trim()
      let translationData = null

      try {
        translationData = await translateResponse.json()
        if (translationData && translationData.translatedText) {
          finalPrompt = translationData.translatedText
          setTranslationInfo(translationData)
          
          if (translationData.isTranslated) {
            toast({
              title: language === 'en' ? 'Prompt translated' : '提示词已翻译',
              description: language === 'en' 
                ? `Detected ${getLanguageName(translationData.detectedLanguage)} and translated to English`
                : `检测到${getLanguageName(translationData.detectedLanguage)}并已翻译为英语`,
            })
          }
        }
      } catch (translateError) {
        console.warn('Translation response parsing failed:', translateError)
      }

      setIsTranslating(false)
      console.log('Starting image generation with prompt:', finalPrompt)
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          input_image: inputImage,
        }),
        signal: abortController.signal,
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }))
        
        // 检查是否是内容审核失败
        if (errorData.error && (
          errorData.error.includes('flagged as sensitive') ||
          errorData.error.includes('E005') ||
          errorData.error.includes('content policy')
        )) {
          throw new Error('CONTENT_FLAGGED')
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Generation successful, received data')

      if (!data.output) {
        throw new Error('No output received from API')
      }

      setOutputImage(data.output)
      // 刷新积分信息和历史记录
      mutateCredits()
      // 使用智能刷新而不是全量刷新
      setTimeout(() => refreshHistoryWithNewData(), 1000)
      
      toast({
        title: language === 'en' ? 'Generation successful!' : '生成成功！',
        description: language === 'en' ? 'Your image has been generated' : '您的图片已生成',
      })

    } catch (error) {
      console.error('Generation error:', error)
      
      // 检查是否是取消请求
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation aborted')
        return
      }
      
      // 根据错误类型提供不同的处理
      const errorMessage = language === 'en' ? 'Generation failed' : '生成失败'
      let errorDescription = language === 'en' ? 'Please try again' : '请重试'
      let shouldRefresh = false
      
      if (error instanceof Error) {
        if (error.message === 'CONTENT_FLAGGED') {
          errorDescription = language === 'en' 
            ? 'Content flagged as sensitive. Please try with different, family-friendly prompts. Avoid words like "bikini", "sexy", "nude", etc.'
            : '内容被标记为敏感。请尝试使用不同的、健康的提示词。避免使用如"比基尼"、"性感"、"裸体"等词汇。'
        } else if (error.name === 'TimeoutError') {
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
        // 保存当前状态
        savePrompt(prompt)
        saveImageState()
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        // 刷新积分信息以防状态不一致
        mutateCredits()
      }
    } finally {
      setIsGenerating(false)
      setIsTranslating(false)
      
      // 清理AbortController
      if (!abortController.signal.aborted) {
        abortController.abort()
      }
      
      // 清理内存
      if (typeof window !== 'undefined' && window.gc) {
        setTimeout(() => {
          if (window.gc) window.gc()
        }, 1000)
      }
    }
  }

  // 下载历史记录中的图片
  const downloadHistoryImage = async (imageUrl: string, prompt: string, id: string) => {
    // 生成文件名：使用提示词前20个字符，去掉空格和特殊字符，加上记录ID
    const cleanPrompt = prompt
      .slice(0, 20) // 取前20个字符
      .replace(/\s+/g, '') // 去掉所有空格
      .replace(/[^\w\u4e00-\u9fa5]/g, '') // 去掉特殊字符，保留字母数字和中文
    
    const fileName = cleanPrompt ? `${cleanPrompt}-${id}.png` : `flux-generated-${id}.png`
    
    try {
      // 获取图片数据
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      
      // 创建本地 URL
      const url = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      
      // 清理
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Download failed:', error)
      // 降级到直接链接
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = fileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 使用生成的图片作为输入
  const useAsInput = () => {
    if (!outputImage) return
    
    // 设置生成的图片为新的输入图片
    setInputImage(outputImage)
    // 清空输出图片和翻译信息
    setOutputImage(null)
    setTranslationInfo(null)
    
    // 重置图片信息为默认值
    setImageInfo({
      processedDimensions: { width: 1024, height: 1024 },
      processedSize: 0,
    })
    
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    toast({
      title: language === 'en' ? 'Image set as input' : '图片已设为输入',
      description: language === 'en' ? 'Generated image is now ready for further transformation' : '生成的图片现在可以进行进一步转换',
    })
  }

  // 使用历史记录中的图片作为输入
  const setHistoryImageAsInput = (imageUrl: string, isInputImage = false) => {
    // 设置图片为新的输入图片
    setInputImage(imageUrl)
    // 清空输出图片和翻译信息
    setOutputImage(null)
    setTranslationInfo(null)
    
    // 重置图片信息为默认值
    setImageInfo({
      processedDimensions: { width: 1024, height: 1024 },
      processedSize: 0,
    })
    
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    const imageType = isInputImage 
      ? (language === 'en' ? 'input image' : '输入图片')
      : (language === 'en' ? 'generated result' : '生成结果')
    
    toast({
      title: language === 'en' ? 'Image set as input' : '图片已设为输入',
      description: language === 'en' 
        ? `Using ${imageType} as new input for transformation`
        : `已将${imageType}设为新的转换输入`,
    })
  }

  // 获取生成历史
  const fetchGenerationHistory = useCallback(async (page = 0, isRefresh = false) => {
    if (!session?.user?.id) return
    
    // 创建AbortController
    const controller = new AbortController()
    
    if (page === 0) {
      setIsLoadingHistory(true)
    } else {
      setIsLoadingMore(true)
    }
    
    try {
      const limit = 20
      const offset = page * limit
      const response = await fetch(`/api/user/generation-history?limit=${limit}&offset=${offset}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch generation history')
      }
      
      const data = await response.json()
      const newRecords = data.records || []
      
      if (page === 0 || isRefresh) {
        // 首次加载或刷新
        setHistoryRecords(newRecords)
        setHistoryPage(0)
      } else {
        // 加载更多
        setHistoryRecords(prev => [...prev, ...newRecords])
      }
      
      // 更新分页状态
      setHasMoreHistory(newRecords.length === limit)
      setHistoryPage(page)
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Fetch aborted')
        return
      }
      
      console.error('Error fetching generation history:', error)
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: language === 'en' ? 'Failed to load generation history' : '加载生成历史失败',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingHistory(false)
      setIsLoadingMore(false)
      
      // 清理controller
      controller.abort()
    }
  }, [session?.user?.id, language])

  // 刷新历史记录（智能插入新数据）
  const refreshHistoryWithNewData = async () => {
    if (!session?.user?.id) return
    
    try {
      // 获取最新的前20条记录
      const response = await fetch('/api/user/generation-history?limit=20&offset=0')
      if (!response.ok) return
      
      const data = await response.json()
      const latestRecords = data.records || []
      
      if (latestRecords.length === 0) return
      
      // 找到新记录（不在当前列表中的）
      const existingIds = new Set(historyRecords.map(r => r.id))
      const newRecords = latestRecords.filter((r: ImageGenerationRecord) => !existingIds.has(r.id))
      
      if (newRecords.length > 0) {
        // 将新记录插入到列表开头
        setHistoryRecords(prev => [...newRecords, ...prev])
        
        toast({
          title: language === 'en' ? 'New generations loaded' : '已加载新生成记录',
          description: language === 'en' 
            ? `${newRecords.length} new record(s) added`
            : `已添加 ${newRecords.length} 条新记录`,
        })
      }
    } catch (error) {
      console.error('Error refreshing history:', error)
    }
  }

  // 加载更多历史记录
  const loadMoreHistory = () => {
    if (!isLoadingMore && hasMoreHistory) {
      fetchGenerationHistory(historyPage + 1)
    }
  }

  // 删除生成记录
  const deleteRecord = async (id: string) => {
    const controller = new AbortController()
    setDeletingId(id)
    
    try {
      const response = await fetch(`/api/user/generation-history/${id}`, {
        method: 'DELETE',
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to delete record')
      }

      setHistoryRecords(prev => prev.filter(record => record.id !== id))
      toast({
        title: language === 'en' ? 'Deleted' : '已删除',
        description: language === 'en' ? 'Generation record deleted successfully' : '生成记录已成功删除',
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Delete aborted')
        return
      }
      
      console.error('Error deleting record:', error)
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: language === 'en' ? 'Failed to delete record' : '删除记录失败',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
      controller.abort()
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // 获取状态颜色和文本
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'failed': return 'text-red-400'
      case 'pending': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return language === 'en' ? 'Completed' : '已完成'
      case 'failed': return language === 'en' ? 'Failed' : '失败'
      case 'pending': return language === 'en' ? 'Pending' : '处理中'
      default: return status
    }
  }

  // 获取语言名称的辅助函数
  const getLanguageName = (langCode: string): string => {
    const languageNames: { [key: string]: { en: string; zh: string } } = {
      'zh': { en: 'Chinese', zh: '中文' },
      'zh-cn': { en: 'Chinese (Simplified)', zh: '简体中文' },
      'zh-tw': { en: 'Chinese (Traditional)', zh: '繁体中文' },
      'ja': { en: 'Japanese', zh: '日语' },
      'ko': { en: 'Korean', zh: '韩语' },
      'es': { en: 'Spanish', zh: '西班牙语' },
      'fr': { en: 'French', zh: '法语' },
      'de': { en: 'German', zh: '德语' },
      'ru': { en: 'Russian', zh: '俄语' },
      'ar': { en: 'Arabic', zh: '阿拉伯语' },
      'hi': { en: 'Hindi', zh: '印地语' },
      'pt': { en: 'Portuguese', zh: '葡萄牙语' },
      'it': { en: 'Italian', zh: '意大利语' },
      'th': { en: 'Thai', zh: '泰语' },
      'vi': { en: 'Vietnamese', zh: '越南语' },
      'en': { en: 'English', zh: '英语' },
    }
    
    const langInfo = languageNames[langCode.toLowerCase()]
    if (langInfo) {
      return language === 'en' ? langInfo.en : langInfo.zh
    }
        return langCode.toUpperCase()
}

  // 下载图片
  const downloadImage = async () => {
    if (!outputImage) return
    
    // 生成文件名：使用提示词前20个字符，去掉空格和特殊字符，加上时间戳
    const generateFileName = () => {
      const cleanPrompt = prompt
        .slice(0, 20) // 取前20个字符
        .replace(/\s+/g, '') // 去掉所有空格
        .replace(/[^\w\u4e00-\u9fa5]/g, '') // 去掉特殊字符，保留字母数字和中文
      
      const timestamp = Date.now()
      return cleanPrompt ? `${cleanPrompt}-${timestamp}.png` : `flux-generated-${timestamp}.png`
    }
    
    const fileName = generateFileName()
    
    try {
      // 获取图片数据
      const response = await fetch(outputImage)
      const blob = await response.blob()
      
      // 创建本地 URL
      const url = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      
      // 清理
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Download failed:', error)
      // 降级到直接链接
      const link = document.createElement('a')
      link.href = outputImage
      link.download = fileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 清空提示词
  const clear = useCallback(() => {
    // 只清理提示词相关状态，保留输入和输出图片
    setPrompt('')
    setIsGenerating(false)
    setIsTranslating(false)
    setTranslationInfo(null)
    
    // 只清理提示词localStorage，保留图片
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flux_prompt')
    }
    
    toast({
      title: language === 'en' ? 'Prompt cleared' : '提示词已清空',
      description: language === 'en' ? 'Images preserved' : '图片已保留',
    })
  }, [language])

  // 添加内存监控和清理
  useEffect(() => {
    let memoryCheckInterval: NodeJS.Timeout

    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      memoryCheckInterval = setInterval(() => {
        const memory = (window.performance as any).memory
        if (memory && memory.usedJSHeapSize > 200 * 1024 * 1024) { // 提高到200MB
          console.warn('High memory usage detected, suggesting cleanup')
          // 执行轻量级清理
          if (window.gc) {
            setTimeout(() => {
              if (window.gc) window.gc()
            }, 100)
          }
        }
      }, 60000) // 改为每60秒检查一次
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
              <span 
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent !bg-clip-text !text-transparent"
                data-title="ai-generation"
                style={{
                  background: 'linear-gradient(90deg, #c084fc 0%, #f472b6 50%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                AI Image Generation
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              {language === 'en' 
                ? 'AI Image Editing that surpasses ChatGPT'
                : '超过 ChatGPT 的图片编辑'
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
            <Card className="!bg-black/20 backdrop-blur-lg border-white/10 text-white h-full" data-card="gen-card" style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
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
                      <InputImagePreview
                        src={inputImage}
                        onError={handleInputImageError}
                      />
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

                {/* 独立的图片编辑功能区域 */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-white/80">
                        {language === 'en' ? 'Multi-Image Editor' : '多图片编辑器'}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      {language === 'en' 
                        ? 'Combine multiple images into custom aspect ratios' 
                        : '将多张图片拼合成自定义比例'
                      }
                    </p>
                    <Button
                      onClick={openImageEditor}
                      variant="outline"
                      size="sm"
                      className="w-full border-purple-400/50 text-purple-200 hover:bg-purple-400/20 hover:text-purple-100 hover:border-purple-300 bg-purple-500/10"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Open Image Editor' : '打开图片编辑器'}
                    </Button>
                  </div>
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
            <Card className="!bg-black/20 backdrop-blur-lg border-white/10 text-white h-full" data-card="gen-card" style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
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
                  
                  {/* 翻译信息显示 */}
                  {translationInfo && (
                    <div className="mt-2 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                      <div className="text-xs text-blue-400 mb-1">
                        {language === 'en' ? 'Language Detection & Translation' : '语言检测与翻译'}
                      </div>
                      <div className="text-sm text-white/80">
                        {translationInfo.isTranslated ? (
                          <>
                            <div className="text-white/60 mb-1">
                              {language === 'en' ? 'Original:' : '原文:'} &ldquo;{translationInfo.originalText}&rdquo;
                            </div>
                            <div className="text-green-400">
                              {language === 'en' ? 'Translated:' : '翻译:'} &ldquo;{translationInfo.translatedText}&rdquo;
                            </div>
                            <div className="text-xs text-blue-400 mt-1">
                              {language === 'en' 
                                ? `Detected language: ${getLanguageName(translationInfo.detectedLanguage)}`
                                : `检测语言: ${getLanguageName(translationInfo.detectedLanguage)}`
                              }
                            </div>
                          </>
                        ) : (
                          <div className="text-green-400">
                            {language === 'en' 
                              ? `Already in English (${getLanguageName(translationInfo.detectedLanguage)})`
                              : `已是英语 (${getLanguageName(translationInfo.detectedLanguage)})`
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 生成按钮 */}
                <Button
                  onClick={generateImage}
                  disabled={!inputImage || !prompt.trim() || isGenerating || isProcessingImage || isTranslating || (creditsInfo?.credits || 0) < 10}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    isTranslating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {language === 'en' ? 'Translating...' : '翻译中...'}
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {language === 'en' ? 'Generating...' : '生成中...'}
                      </>
                    )
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
                  onClick={clear}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  {language === 'en' ? 'Clear' : '清空'}
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
            <Card className="!bg-black/20 backdrop-blur-lg border-white/10 text-white h-full" data-card="gen-card" style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
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
                    <OutputImagePreview
                      src={outputImage}
                      onError={handleOutputImageError}
                    />
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
                      <div className="space-y-2">
                        <Button
                          onClick={downloadImage}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {language === 'en' ? 'Download Image' : '下载图片'}
                        </Button>
                        <Button
                          onClick={useAsInput}
                          variant="outline"
                          className="w-full border-purple-400 text-purple-200 hover:bg-purple-400/20 hover:text-purple-100 hover:border-purple-300 bg-purple-500/10 font-medium"
                          data-button="purple-outline"
                        >
                          use as input
                        </Button>
                      </div>
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

        {/* 生成历史 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              <span 
                className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                data-title="history-title"
                style={{
                  background: 'linear-gradient(90deg, #c084fc 0%, #f472b6 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {language === 'en' ? 'Generation History' : '生成历史'}
              </span>

            </h2>
            <Button
              onClick={() => fetchGenerationHistory(0, true)}
              disabled={isLoadingHistory}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              {isLoadingHistory ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {language === 'en' ? 'Refresh' : '刷新'}
            </Button>
          </div>

          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center h-32 space-y-4">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-white/80 text-center">
                {language === 'en' ? 'Loading history...' : '加载历史中...'}
              </p>
            </div>
          ) : historyRecords.length === 0 ? (
            <Card className="!bg-black/20 backdrop-blur-lg border-white/10 text-white" data-card="gen-card" style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'en' ? 'No generations yet' : '暂无生成记录'}
                </h3>
                <p className="text-white/60">
                  {language === 'en' 
                    ? 'Your generation history will appear here'
                    : '您的生成历史将显示在这里'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* 历史记录网格 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {historyRecords.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="!bg-black/20 backdrop-blur-lg border-white/10 text-white" data-card="gen-card" style={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm mb-1" title={record.prompt}>
                              <span className="line-clamp-2">{record.prompt}</span>
                            </CardTitle>
                            <CardDescription className="text-white/60 text-xs">
                              {formatDate(record.createdAt)} • {record.creditsUsed} {language === 'en' ? 'credits' : '积分'}
                            </CardDescription>
                          </div>
                          <div className={cn("text-xs px-2 py-1 rounded-full shrink-0 ml-2", getStatusColor(record.status))}>
                            {getStatusText(record.status)}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* 原图 */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-white/80">
                              {language === 'en' ? 'Input Image' : '输入图片'}
                            </h4>
                            <HistoryImagePreview
                              src={record.inputImageUrl}
                              alt="Input"
                              onError={handleHistoryImageError}
                            />
                            {/* 原图操作按钮 */}
                            <div className="flex gap-1">
                              <Button
                                onClick={() => downloadHistoryImage(record.inputImageUrl, record.prompt + '-input', record.id)}
                                size="sm"
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-7"
                              >
                                download
                              </Button>
                              <Button
                                onClick={() => setHistoryImageAsInput(record.inputImageUrl, true)}
                                size="sm"
                                variant="outline"
                                className="flex-1 border-purple-400/50 text-purple-200 hover:bg-purple-400/20 hover:text-purple-100 hover:border-purple-300 bg-purple-500/10 text-xs h-7 font-medium"
                                title={language === 'en' ? 'Use as Input' : 'Use as Input'}
                                data-button="purple-outline"
                              >
                                use as input
                              </Button>
                            </div>
                          </div>

                          {/* 生成结果 */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-white/80">
                              {language === 'en' ? 'Generated Result' : '生成结果'}
                            </h4>
                            {record.status === 'completed' && (record.localOutputImageUrl || record.outputImageUrl) ? (
                              <>
                                <HistoryImagePreview
                                  src={record.localOutputImageUrl || record.outputImageUrl!}
                                  alt="Generated"
                                  onError={handleHistoryImageError}
                                />
                                {/* 结果图操作按钮 */}
                                <div className="flex gap-1">
                                                                      <Button
                                      onClick={() => downloadHistoryImage(
                                        record.localOutputImageUrl || record.outputImageUrl!,
                                        record.prompt,
                                        record.id
                                      )}
                                      size="sm"
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-7"
                                    >
                                      download
                                    </Button>
                                  <Button
                                    onClick={() => setHistoryImageAsInput(record.localOutputImageUrl || record.outputImageUrl!, false)}
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-purple-400/50 text-purple-200 hover:bg-purple-400/20 hover:text-purple-100 hover:border-purple-300 bg-purple-500/10 text-xs h-7 font-medium"
                                    title={language === 'en' ? 'Use as Input' : 'Use as Input'}
                                    data-button="purple-outline"
                                  >
                                    use as input
                                  </Button>
                                </div>
                              </>
                            ) : record.status === 'failed' ? (
                              <div className="aspect-square flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="text-center">
                                  <p className="text-xs text-red-400 mb-1">
                                    {language === 'en' ? 'Generation Failed' : '生成失败'}
                                  </p>
                                  {record.errorMessage && (
                                    <p className="text-xs text-red-300/80 line-clamp-2">
                                      {record.errorMessage}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-square flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
                                <div className="text-center">
                                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin mx-auto mb-1" />
                                  <p className="text-xs text-yellow-400">
                                    {language === 'en' ? 'Processing...' : '处理中...'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 删除按钮 */}
                        <div className="flex justify-center pt-2 border-t border-white/10">
                          <Button
                            onClick={() => deleteRecord(record.id)}
                            disabled={deletingId === record.id}
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          >
                            {deletingId === record.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3 mr-1" />
                            )}
                            {language === 'en' ? 'Delete' : '删除'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* 加载更多按钮 */}
              {hasMoreHistory && (
                <div className="flex justify-center pt-6">
                  <Button
                    onClick={loadMoreHistory}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {language === 'en' ? 'Loading more...' : '加载更多...'}
                      </>
                    ) : (
                      <>
                        <History className="w-4 h-4 mr-2" />
                        {language === 'en' ? 'Load More' : '加载更多'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* 多图片编辑器 */}
      <MultiImageEditor
        isOpen={isImageEditorOpen}
        onClose={() => {
          setIsImageEditorOpen(false)
          setEditorImages([])
        }}
        onConfirm={handleImageEditConfirm}
        initialImages={editorImages}
        initialRatio="4:3"
      />
    </div>
  )
} 