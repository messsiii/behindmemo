'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { ImageCreditsAlert } from '@/components/ImageCreditsAlert'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  formatFileSize,
  getImageDimensions,
  isValidImageFile,
  resizeImageTo1080p,
} from '@/lib/imageUtils'
import { cn } from '@/lib/utils'
import { imageCache, urlToBlob } from '@/lib/imageCache'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Download,
  Edit3,
  History,
  Home,
  Image as ImageIcon,
  Info,
  Loader2,
  Scissors,
  Sparkles,
  Upload,
  Wand2,
  BookOpen,
  ExternalLink,
  Plus,
  X,
  Eye,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import useSWR from 'swr'
import MultiImageEditor, { EditState } from './MultiImageEditor'
import OptimizedGenerationHistory from './OptimizedGenerationHistory'

// 积分信息接口
interface CreditsInfo {
  credits: number
  isVIP: boolean
  vipExpiresAt: string | null
}

type ReferenceImage = {
  url: string
  file: File
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

// 优化的输入图片组件 - 防止重新渲染导致闪烁
const InputImagePreview = memo(({ src, onError }: { src: string; onError: (e: any) => void }) => {
  return (
    <div className="relative w-full h-32 sm:h-48 rounded-lg overflow-hidden">
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
const OutputImagePreview = memo(({ src, onError }: { src: string; onError: (e: any) => void }) => {
  return (
    <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden">
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
const HistoryImagePreview = memo(
  ({ src, alt, onError }: { src: string; alt: string; onError: (e: any) => void }) => {
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
  }
)
HistoryImagePreview.displayName = 'HistoryImagePreview'

interface FluxKontextProProps {
  initialModel?: 'pro' | 'max' | 'gemini' | 'banana'
}

export default function FluxKontextPro({ initialModel = 'pro' }: FluxKontextProProps) {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [outputImage, setOutputImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  
  // Multi-reference mode states
  const [referenceImages, setReferenceImages] = useState<Array<{url: string, file: File}>>([])
  const [processingImageIndex, setProcessingImageIndex] = useState<number | null>(null)
  const [imageInfo, setImageInfo] = useState<ImageInfo>({})
  const [isMobile, setIsMobile] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationInfo, setTranslationInfo] = useState<{
    originalText: string
    translatedText: string
    detectedLanguage: string
    isTranslated: boolean
  } | null>(null)
  // Removed history-related states as they are now handled in OptimizedGenerationHistory component
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false)
  const [editorImages, setEditorImages] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState<'pro' | 'max' | 'gemini'>(
    initialModel === 'banana' ? 'gemini' : (initialModel as 'pro' | 'max' | 'gemini')
  )
  const [activeTab, setActiveTab] = useState<'history' | 'introduction'>(
    session?.user ? 'history' : 'introduction'
  )
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  // Sync selectedModel with initialModel when route changes
  useEffect(() => {
    setSelectedModel(
      initialModel === 'banana' ? 'gemini' : (initialModel as 'pro' | 'max' | 'gemini')
    )
  }, [initialModel])
  const [contentFlaggedError, setContentFlaggedError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [showCreditsAlert, setShowCreditsAlert] = useState(false)
  const [requiredCreditsForAlert, setRequiredCreditsForAlert] = useState(10)
  // 移除了 newGenerationTrigger，不再自动重新创建历史记录组件
  
  const [generationMode, setGenerationMode] = useState<'image-to-image' | 'text-to-image' | 'multi-reference'>('multi-reference')
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '1:2' | '2:1'>('1:1')
  
  // Computed values
  const isTextToImageMode = generationMode === 'text-to-image'
  
  // 历史记录刷新函数引用
  const refreshHistoryRef = useRef<(() => Promise<void>) | null>(null)
  
  // 稳定的刷新回调函数
  const handleRefreshReady = useCallback((refreshFn: () => Promise<void>) => {
    refreshHistoryRef.current = refreshFn
  }, [])
  
  // Load saved state from localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Restore aspect ratio
      const savedRatio = localStorage.getItem('flux_aspect_ratio')
      if (savedRatio && ['1:1', '16:9', '9:16', '4:3', '3:4', '1:2', '2:1'].includes(savedRatio)) {
        setAspectRatio(savedRatio as any)
      }
      
      // Restore generation mode
      const savedMode = localStorage.getItem('flux_generation_mode')
      if (savedMode && ['image-to-image', 'text-to-image', 'multi-reference'].includes(savedMode)) {
        setGenerationMode(savedMode as any)
      }
    }
  }, [])

  // Save generation mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flux_generation_mode', generationMode)
    }
  }, [generationMode])
  
  // Save aspect ratio to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flux_aspect_ratio', aspectRatio)
    }
  }, [aspectRatio])

  // 获取用户积分信息
  const { data: creditsInfo, mutate: mutateCredits } = useSWR<CreditsInfo>(
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
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      )
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 页面加载时恢复保存的状态
  useEffect(() => {
    const restoreState = async () => {
      if (typeof window !== 'undefined') {
        const savedPrompt = localStorage.getItem('flux_prompt')
        const savedInputImage = localStorage.getItem('flux_input_image')
        const isInputCached = localStorage.getItem('flux_input_image_cached') === 'true'
        const savedOutputImage = localStorage.getItem('flux_output_image')
        const savedImageInfo = localStorage.getItem('flux_image_info')

        if (savedPrompt) setPrompt(savedPrompt)
        
        // 恢复输入图片
        if (isInputCached) {
          // 从 IndexedDB 恢复
          try {
            const cached = await imageCache.getImage('flux_input_image')
            if (cached) {
              const url = URL.createObjectURL(cached.blob)
              setInputImage(url)
            }
          } catch (error) {
            console.error('Failed to restore cached input image:', error)
          }
        } else if (savedInputImage) {
          // 外部 URL 直接使用
          setInputImage(savedInputImage)
        }
        
        if (savedOutputImage) setOutputImage(savedOutputImage)
        if (savedImageInfo) {
          try {
            setImageInfo(JSON.parse(savedImageInfo))
          } catch (e) {
            setImageInfo({})
          }
        }
        
        // 恢复多图参考模式的图片（如果有保存的话）
        try {
          const savedReferenceImages = localStorage.getItem('flux_reference_images')
          const savedReferenceMetadata = localStorage.getItem('flux_reference_metadata')
          
          if (savedReferenceImages && savedReferenceMetadata) {
            const savedUrls = JSON.parse(savedReferenceImages)
            const metadata = JSON.parse(savedReferenceMetadata)
            
            if (Array.isArray(savedUrls) && savedUrls.length > 0) {
              const restoredImages: ReferenceImage[] = []
              
              for (let i = 0; i < savedUrls.length; i++) {
                const savedUrl = savedUrls[i]
                if (!savedUrl) continue
                
                if (savedUrl.startsWith('flux_ref_')) {
                  // 从 IndexedDB 恢复
                  try {
                    const cached = await imageCache.getImage(savedUrl)
                    if (cached) {
                      const url = URL.createObjectURL(cached.blob)
                      restoredImages.push({
                        url,
                        file: new File([cached.blob], metadata[i]?.name || `reference-${i}.png`, {
                          type: metadata[i]?.type || 'image/png'
                        })
                      })
                    }
                  } catch (error) {
                    console.error(`Failed to restore reference image ${i}:`, error)
                  }
                } else {
                  // 外部 URL
                  restoredImages.push({
                    url: savedUrl,
                    file: new File([], metadata[i]?.name || `reference-${i}.png`, {
                      type: metadata[i]?.type || 'image/png'
                    })
                  })
                }
              }
              
              if (restoredImages.length > 0) {
                setReferenceImages(restoredImages)
                console.log(`Restored ${restoredImages.length} reference images`)
              }
            }
          }
        } catch (error) {
          console.error('Failed to restore reference images:', error)
          // 清理损坏的缓存
          localStorage.removeItem('flux_reference_images')
          localStorage.removeItem('flux_reference_metadata')
        }
      }
    }
    
    restoreState()
  }, [])

  // 设置默认选项卡
  useEffect(() => {
    if (session?.user?.id) {
      setActiveTab('history') // 登录用户默认显示历史记录
    } else {
      setActiveTab('introduction') // 未登录用户默认显示介绍
    }
  }, [session?.user?.id])

  // 创建稳定的错误处理函数 - 防止图片组件重新渲染
  const handleInputImageError = useCallback((e: any) => {
    console.warn('Input image load error:', e)
  }, [])

  const handleOutputImageError = useCallback((e: any) => {
    console.warn('Output image load error:', e)
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


  // 保存图片状态（使用 IndexedDB 存储原始数据）
  const saveImageState = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try {
        // 保存输入图片
        if (inputImage) {
          if (inputImage.startsWith('blob:') || inputImage.startsWith('data:')) {
            // 本地图片：保存到 IndexedDB
            try {
              const blob = await urlToBlob(inputImage)
              await imageCache.saveImage('flux_input_image', blob, {
                type: 'input',
                url: inputImage
              })
              localStorage.setItem('flux_input_image_cached', 'true')
            } catch (error) {
              console.error('Failed to cache input image:', error)
            }
          } else {
            // 外部 URL：只保存 URL
            localStorage.setItem('flux_input_image', inputImage)
            localStorage.removeItem('flux_input_image_cached')
            await imageCache.deleteImage('flux_input_image')
          }
        } else {
          localStorage.removeItem('flux_input_image')
          localStorage.removeItem('flux_input_image_cached')
          await imageCache.deleteImage('flux_input_image')
        }

        if (outputImage) {
          localStorage.setItem('flux_output_image', outputImage)
        } else {
          localStorage.removeItem('flux_output_image')
        }

        // 简化图片信息存储
        const simpleImageInfo = {
          processedDimensions: imageInfo.processedDimensions,
          processedSize: imageInfo.processedSize,
        }
        localStorage.setItem('flux_image_info', JSON.stringify(simpleImageInfo))
        
        // 保存多图参考模式的图片（使用 IndexedDB）
        if (referenceImages.length > 0 && generationMode === 'multi-reference') {
          try {
            const savedUrls: string[] = []
            const metadata: any[] = []

            for (let i = 0; i < referenceImages.length; i++) {
              const img = referenceImages[i]
              const cacheId = `flux_ref_${i}`
              
              if (img.url.startsWith('blob:') || img.url.startsWith('data:')) {
                // 本地图片：保存到 IndexedDB
                try {
                  const blob = await urlToBlob(img.url)
                  await imageCache.saveImage(cacheId, blob, {
                    type: 'reference',
                    index: i,
                    name: img.file?.name || `reference-${i}.png`
                  })
                  savedUrls.push(cacheId) // 保存缓存 ID
                } catch (error) {
                  console.error(`Failed to cache reference image ${i}:`, error)
                  savedUrls.push('') // 保存失败
                }
              } else {
                // 外部 URL：直接保存
                savedUrls.push(img.url)
              }
              
              metadata.push({
                name: img.file?.name || 'reference.png',
                type: img.file?.type || 'image/png',
                size: img.file?.size || 0
              })
            }
            
            localStorage.setItem('flux_reference_images', JSON.stringify(savedUrls))
            localStorage.setItem('flux_reference_metadata', JSON.stringify(metadata))
            console.log(`Saved ${referenceImages.length} reference images info`)
          } catch (error) {
            console.error('Failed to save reference images:', error)
          }
        } else if (generationMode !== 'multi-reference') {
          // 清理参考图片缓存
          localStorage.removeItem('flux_reference_images')
          localStorage.removeItem('flux_reference_metadata')
          // 清理 IndexedDB
          for (let i = 0; i < 3; i++) {
            await imageCache.deleteImage(`flux_ref_${i}`)
          }
        }
      } catch (error) {
        // localStorage可能满了，清理旧数据
        console.warn('localStorage save failed:', error)
        try {
          localStorage.removeItem('flux_input_image')
          localStorage.removeItem('flux_output_image')
          localStorage.removeItem('flux_image_info')
          localStorage.removeItem('flux_reference_images')
          localStorage.removeItem('flux_reference_metadata')
        } catch (e) {
          // 忽略清理错误
        }
      }
    }
  }, [inputImage, outputImage, imageInfo, referenceImages, generationMode])

  // 实时保存prompt（防抖优化）
  useEffect(() => {
    const timer = setTimeout(() => {
      savePrompt(prompt)
    }, 300) // 300ms防抖

    return () => clearTimeout(timer)
  }, [prompt, savePrompt])

  // 保存模型选择
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('flux_selected_model', selectedModel)
      } catch (error) {
        console.warn('Failed to save model selection:', error)
      }
    }
  }, [selectedModel])

  // 保存图片状态（当图片改变时）
  useEffect(() => {
    saveImageState()
  }, [saveImageState])
  
  // 当参考图片变化时也保存状态
  useEffect(() => {
    if (generationMode === 'multi-reference') {
      const timer = setTimeout(() => {
        saveImageState()
      }, 300) // 防抖，避免频繁保存
      return () => clearTimeout(timer)
    }
  }, [referenceImages, generationMode, saveImageState])

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 清理可能的内存泄漏
      if (typeof window !== 'undefined') {
        // 清理可能存在的URL对象
        const urlsToClean = [inputImage, outputImage].filter(
          (url): url is string => url !== null && url !== undefined && url.startsWith('blob:')
        )
        urlsToClean.forEach(url => {
          try {
            URL.revokeObjectURL(url)
          } catch (e) {
            // 忽略清理错误
          }
        })
        
        // 清理参考图片的blob URL
        referenceImages.forEach(img => {
          if (img.url && img.url.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(img.url)
            } catch (e) {
              // 忽略清理错误
            }
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

  // 处理多图参考模式的图片
  const processReferenceImage = useCallback(
    async (file: File, index?: number) => {
      try {
        setProcessingImageIndex(index !== undefined ? index : referenceImages.length)
        
        // 检查文件是否为图片
        if (!isValidImageFile(file)) {
          throw new Error(language === 'en' ? 'Invalid image file' : '无效的图片文件')
        }

        // 获取图片尺寸
        const dimensions = await getImageDimensions(file)
        console.log('Original dimensions:', dimensions)
        
        // 如果图片宽度或高度小于1080，不需要resize
        const needsResize = dimensions.width > 1080 || dimensions.height > 1080
        
        let url: string
        const processedFile = file
        if (needsResize) {
          console.log('Image needs resizing, processing...')
          // resizeImageTo1080p 返回 base64 字符串
          url = await resizeImageTo1080p(file)
          console.log('Image resized to 1080p')
        } else {
          console.log('Image size is already optimal, converting to data URL for persistence')
          // 转换为 data URL 而不是 blob URL，确保页面刷新后仍然有效
          url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              if (reader.result && typeof reader.result === 'string') {
                resolve(reader.result)
              } else {
                reject(new Error('Failed to convert file to data URL'))
              }
            }
            reader.onerror = () => reject(new Error('FileReader error'))
            reader.readAsDataURL(file)
          })
        }
        
        // 更新参考图片数组
        if (index !== undefined) {
          // 替换现有图片
          const newImages = [...referenceImages]
          if (newImages[index]) {
            URL.revokeObjectURL(newImages[index].url)
          }
          newImages[index] = { url, file: processedFile }
          setReferenceImages(newImages)
        } else {
          // 添加新图片 - Flux 最多2张，Gemini 最多3张
          const maxImages = selectedModel === 'gemini' ? 3 : 2
          if (referenceImages.length >= maxImages) {
            throw new Error(
              language === 'en' 
                ? `Maximum ${maxImages} reference images allowed` 
                : `最多支持${maxImages}张参考图片`
            )
          }
          setReferenceImages(prev => [...prev, { url, file: processedFile }])
        }
        
        toast({
          title: language === 'en' ? 'Image processed' : '图片处理完成',
          description: needsResize 
            ? (language === 'en' ? 'Image resized and ready' : '图片已调整大小并准备就绪')
            : (language === 'en' ? 'Image ready' : '图片已准备就绪'),
        })
      } catch (error) {
        console.error('Error processing reference image:', error)
        toast({
          title: language === 'en' ? 'Processing failed' : '处理失败',
          description: error instanceof Error ? error.message : '未知错误',
          variant: 'destructive',
        })
      } finally {
        setProcessingImageIndex(null)
      }
    },
    [language, referenceImages]
  )

  // 处理单图片文件（原有功能）
  const processImageFile = useCallback(
    async (file: File) => {
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
          throw new Error(
            language === 'en' ? 'Please select a valid image file' : '请选择有效的图片文件'
          )
        }

        // 获取原始尺寸
        const originalDimensions = await getImageDimensions(file)
        const originalSize = file.size

        // 调整图片尺寸
        const resizedBase64 = await resizeImageTo1080p(file)

        // 计算处理后的大小（base64大约比二进制大37%）
        const processedSize = Math.round(resizedBase64.length / 1.37)

        // 计算处理后的尺寸（从base64获取）
        const processedDimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
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
          }
        )

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
          description:
            language === 'en'
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
    },
    [language, inputImage]
  )

  // 打开图片编辑器
  const openImageEditor = useCallback(async () => {
    // 每次都提供干净的编辑环境
    const initialImages: File[] = []

    // 如果当前有输入图片，转换为File对象作为初始图片
    if (inputImage) {
      try {
        if (inputImage.startsWith('data:')) {
          // 处理base64格式图片
          const byteString = atob(inputImage.split(',')[1])
          const mimeString = inputImage.split(',')[0].split(':')[1].split(';')[0]
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }
          const blob = new Blob([ab], { type: mimeString })
          const file = new File([blob], 'current-input-image.jpg', { type: mimeString })
          initialImages.push(file)
        } else if (inputImage.startsWith('http') || inputImage.startsWith('blob:')) {
          // 处理URL格式图片
          const response = await fetch(inputImage)
          const blob = await response.blob()
          const file = new File([blob], 'current-input-image.jpg', {
            type: blob.type || 'image/jpeg',
          })
          initialImages.push(file)
        }
      } catch (error) {
        console.warn('Failed to convert current image to File:', error)
        // 即使转换失败，也要显示提示
        toast({
          title: language === 'en' ? 'Note' : '提示',
          description:
            language === 'en'
              ? 'Failed to load current image. You can upload images in the editor.'
              : '加载当前图片失败，您可以在编辑器中上传图片。',
          variant: 'default',
        })
      }
    }

    setEditorImages(initialImages)
    setIsImageEditorOpen(true)
    console.log('打开图片编辑器，初始图片:', initialImages.length)

    // 如果有输入图片，提示用户
    if (initialImages.length > 0) {
      toast({
        title: language === 'en' ? 'Image Editor Opened' : '图片编辑器已打开',
        description:
          language === 'en'
            ? 'Current input image loaded for editing'
            : '当前输入图片已加载到编辑器中',
      })
    } else if (inputImage) {
      // 如果有输入图片但加载失败
      toast({
        title: language === 'en' ? 'Image Editor Opened' : '图片编辑器已打开',
        description: language === 'en' ? 'Upload images to start editing' : '请上传图片开始编辑',
      })
    } else {
      // 没有输入图片时的提示
      toast({
        title: language === 'en' ? 'Image Editor Opened' : '图片编辑器已打开',
        description:
          language === 'en'
            ? 'Upload images to start multi-image composition'
            : '上传图片开始多图拼合',
      })
    }
  }, [inputImage, language])

  // 处理图片编辑确认
  const handleImageEditConfirm = useCallback(
    async (resultImage: File, editState: EditState) => {
      try {
        setIsImageEditorOpen(false)

        // 记录编辑状态（用于调试和未来功能扩展）
        console.log('Image editing completed with state:', {
          imageCount: editState.images.length,
          ratio: editState.ratio,
          markBoxesCount: editState.markBoxes.length,
        })

        // 使用编辑结果处理图片
        await processImageFile(resultImage)

        toast({
          title: language === 'en' ? 'Image editing completed' : '图片编辑完成',
          description:
            language === 'en'
              ? 'Multi-image composition applied successfully'
              : '多图拼合已成功应用',
        })
      } catch (error) {
        console.error('Error applying edited image:', error)
        toast({
          title: language === 'en' ? 'Edit application failed' : '编辑应用失败',
          description: error instanceof Error ? error.message : '未知错误',
          variant: 'destructive',
        })
      }
    },
    [language, processImageFile]
  )

  // 文件上传处理
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Multi-reference mode
      if (generationMode === 'multi-reference') {
        const maxImages = selectedModel === 'gemini' ? 3 : 2
        const remainingSlots = maxImages - referenceImages.length
        const filesToProcess = acceptedFiles.slice(0, remainingSlots)
        
        for (const file of filesToProcess) {
          if (file.size > 50 * 1024 * 1024) {
            toast({
              title: language === 'en' ? 'File too large' : '文件过大',
              description:
                language === 'en'
                  ? `${file.name} is larger than 50MB`
                  : `${file.name} 大于50MB`,
              variant: 'destructive',
            })
            continue
          }
          await processReferenceImage(file)
        }
        
        if (acceptedFiles.length > remainingSlots) {
          toast({
            title: language === 'en' ? 'Too many files' : '文件过多',
            description:
              language === 'en'
                ? `Only ${remainingSlots} more image(s) can be added`
                : `只能再添加 ${remainingSlots} 张图片`,
            variant: 'destructive',
          })
        }
      } else {
        // Single image mode
        const file = acceptedFiles[0]
        if (file) {
          if (file.size > 50 * 1024 * 1024) {
            toast({
              title: language === 'en' ? 'File too large' : '文件过大',
              description:
                language === 'en'
                  ? 'Please select an image smaller than 50MB'
                  : '请选择小于50MB的图片',
              variant: 'destructive',
            })
            return
          }

          processImageFile(file)
        }
      }
    },
    [language, processImageFile, processReferenceImage, generationMode, referenceImages.length]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    multiple: generationMode === 'multi-reference',
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  })

  // 生成图片
  // 处理生成按钮点击
  const handleGenerateClick = () => {
    // 检查是否登录
    if (!session?.user) {
      // 保存当前状态
      savePrompt(prompt)
      saveImageState()
      if (typeof window !== 'undefined') {
        localStorage.setItem('flux_selected_model', selectedModel)
      }
      // 跳转到登录页面，登录后返回当前模型页面
      const modelPath =
        selectedModel === 'pro'
          ? 'flux-kontext-pro'
          : selectedModel === 'max'
            ? 'flux-kontext-max'
            : 'gemini-2.5-flash-image'
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/${modelPath}`)}`)
      return
    }

    // 检查积分是否充足
    const requiredCredits = selectedModel === 'max' ? 20 : selectedModel === 'gemini' ? 30 : 10
    if ((creditsInfo?.credits || 0) < requiredCredits) {
      setRequiredCreditsForAlert(requiredCredits)
      setShowCreditsAlert(true)
      return
    }

    // 调用生成函数
    generateImage()
  }

  const generateImage = async () => {
    // 验证输入条件
    if (!prompt.trim()) {
      toast({
        title: language === 'en' ? 'Missing prompt' : '缺少提示词',
        description:
          language === 'en'
            ? 'Please enter a prompt to generate image'
            : '请输入提示词来生成图片',
        variant: 'destructive',
      })
      return
    }

    if (generationMode === 'image-to-image' && !inputImage) {
      toast({
        title: language === 'en' ? 'Missing input image' : '缺少输入图片',
        description:
          language === 'en'
            ? 'Please upload an image to transform'
            : '请上传要转换的图片',
        variant: 'destructive',
      })
      return
    }

    if (generationMode === 'multi-reference') {
      const minImages = 1
      const maxImages = selectedModel === 'gemini' ? 3 : 2
      
      if (referenceImages.length < minImages) {
        toast({
          title: language === 'en' ? 'Missing reference images' : '缺少参考图片',
          description:
            language === 'en'
              ? `Please upload at least ${minImages} reference image${minImages > 1 ? 's' : ''}`
              : `请上传至少${minImages}张参考图片`,
          variant: 'destructive',
        })
        return
      }

      if (referenceImages.length > maxImages) {
        toast({
          title: language === 'en' ? 'Too many reference images' : '参考图片过多',
          description:
            language === 'en'
              ? `Maximum ${maxImages} images allowed for ${selectedModel === 'gemini' ? 'Gemini' : 'Flux'} model`
              : `${selectedModel === 'gemini' ? 'Gemini' : 'Flux'} 模型最多允许${maxImages}张图片`,
          variant: 'destructive',
        })
        return
      }

      // 对于Flux模型，必须恰好2张图片
      if (selectedModel !== 'gemini' && referenceImages.length !== 2) {
        toast({
          title: language === 'en' ? 'Invalid image count' : '图片数量不正确',
          description:
            language === 'en'
              ? 'Flux model requires exactly 2 reference images'
              : 'Flux 模型需要恰好2张参考图片',
          variant: 'destructive',
        })
        return
      }
    }

    // 积分检查已经在 handleGenerateClick 中完成

    // 创建AbortController来管理请求
    const abortController = new AbortController()

    setIsGenerating(true)
    setOutputImage(null)
    setTranslationInfo(null)
    setContentFlaggedError(null)
    setGeneralError(null)

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
              description:
                language === 'en'
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
      console.log('Selected model:', selectedModel)

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          input_image: generationMode === 'image-to-image' ? inputImage : undefined,
          reference_images: generationMode === 'multi-reference' ? 
            await Promise.all(referenceImages.map(async (img, index) => {
              console.log(`🖼️ Processing reference image ${index + 1}:`, {
                url: img.url,
                urlType: img.url?.startsWith('data:') ? 'data' : img.url?.startsWith('http') ? 'http' : img.url?.startsWith('blob:') ? 'blob' : 'other',
                fileSize: img.file?.size || 0,
                fileName: img.file?.name || 'no name'
              })
              // 如果图片有 URL
              if (img.url) {
                // 如果是 data URL，直接使用
                if (img.url.startsWith('data:')) {
                  return img.url
                }
                
                // 如果是 HTTP URL，需要下载并转换为 data URL
                if (img.url.startsWith('http')) {
                  try {
                    console.log(`📥 Downloading image from: ${img.url.substring(0, 50)}...`)
                    const response = await fetch(img.url)
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                    }
                    const blob = await response.blob()
                    return new Promise<string>((resolve, reject) => {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        if (reader.result && typeof reader.result === 'string') {
                          console.log(`✅ Converted HTTP URL to data URL (${blob.size} bytes)`)
                          resolve(reader.result)
                        } else {
                          reject(new Error('Failed to convert HTTP image to data URL'))
                        }
                      }
                      reader.onerror = () => reject(new Error('FileReader error during HTTP image conversion'))
                      reader.readAsDataURL(blob)
                    })
                  } catch (error) {
                    console.error(`❌ Failed to download image from ${img.url}:`, error)
                    throw new Error(`Failed to download reference image: ${error}`)
                  }
                }
                // 如果是 blob URL，需要转换
                if (img.url.startsWith('blob:')) {
                  try {
                    const response = await fetch(img.url)
                    const blob = await response.blob()
                    return new Promise<string>((resolve, reject) => {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        if (reader.result && typeof reader.result === 'string') {
                          resolve(reader.result)
                        } else {
                          reject(new Error('Failed to read blob'))
                        }
                      }
                      reader.onerror = () => reject(new Error('FileReader error'))
                      reader.readAsDataURL(blob)
                    })
                  } catch (error) {
                    console.error('Error converting blob URL:', error)
                    throw error
                  }
                }
              }
              
              // 如果没有有效 URL，且有文件，从文件读取
              if (img.file && img.file.size > 0) {
                return new Promise<string>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    if (reader.result && typeof reader.result === 'string') {
                      resolve(reader.result)
                    } else {
                      reject(new Error('Failed to read file'))
                    }
                  }
                  reader.onerror = () => reject(new Error('FileReader error'))
                  reader.readAsDataURL(img.file)
                })
              }
              
              console.error('No valid image data for img:', {
                url: img.url,
                fileSize: img.file?.size || 0,
                fileName: img.file?.name || 'no file'
              })
              throw new Error(`No valid image data available for image: ${img.file?.name || 'unnamed'}`)
            })) : undefined,
          model: selectedModel,
          mode: generationMode,
          aspectRatio: generationMode !== 'image-to-image' ? aspectRatio : undefined,
        }),
        signal: abortController.signal,
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }))

        // 检查是否是内容审核失败
        if (
          errorData.contentFlagged ||
          (errorData.error &&
            (errorData.error.includes('flagged as sensitive') ||
              errorData.error.includes('E005') ||
              errorData.error.includes('content policy')))
        ) {
          // 内容审核失败，设置状态并退出
          setContentFlaggedError(
            language === 'en'
              ? 'Content flagged as sensitive. Please try with different, family-friendly prompts. Avoid words that could be considered inappropriate.'
              : '内容被标记为敏感。请尝试使用不同的、健康的提示词。避免使用可能被认为不当的词汇。'
          )
          return
        }

        // 检查详细错误信息中的内容审核
        if (
          errorData.details &&
          (errorData.details.includes('flagged as sensitive') ||
            errorData.details.includes('E005') ||
            errorData.details.includes('content policy') ||
            errorData.details.includes('HARM_CATEGORY'))
        ) {
          // 内容审核失败，设置状态并退出
          setContentFlaggedError(
            language === 'en'
              ? 'Content flagged as sensitive. Please try with different, family-friendly prompts. Avoid words that could be considered inappropriate.'
              : '内容被标记为敏感。请尝试使用不同的、健康的提示词。避免使用可能被认为不当的词汇。'
          )
          return
        }

        // 设置通用错误信息
        const errorMsg =
          errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`
        setGeneralError(errorMsg)
        throw new Error(errorMsg)
      }

      const data = await response.json()
      console.log('Generation successful, received data:', {
        hasOutput: !!data.output,
        hasLocalUrl: !!data.localOutputImageUrl,
        outputType: data.output ? (data.output.startsWith('data:') ? 'base64' : 'url') : 'none'
      })

      if (!data.output && !data.localOutputImageUrl) {
        throw new Error('No output received from API')
      }

      // 优先使用 localOutputImageUrl（R2 URL），否则使用 output
      const imageUrl = data.localOutputImageUrl || data.output
      setOutputImage(imageUrl)
      // 刷新积分信息和历史记录
      mutateCredits()
      
      // 自动刷新历史记录列表
      if (refreshHistoryRef.current) {
        try {
          await refreshHistoryRef.current()
          console.log('✅ History refreshed successfully')
        } catch (error) {
          console.warn('⚠️ Failed to refresh history:', error)
        }
      }

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
        if (error.name === 'TimeoutError') {
          errorDescription =
            language === 'en' ? 'Request timed out. Please try again.' : '请求超时，请重试。'
        } else if (error.message.includes('fetch')) {
          errorDescription =
            language === 'en'
              ? 'Network error. Please check your connection.'
              : '网络错误，请检查连接。'
        } else if (error.message.includes('memory') || error.message.includes('Memory')) {
          errorDescription =
            language === 'en'
              ? 'Memory error. Page will refresh to free memory.'
              : '内存错误，页面将刷新以释放内存。'
          shouldRefresh = true
        } else {
          errorDescription = error.message
        }
      }

      toast({
        title: errorMessage,
        description:
          errorDescription +
          (shouldRefresh ? (language === 'en' ? ' Refreshing...' : ' 正在刷新...') : ''),
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


  // 使用生成的图片作为输入
  const useAsInput = () => {
    if (!outputImage) return

    // 如果当前是多图参考模式，将图片添加到参考图片
    if (generationMode === 'multi-reference') {
      const maxImages = selectedModel === 'gemini' ? 3 : 2
      if (referenceImages.length < maxImages) {
        const placeholderFile = new File([new Blob([''])], 'generated-output.png', { type: 'image/png' })
        setReferenceImages(prev => [...prev, { url: outputImage, file: placeholderFile }])
        
        toast({
          title: language === 'en' ? 'Added to references' : '已添加到参考图片',
          description: language === 'en' 
            ? `Reference ${referenceImages.length + 1}/${maxImages}` 
            : `参考图片 ${referenceImages.length + 1}/${maxImages}`,
        })
      } else {
        toast({
          title: language === 'en' ? 'Reference limit reached' : '参考图片已达上限',
          description: language === 'en' 
            ? `Maximum ${maxImages} images for ${selectedModel === 'gemini' ? 'Gemini' : 'Flux'}` 
            : `${selectedModel === 'gemini' ? 'Gemini' : 'Flux'} 最多允许 ${maxImages} 张图片`,
          variant: 'destructive',
        })
      }
      // 滚动到页面顶部查看参考图片区域
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // 只有文生图模式需要切换到图生图模式
    if (generationMode === 'text-to-image') {
      setGenerationMode('image-to-image')
    }
    
    // 设置生成的图片为新的输入图片
    setInputImage(outputImage)
    
    // 滚动到页面顶部查看输入图片区域
    window.scrollTo({ top: 0, behavior: 'smooth' })

    toast({
      title: language === 'en' ? 'Image set as input' : '图片已设为输入',
      description:
        language === 'en'
          ? 'Generated image is now ready for further transformation'
          : '生成的图片现在可以进行进一步转换',
    })
  }

  // 使用历史记录中的图片作为输入
  const setHistoryImageAsInput = (imageUrl: string, isInputImage = false, metadata?: any) => {
    // 如果点击的是输出图片（isInputImage 为 false）
    if (!isInputImage && imageUrl) {
      // 如果当前是多图参考模式，将图片添加到参考图片
      if (generationMode === 'multi-reference') {
        const maxImages = selectedModel === 'gemini' ? 3 : 2
        if (referenceImages.length < maxImages) {
          const placeholderFile = new File([new Blob([''])], 'history-output.png', { type: 'image/png' })
          setReferenceImages(prev => [...prev, { url: imageUrl, file: placeholderFile }])
          
          toast({
            title: language === 'en' ? 'Added to references' : '已添加到参考图片',
            description: language === 'en' 
              ? `Reference ${referenceImages.length + 1}/${maxImages}` 
              : `参考图片 ${referenceImages.length + 1}/${maxImages}`,
          })
          // 滚动到页面顶部查看参考图片
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          toast({
            title: language === 'en' ? 'Reference limit reached' : '参考图片已达上限',
            description: language === 'en' 
              ? `Maximum ${maxImages} images for ${selectedModel === 'gemini' ? 'Gemini' : 'Flux'}` 
              : `${selectedModel === 'gemini' ? 'Gemini' : 'Flux'} 最多允许 ${maxImages} 张图片`,
            variant: 'destructive',
          })
        }
      } else {
        // 文生图模式需要切换到图生图模式
        if (generationMode === 'text-to-image') {
          setGenerationMode('image-to-image')
        }
        // 设置为输入图片
        setInputImage(imageUrl)
        
        toast({
          title: language === 'en' ? 'Image set as input' : '图片已设为输入',
          description: language === 'en'
            ? 'Using generated result as new input for transformation'
            : '已将生成结果设为新的转换输入',
        })
        // 滚动到页面顶部查看输入图片
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }
    
    // 检查是否是多图参考的历史记录
    if (metadata?.mode === 'multi-reference' && metadata?.referenceImages?.length > 0) {
      // 恢复多图参考模式
      setGenerationMode('multi-reference')
      setReferenceImages(metadata.referenceImages.map((url: string) => ({
        url,
        file: new File([new Blob([''])], 'history-image.png', { type: 'image/png' })
      })))
      
      if (metadata.aspectRatio) {
        setAspectRatio(metadata.aspectRatio)
      }
      
      toast({
        title: language === 'en' ? 'Multi-reference restored' : '多图参考已恢复',
        description: language === 'en' 
          ? `${metadata.referenceImages.length} reference images loaded` 
          : `已加载 ${metadata.referenceImages.length} 张参考图片`,
      })
      // 滚动到页面顶部查看参考图片
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (generationMode === 'multi-reference') {
      // 多图参考模式：将图片添加到参考图片数组
      const maxImages = selectedModel === 'gemini' ? 3 : 2
      if (referenceImages.length < maxImages) {
        // 创建一个占位符 File 对象
        const placeholderFile = new File([new Blob([''])], 'history-image.png', { type: 'image/png' })
        setReferenceImages(prev => [...prev, { url: imageUrl, file: placeholderFile }])
        
        toast({
          title: language === 'en' ? 'Image added to references' : '图片已添加到参考图片',
          description: language === 'en' 
            ? `${referenceImages.length + 1}/${maxImages} reference images` 
            : `参考图片 ${referenceImages.length + 1}/${maxImages}`,
        })
        // 滚动到页面顶部查看参考图片
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        toast({
          title: language === 'en' ? 'Reference limit reached' : '参考图片已达上限',
          description: language === 'en' 
            ? `Maximum ${maxImages} images for ${selectedModel === 'gemini' ? 'Gemini' : 'Flux'}` 
            : `${selectedModel === 'gemini' ? 'Gemini' : 'Flux'} 最多允许 ${maxImages} 张图片`,
          variant: 'destructive',
        })
      }
    } else if (generationMode === 'image-to-image') {
      // 图生图模式：设置为输入图片
      setInputImage(imageUrl)

      const imageType = isInputImage
        ? language === 'en'
          ? 'input image'
          : '输入图片'
        : language === 'en'
          ? 'generated result'
          : '生成结果'

      toast({
        title: language === 'en' ? 'Image set as input' : '图片已设为输入',
        description:
          language === 'en'
            ? `Using ${imageType} as new input for transformation`
            : `已将${imageType}设为新的转换输入`,
      })
    } else {
      // 检查是否是文生图模式的历史记录
      if (metadata?.mode === 'text-to-image' && metadata?.aspectRatio) {
        // 恢复文生图模式
        setGenerationMode('text-to-image')
        setAspectRatio(metadata.aspectRatio)
        toast({
          title: language === 'en' ? 'Text-to-Image mode restored' : '文生图模式已恢复',
          description: language === 'en' 
            ? 'Ready to generate with the same settings' 
            : '已准备好使用相同设置生成',
        })
      } else {
        // 默认情况：切换到图生图模式并设置图片
        setGenerationMode('image-to-image')
        setInputImage(imageUrl)

        toast({
          title: language === 'en' ? 'Switched to Image-to-Image mode' : '已切换到图生图模式',
          description: language === 'en' 
            ? 'Image from history is now ready for transformation' 
            : '历史记录中的图片现在可以进行转换',
        })
      }
    }

    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // History-related functions are now handled in OptimizedGenerationHistory component


  // 获取语言名称的辅助函数
  const getLanguageName = (langCode: string): string => {
    const languageNames: { [key: string]: { en: string; zh: string } } = {
      zh: { en: 'Chinese', zh: '中文' },
      'zh-cn': { en: 'Chinese (Simplified)', zh: '简体中文' },
      'zh-tw': { en: 'Chinese (Traditional)', zh: '繁体中文' },
      ja: { en: 'Japanese', zh: '日语' },
      ko: { en: 'Korean', zh: '韩语' },
      es: { en: 'Spanish', zh: '西班牙语' },
      fr: { en: 'French', zh: '法语' },
      de: { en: 'German', zh: '德语' },
      ru: { en: 'Russian', zh: '俄语' },
      ar: { en: 'Arabic', zh: '阿拉伯语' },
      hi: { en: 'Hindi', zh: '印地语' },
      pt: { en: 'Portuguese', zh: '葡萄牙语' },
      it: { en: 'Italian', zh: '意大利语' },
      th: { en: 'Thai', zh: '泰语' },
      vi: { en: 'Vietnamese', zh: '越南语' },
      en: { en: 'English', zh: '英语' },
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
    setContentFlaggedError(null)
    setGeneralError(null)

    // 清理多图参考模式的图片
    if (generationMode === 'multi-reference') {
      referenceImages.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url)
        }
      })
      setReferenceImages([])
      // 清除缓存的参考图片
      if (typeof window !== 'undefined') {
        localStorage.removeItem('flux_reference_images')
        localStorage.removeItem('flux_reference_metadata')
      }
    }

    // 只清理提示词localStorage，保留图片
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flux_prompt')
    }

    toast({
      title: language === 'en' ? 'Prompt cleared' : '提示词已清空',
      description: language === 'en' ? 'Images preserved' : '图片已保留',
    })
  }, [language, generationMode, referenceImages])

  // 添加内存监控和清理
  useEffect(() => {
    let memoryCheckInterval: NodeJS.Timeout

    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in window.performance
    ) {
      memoryCheckInterval = setInterval(() => {
        const memory = (window.performance as any).memory
        if (memory && memory.usedJSHeapSize > 200 * 1024 * 1024) {
          // 提高到200MB
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

  // 处理剪贴板粘贴图片
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // 检查是否在输入框或可编辑元素中
      const target = e.target as HTMLElement
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return // 在输入框中不处理粘贴
      }

      const items = e.clipboardData?.items
      if (!items) return

      // 收集所有图片文件
      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            imageFiles.push(file)
          }
        }
      }

      if (imageFiles.length === 0) return

      e.preventDefault() // 阻止默认粘贴行为

      // 多图参考模式
      if (generationMode === 'multi-reference') {
        const maxImages = selectedModel === 'gemini' ? 3 : 2
        const availableSlots = maxImages - referenceImages.length
        
        if (availableSlots <= 0) {
          toast({
            title: language === 'en' ? 'Reference limit reached' : '参考图片已达上限',
            description: language === 'en' 
              ? `Maximum ${maxImages} reference images allowed` 
              : `最多允许 ${maxImages} 张参考图片`,
            variant: 'destructive',
          })
          return
        }

        const filesToProcess = imageFiles.slice(0, availableSlots)
        
        try {
          for (const file of filesToProcess) {
            // 检查文件大小
            if (file.size > 50 * 1024 * 1024) {
              toast({
                title: language === 'en' ? 'File too large' : '文件过大',
                description:
                  language === 'en'
                    ? `${file.name} is larger than 50MB`
                    : `${file.name} 大于50MB`,
                variant: 'destructive',
              })
              continue
            }

            await processReferenceImage(file)
          }

          toast({
            title: language === 'en' ? 'Images pasted' : '图片已粘贴',
            description:
              language === 'en'
                ? `${filesToProcess.length} image(s) added to references`
                : `已添加 ${filesToProcess.length} 张参考图片`,
          })
        } catch (error) {
          console.error('Error processing pasted images:', error)
          toast({
            title: language === 'en' ? 'Paste failed' : '粘贴失败',
            description:
              error instanceof Error
                ? error.message
                : language === 'en'
                  ? 'Failed to process pasted images'
                  : '处理粘贴图片失败',
            variant: 'destructive',
          })
        }
      } else {
        // 单图模式（图生图或文生图）
        const file = imageFiles[0]
        
        try {
          // 检查文件大小
          if (file.size > 50 * 1024 * 1024) {
            toast({
              title: language === 'en' ? 'File too large' : '文件过大',
              description:
                language === 'en'
                  ? 'Please paste an image smaller than 50MB'
                  : '请粘贴小于50MB的图片',
              variant: 'destructive',
            })
            return
          }

          // 处理粘贴的图片
          toast({
            title: language === 'en' ? 'Image pasted' : '图片已粘贴',
            description:
              language === 'en' ? 'Processing the pasted image...' : '正在处理粘贴的图片...',
          })

          await processImageFile(file)

          toast({
            title: language === 'en' ? 'Image processed' : '图片处理完成',
            description:
              language === 'en'
                ? 'Pasted image is ready for transformation'
                : '粘贴的图片已准备好进行转换',
          })
        } catch (error) {
          console.error('Error processing pasted image:', error)
          toast({
            title: language === 'en' ? 'Paste failed' : '粘贴失败',
            description:
              error instanceof Error
                ? error.message
                : language === 'en'
                  ? 'Failed to process pasted image'
                  : '处理粘贴图片失败',
            variant: 'destructive',
          })
        }
      }
    }

    // 添加paste事件监听器
    window.addEventListener('paste', handlePaste)

    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [language, processImageFile, generationMode, selectedModel, referenceImages.length, processReferenceImage])

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" data-page="gen">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
            >
              <Home className="w-4 h-4" />
              {language === 'en' ? 'Back to Home' : '返回首页'}
            </Link>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              {initialModel === 'banana' && (
                <span className="text-5xl sm:text-6xl md:text-7xl mr-3">🍌</span>
              )}
              <span
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent !bg-clip-text !text-transparent"
                data-title="ai-generation"
                style={{
                  background:
                    initialModel === 'banana'
                      ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'
                      : 'linear-gradient(90deg, #c084fc 0%, #f472b6 50%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {initialModel === 'banana'
                  ? 'Nano Banana (Gemini 2.5 Flash Image)'
                  : selectedModel === 'pro'
                    ? 'Flux Kontext Pro'
                    : selectedModel === 'max'
                      ? 'Flux Kontext Max'
                      : 'Nano Banana (Gemini 2.5 Flash Image)'}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
              {initialModel === 'banana'
                ? language === 'en'
                  ? '🎨 The most playful AI image editor on the internet!'
                  : '🎨 互联网上最有趣的 AI 图像编辑器！'
                : language === 'en'
                  ? 'AI Image Editing that surpasses ChatGPT'
                  : '超过 ChatGPT 的图片编辑'}
            </p>
          </motion.div>
        </div>

        {/* 积分显示 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="bg-black/20 backdrop-blur-lg rounded-full px-6 py-3 border border-white/10">
            <div className="flex items-center gap-3 text-white">
              {session?.user ? (
                // 已登录用户显示积分
                <>
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span className="font-medium">
                    <span className={creditsInfo?.isVIP ? 'text-yellow-400' : 'text-white'}>
                      {creditsInfo?.isVIP && <span className="text-yellow-400">VIP </span>}
                      {creditsInfo?.credits || 0} {language === 'en' ? 'Credits' : '积分'}
                    </span>
                  </span>
                  <span className="text-white/60">•</span>
                  <span className="text-sm text-white/60">
                    {selectedModel === 'max'
                      ? language === 'en'
                        ? '20 credits per generation'
                        : '每次生成消耗20积分'
                      : selectedModel === 'gemini'
                        ? language === 'en'
                          ? '30 credits per generation'
                          : '每次生成消耗30积分'
                        : language === 'en'
                          ? '10 credits per generation'
                          : '每次生成消耗10积分'}
                  </span>
                </>
              ) : (
                // 未登录用户显示引导
                <>
                  <Sparkles className="w-5 h-5 text-green-400" />
                  <span className="font-medium">
                    <span className="text-green-400">
                      {language === 'en'
                        ? 'Sign in to get 30 FREE credits!'
                        : '登录即可获得30个免费积分！'}
                    </span>
                  </span>
                  <span className="text-white/60">•</span>
                  <Link
                    href={`/auth/signin?callbackUrl=/${
                      selectedModel === 'pro'
                        ? 'flux-kontext-pro'
                        : selectedModel === 'max'
                          ? 'flux-kontext-max'
                          : 'gemini-2.5-flash-image'
                    }`}
                    className="text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    {language === 'en' ? 'Sign in now' : '立即登录'}
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-6"
        >
          <Card className="!bg-black/20 backdrop-blur-lg border-white/10 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Label className="text-white/80">
                    {language === 'en' ? 'Generation Mode:' : '生成模式：'}
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGenerationMode('image-to-image')
                        // 从多图参考模式切换时，使用第一张参考图作为输入图
                        if (generationMode === 'multi-reference' && referenceImages.length > 0) {
                          setInputImage(referenceImages[0].url)
                          // 清理参考图片
                          referenceImages.forEach(img => {
                            if (img.url.startsWith('blob:')) {
                              URL.revokeObjectURL(img.url)
                            }
                          })
                          setReferenceImages([])
                        }
                      }}
                      className={generationMode === 'image-to-image'
                        ? "bg-purple-600 hover:bg-purple-700 text-white" 
                        : "bg-transparent border border-white/40 text-white/80 hover:bg-white/20 hover:text-white hover:border-white/60"}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Image Edit' : '图片编辑'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGenerationMode('text-to-image')
                        // 从多图参考模式切换时，清理参考图片
                        if (generationMode === 'multi-reference') {
                          referenceImages.forEach(img => {
                            if (img.url.startsWith('blob:')) {
                              URL.revokeObjectURL(img.url)
                            }
                          })
                          setReferenceImages([])
                        }
                      }}
                      className={generationMode === 'text-to-image'
                        ? "bg-purple-600 hover:bg-purple-700 text-white" 
                        : "bg-transparent border border-white/40 text-white/80 hover:bg-white/20 hover:text-white hover:border-white/60"}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Text to Image' : '文生图'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGenerationMode('multi-reference')
                        // 从图生图模式切换时，将当前输入图作为第一张参考图
                        if (generationMode === 'image-to-image' && inputImage) {
                          const fakeFile = new File([], 'converted-image.png', { type: 'image/png' })
                          setReferenceImages([{ url: inputImage, file: fakeFile }])
                          setInputImage(null)
                          
                          toast({
                            title: language === 'en' ? 'Image transferred' : '图片已转移',
                            description: language === 'en' 
                              ? 'Your input image is now a reference image' 
                              : '您的输入图片现在是参考图片',
                          })
                        }
                      }}
                      className={generationMode === 'multi-reference'
                        ? "bg-purple-600 hover:bg-purple-700 text-white" 
                        : "bg-transparent border border-white/40 text-white/80 hover:bg-white/20 hover:text-white hover:border-white/60"}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Multi-Ref' : '多图参考'}
                      <span className="text-xs opacity-75 ml-1">
                        ({selectedModel === 'gemini' ? 3 : 2})
                      </span>
                    </Button>
                  </div>
                </div>
                
                {/* Text-to-image and multi-reference options */}
                {(generationMode === 'text-to-image' || generationMode === 'multi-reference') && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <Label className="text-white/60 text-xs mb-1 block flex items-center gap-2">
                          <span>{language === 'en' ? 'Aspect Ratio' : '宽高比'}</span>
                          {selectedModel === 'gemini' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              <Info className="w-3 h-3" />
                              {language === 'en' ? 'AI controlled' : 'AI 控制'}
                            </span>
                          )}
                        </Label>
                        <Select value={aspectRatio} onValueChange={(value: any) => setAspectRatio(value)}>
                          <SelectTrigger className="w-40 h-10 bg-white/10 border-white/20 text-white hover:border-white/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/20 text-white">
                            <SelectItem value="1:1" className="hover:bg-white/20 focus:bg-white/20 text-white hover:text-white focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-white/80 rounded-sm" />
                                <span>1:1</span>
                                <span className="text-xs text-white/60 ml-auto">{language === 'en' ? 'Square' : '正方形'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="16:9" className="hover:bg-white/20 focus:bg-white/20 text-white hover:text-white focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-4 bg-white/80 rounded-sm" />
                                <span>16:9</span>
                                <span className="text-xs text-white/60 ml-auto">{language === 'en' ? 'Wide' : '宽屏'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="9:16" className="hover:bg-white/20 focus:bg-white/20 text-white hover:text-white focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-7 bg-white/80 rounded-sm" />
                                <span>9:16</span>
                                <span className="text-xs text-white/60 ml-auto">{language === 'en' ? 'Portrait' : '竖屏'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="4:3" className="hover:bg-white/20 focus:bg-white/20 text-white hover:text-white focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-[18px] bg-white/80 rounded-sm" />
                                <span>4:3</span>
                                <span className="text-xs text-white/60 ml-auto">{language === 'en' ? 'Standard' : '标准'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="3:4" className="hover:bg-white/20 focus:bg-white/20 text-white hover:text-white focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-[18px] h-6 bg-white/80 rounded-sm" />
                                <span>3:4</span>
                                <span className="text-xs text-white/60 ml-auto">{language === 'en' ? 'Vertical' : '竖向'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="1:2" className="hover:bg-white/20 focus:bg-white/20 text-white hover:text-white focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-3.5 h-7 bg-white/80 rounded-sm" />
                                <span>1:2</span>
                                <span className="text-xs text-white/60 ml-auto">{language === 'en' ? 'Tall' : '高竖'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="2:1" className="hover:bg-white/20 focus:bg-white/20 text-white hover:text-white focus:text-white data-[highlighted]:bg-white/20 data-[highlighted]:text-white">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-3.5 bg-white/80 rounded-sm" />
                                <span>2:1</span>
                                <span className="text-xs text-white/60 ml-auto">{language === 'en' ? 'Panoramic' : '全景'}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 主要内容区域 */}
        <div className={cn(
          "grid grid-cols-1 gap-6",
          isTextToImageMode ? "lg:grid-cols-2" : "lg:grid-cols-3"
        )}>
          {/* 输入图片 - 在图片编辑模式和多图参考模式下显示 */}
          {generationMode !== 'text-to-image' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card
              className="!bg-black/20 backdrop-blur-lg border-white/10 text-white h-full"
              data-card="gen-card"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  {generationMode === 'multi-reference'
                    ? (language === 'en' ? 'Reference Images' : '参考图片')
                    : (language === 'en' ? 'Input Image' : '输入图片')}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {generationMode === 'multi-reference'
                    ? (language === 'en' 
                        ? `Upload up to ${selectedModel === 'gemini' ? 3 : 2} reference images` 
                        : `上传最多${selectedModel === 'gemini' ? 3 : 2}张参考图片`)
                    : (language === 'en' ? 'Upload an image to transform' : '上传要转换的图片')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Multi-reference mode UI */}
                {generationMode === 'multi-reference' ? (
                  <div className="space-y-4">
                    {/* Display existing reference images */}
                    {referenceImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {referenceImages.map((img, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10">
                              <Image
                                src={img.url}
                                alt={`Reference ${index + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                const newImages = [...referenceImages]
                                URL.revokeObjectURL(newImages[index].url)
                                newImages.splice(index, 1)
                                setReferenceImages(newImages)
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            {processingImageIndex === index && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Add more images button */}
                        {referenceImages.length < (selectedModel === 'gemini' ? 3 : 2) && (
                          <div
                            className="aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-purple-400 bg-white/5 hover:bg-purple-400/10 transition-all cursor-pointer flex items-center justify-center"
                            onClick={() => {
                              const input = document.createElement('input')
                              input.type = 'file'
                              input.accept = 'image/*'
                              input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0]
                                if (file) {
                                  await processReferenceImage(file)
                                }
                              }
                              input.click()
                            }}
                          >
                            <div className="text-center">
                              <Plus className="w-8 h-8 text-white/40 mx-auto mb-2" />
                              <p className="text-xs text-white/60">
                                {language === 'en' ? 'Add image' : '添加图片'}
                              </p>
                              <p className="text-xs text-purple-400 mt-1">
                                {language === 'en' ? 'or paste' : '或粘贴'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Drag and drop zone for initial upload */}
                    {referenceImages.length === 0 && (
                      <div
                        {...getRootProps()}
                        className={cn(
                          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                          isDragActive || dragActive
                            ? 'border-purple-400 bg-purple-400/10'
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        )}
                      >
                        <input {...getInputProps()} multiple accept="image/*" />
                        <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                        <p className="text-white/80 mb-2">
                          {language === 'en'
                            ? 'Drop images here or click to upload'
                            : '将图片拖放到此处或点击上传'}
                        </p>
                        <p className="text-sm text-white/60">
                          {language === 'en'
                            ? `Select up to ${selectedModel === 'gemini' ? 3 : 2} images as reference`
                            : `选择最多${selectedModel === 'gemini' ? 3 : 2}张图片作为参考`}
                        </p>
                        <p className="text-xs text-purple-400 mt-2">
                          {language === 'en'
                            ? 'Tip: You can paste multiple images with Ctrl+V / Cmd+V'
                            : '提示：您可以使用 Ctrl+V / Cmd+V 粘贴多张图片'}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                          {language === 'en'
                            ? 'Images larger than 1080p will be resized'
                            : '大于1080p的图片将自动调整大小'}
                        </p>
                      </div>
                    )}
                    
                    {/* Info about multi-reference mode */}
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-200">
                          {selectedModel === 'gemini' 
                            ? (language === 'en' 
                                ? 'The AI will use these images as style and content references to generate a new image based on your prompt.'
                                : 'AI 将使用这些图片作为风格和内容参考，根据您的提示词生成新图片。')
                            : (language === 'en' 
                                ? 'Flux will combine exactly 2 reference images based on your prompt. Both images are required.'
                                : 'Flux 将根据您的提示词组合恰好2张参考图片。两张图片都是必需的。')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Original single image mode UI */
                  <div
                    {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
                    isDragActive || dragActive
                      ? 'border-purple-400 bg-purple-400/10'
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5',
                    inputImage && 'border-green-400'
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
                          {language === 'en'
                            ? 'Resizing to 1080p and optimizing'
                            : '正在调整为1080p并优化'}
                        </p>
                      </div>
                    </div>
                  ) : inputImage ? (
                    <div className="space-y-4">
                      <InputImagePreview src={inputImage} onError={handleInputImageError} />
                      <div className="text-left space-y-2">
                        <p className="text-sm text-green-400 font-medium">
                          {language === 'en' ? 'Image processed successfully' : '图片处理成功'}
                        </p>
                        {imageInfo.originalDimensions && imageInfo.processedDimensions && (
                          <div className="text-xs text-white/60 space-y-1">
                            <div className="flex items-center gap-2">
                              <Info className="w-3 h-3" />
                              <span>
                                {language === 'en' ? 'Original:' : '原始:'}{' '}
                                {imageInfo.originalDimensions.width}×
                                {imageInfo.originalDimensions.height}
                                {imageInfo.originalSize &&
                                  ` (${formatFileSize(imageInfo.originalSize)})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Scissors className="w-3 h-3" />
                              <span>
                                {language === 'en' ? 'Processed:' : '处理后:'}{' '}
                                {imageInfo.processedDimensions.width}×
                                {imageInfo.processedDimensions.height}
                                {imageInfo.processedSize &&
                                  ` (${formatFileSize(imageInfo.processedSize)})`}
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
                          {language === 'en'
                            ? 'Drop an image here, click to upload, or paste from clipboard'
                            : '将图片拖放到此处、点击上传或从剪贴板粘贴'}
                        </p>
                        <p className="text-sm text-white/60 mt-2">
                          {language === 'en'
                            ? 'Supports PNG, JPG, JPEG, WebP (max 50MB)'
                            : '支持 PNG、JPG、JPEG、WebP（最大50MB）'}
                        </p>
                        <p className="text-xs text-purple-400 mt-1">
                          {language === 'en'
                            ? 'Auto-resize to 1080p for optimal processing • Press Ctrl+V to paste'
                            : '自动调整为1080p以优化处理 • 按Ctrl+V粘贴'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* 独立的图片编辑功能区域 - 仅在非多图参考模式下显示 */}
                {generationMode !== 'multi-reference' && (
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
                        : '将多张图片拼合成自定义比例'}
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
                )}
              </CardContent>
            </Card>
          </motion.div>
          )}

          {/* 提示词输入 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card
              className="!bg-black/20 backdrop-blur-lg border-white/10 text-white h-full"
              data-card="gen-card"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-pink-400" />
                  {language === 'en' ? 'Prompt' : '提示词'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {isTextToImageMode
                    ? (language === 'en'
                        ? 'Describe the image you want to generate'
                        : '描述您想要生成的图片')
                    : (language === 'en'
                        ? 'Describe how you want to transform the image'
                        : '描述您希望如何转换图片')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 模型选择 */}
                <div>
                  <Label className="text-white/80">
                    {language === 'en' ? 'Model Selection' : '模型选择'}
                  </Label>
                  <Select
                    value={selectedModel}
                    onValueChange={(value: 'pro' | 'max' | 'gemini') => {
                      setSelectedModel(value)
                      
                      // 处理多图参考模式下的图片数量限制
                      if (generationMode === 'multi-reference' && referenceImages.length > 0) {
                        // 从 Gemini（3张）切换到 Flux（2张）时，保留前两张
                        if (value !== 'gemini' && referenceImages.length > 2) {
                          const keptImages = referenceImages.slice(0, 2)
                          setReferenceImages(keptImages)
                          
                          // 同步更新缓存（调用保存函数）
                          setTimeout(() => saveImageState(), 100)
                          
                          toast({
                            title: language === 'en' ? 'Images adjusted' : '图片已调整',
                            description: language === 'en' 
                              ? 'Kept first 2 images for Flux model' 
                              : '为 Flux 模型保留前 2 张图片',
                          })
                        }
                      }
                      
                      // 切换路由但保留当前状态
                      const modelPath =
                        value === 'pro'
                          ? 'flux-kontext-pro'
                          : value === 'max'
                            ? 'flux-kontext-max'
                            : 'gemini-2.5-flash-image'
                      router.push(`/${modelPath}`)
                    }}
                  >
                    <SelectTrigger className="mt-2 bg-white/5 border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/20">
                      <SelectItem value="pro" className="text-white">
                        <div className="flex items-center justify-between w-full">
                          <span>Flux Kontext Pro</span>
                          <span className="text-xs text-green-400 ml-2">10 积分</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="max" className="text-white">
                        <div className="flex items-center justify-between w-full">
                          <span>Flux Kontext Max</span>
                          <span className="text-xs text-orange-400 ml-2">20 积分</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="gemini" className="text-white">
                        <div className="flex items-center justify-between w-full">
                          <span>Nano Banana</span>
                          <span className="text-xs text-blue-400 ml-2">30 积分</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-white/60 mt-1">
                    {selectedModel === 'max'
                      ? language === 'en'
                        ? 'Max model provides higher quality results'
                        : 'Max 模型提供更高质量的结果'
                      : selectedModel === 'gemini'
                        ? language === 'en'
                          ? 'Gemini 2.5 Flash for advanced AI image generation'
                          : 'Gemini 2.5 Flash 高级AI图像生成'
                        : language === 'en'
                          ? 'Pro model for standard quality generation'
                          : 'Pro 模型用于标准质量生成'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="prompt" className="text-white/80">
                    {language === 'en' ? 'Transformation prompt' : '转换提示词'}
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder={
                      language === 'en'
                        ? 'Make this a 90s cartoon, cyberpunk style, oil painting...'
                        : '制作成90年代卡通风格、赛博朋克风格、油画风格...'
                    }
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
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
                              {language === 'en' ? 'Original:' : '原文:'} &ldquo;
                              {translationInfo.originalText}&rdquo;
                            </div>
                            <div className="text-green-400">
                              {language === 'en' ? 'Translated:' : '翻译:'} &ldquo;
                              {translationInfo.translatedText}&rdquo;
                            </div>
                            <div className="text-xs text-blue-400 mt-1">
                              {language === 'en'
                                ? `Detected language: ${getLanguageName(translationInfo.detectedLanguage)}`
                                : `检测语言: ${getLanguageName(translationInfo.detectedLanguage)}`}
                            </div>
                          </>
                        ) : (
                          <div className="text-green-400">
                            {language === 'en'
                              ? `Already in English (${getLanguageName(translationInfo.detectedLanguage)})`
                              : `已是英语 (${getLanguageName(translationInfo.detectedLanguage)})`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 生成按钮 */}
                <Button
                  onClick={handleGenerateClick}
                  disabled={
                    (generationMode === 'multi-reference' ? 
                      (selectedModel === 'gemini' ? (referenceImages.length === 0 || referenceImages.length > 3) : referenceImages.length !== 2) : 
                     generationMode === 'image-to-image' ? !inputImage : false) ||
                    !prompt.trim() ||
                    isGenerating ||
                    isProcessingImage ||
                    isTranslating ||
                    processingImageIndex !== null
                  }
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
                      {language === 'en' ? 'Generate' : '生成'}
                      <span className="ml-2 text-sm">
                        ({selectedModel === 'max' ? '20' : selectedModel === 'gemini' ? '30' : '10'}{' '}
                        {language === 'en' ? 'credits' : '积分'})
                      </span>
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
            <Card
              className="!bg-black/20 backdrop-blur-lg border-white/10 text-white h-full"
              data-card="gen-card"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  {language === 'en' ? 'Generated Output' : '生成结果'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {language === 'en'
                    ? 'Your AI-transformed image will appear here'
                    : 'AI转换后的图片将显示在这里'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <p className="text-white/80 text-center">
                      {language === 'en'
                        ? 'AI is processing your image...'
                        : 'AI正在处理您的图片...'}
                    </p>
                    <p className="text-sm text-white/60 text-center">
                      {language === 'en' ? 'This may take 5-10 seconds' : '这可能需要5-10秒'}
                    </p>
                  </div>
                ) : contentFlaggedError ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-16 h-16 border-2 border-orange-400/50 rounded-lg flex items-center justify-center bg-orange-500/10">
                      <Info className="w-8 h-8 text-orange-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold text-orange-400">
                        {language === 'en' ? 'Content Review Notice' : '内容审核提醒'}
                      </h3>
                      <p className="text-white/80 text-center max-w-md">{contentFlaggedError}</p>
                    </div>
                  </div>
                ) : generalError ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-16 h-16 border-2 border-red-400/50 rounded-lg flex items-center justify-center bg-red-500/10">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold text-red-400">
                        {language === 'en' ? 'Generation Failed' : '生成失败'}
                      </h3>
                      <p className="text-white/80 text-center max-w-md">{generalError}</p>
                    </div>
                  </div>
                ) : outputImage ? (
                  <div className="space-y-4">
                    <div className="relative group cursor-pointer" onClick={() => setViewingImage(outputImage)}>
                      <OutputImagePreview src={outputImage} onError={handleOutputImageError} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                        <div className="bg-black/70 backdrop-blur-sm rounded-full p-3">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    {isMobile ? (
                      <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-sm text-white/80 mb-2">
                          {language === 'en' ? 'To save image:' : '保存图片:'}
                        </p>
                        <p className="text-xs text-white/60">
                          {language === 'en'
                            ? 'Long press the image above and select "Save Image"'
                            : '长按上方图片并选择"保存图片"'}
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
                      {language === 'en'
                        ? 'Generated image will appear here'
                        : '生成的图片将显示在这里'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 生成历史和模型介绍选项卡 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12"
        >
          <Tabs
            value={activeTab}
            onValueChange={value => setActiveTab(value as 'history' | 'introduction')}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-black/20 backdrop-blur-lg border border-white/10">
                {session?.user && (
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70"
                  >
                    <History className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Generation History' : '生成历史'}
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="introduction"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Model Introduction' : '模型介绍'}
                </TabsTrigger>
              </TabsList>
              {/* Refresh button is now in OptimizedGenerationHistory component */}
            </div>

            {/* 历史记录选项卡 */}
            {session?.user && (
              <TabsContent value="history" className="mt-0">
                <OptimizedGenerationHistory 
                  onUseAsInput={(imageUrl, type, metadata) => {
                    if (type === 'input' || type === 'output') {
                      setHistoryImageAsInput(imageUrl, type === 'input', metadata)
                    }
                  }}
                  onRefreshReady={handleRefreshReady}
                />
              </TabsContent>
            )}

            {/* 模型介绍选项卡 */}
            <TabsContent value="introduction" className="mt-0">
              <Card
                className="!bg-black/20 backdrop-blur-lg border-white/10 text-white"
                data-card="gen-card"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
              >
                <CardContent className="p-6 space-y-6">
                  {initialModel === 'banana' ? (
                    // Nano Banana 介绍
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-4">
                        <span className="text-2xl mr-2">🍌</span>
                        {language === 'en' ? 'About Nano Banana' : '关于 Nano Banana'}
                      </h3>
                      <div className="prose prose-invert max-w-none space-y-4 text-white/90">
                        <p className="text-lg">
                          {language === 'en'
                            ? "🎉 Welcome to Nano Banana - where Google's cutting-edge AI meets playful creativity! This is the same powerful Gemini 2.5 Flash Image model, but with a fun twist that makes AI image editing feel like pure magic!"
                            : '🎉 欢迎来到 Nano Banana - 谷歌尖端AI技术与趣味创意的完美结合！这是强大的 Gemini 2.5 Flash Image 模型，但带着有趣的变化，让AI图像编辑感觉像纯粹的魔法！'}
                        </p>
                        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/30">
                          <h4 className="text-lg font-semibold mb-2 text-yellow-400">
                            🍌 {language === 'en' ? 'The Banana Philosophy' : '香蕉哲学'}
                          </h4>
                          <p>
                            {language === 'en'
                              ? "Why Nano Banana? Because AI doesn't have to be serious all the time! Just like peeling a banana, editing images should be simple, fun, and satisfying. Nano represents the cutting-edge technology, while Banana reminds us to keep things light and enjoyable."
                              : '为什么叫 Nano Banana？因为AI不必总是严肃的！就像剥香蕉一样，编辑图像应该简单、有趣且令人满足。Nano代表尖端技术，而Banana提醒我们保持轻松愉快。'}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-lg font-semibold mb-2">
                            ⚡{' '}
                            {language === 'en'
                              ? 'Banana Powers (Features):'
                              : '香蕉超能力（特性）：'}
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start">
                              <span className="text-yellow-400 mr-2">🍌</span>
                              <span>
                                {language === 'en'
                                  ? 'Mix & Match: Blend up to 3 images like a smoothie'
                                  : '混合搭配：像做奶昔一样混合最多3张图像'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-yellow-400 mr-2">🍌</span>
                              <span>
                                {language === 'en'
                                  ? 'Character Consistency: Keep your banana characters across scenes'
                                  : '角色一致性：在不同场景中保持你的香蕉角色'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-yellow-400 mr-2">🍌</span>
                              <span>
                                {language === 'en'
                                  ? 'Magic Edits: Remove, blur, or transform with banana-powered precision'
                                  : '魔法编辑：用香蕉之力精确移除、模糊或转换'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-yellow-400 mr-2">🍌</span>
                              <span>
                                {language === 'en'
                                  ? 'Color Magic: Turn black & white into vibrant banana yellow (and other colors!)'
                                  : '色彩魔法：将黑白变成充满活力的香蕉黄（还有其他颜色！）'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-yellow-400 mr-2">🍌</span>
                              <span>
                                {language === 'en'
                                  ? "Smart Creation: Powered by Google's world knowledge - but with banana flavor"
                                  : '智能创作：由谷歌的世界知识驱动 - 但带有香蕉风味'}
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4">
                          <p className="text-center text-lg">
                            {language === 'en'
                              ? '🎨 "Life is better when you\'re editing with bananas!" 🎨'
                              : '🎨 "用香蕉编辑，生活更美好！" 🎨'}
                          </p>
                        </div>
                        <p className="text-sm text-white/60 mt-4">
                          {language === 'en'
                            ? "Nano Banana is proudly powered by Google's Gemini 2.5 Flash Image technology. Visit the "
                            : 'Nano Banana 自豪地由谷歌的 Gemini 2.5 Flash Image 技术驱动。访问'}
                          <a
                            href="https://ainanobanana.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:underline"
                          >
                            {language === 'en'
                              ? 'official Nano Banana website'
                              : 'Nano Banana 官方网站'}
                          </a>
                          {language === 'en'
                            ? ' for more banana-powered fun!'
                            : '，获得更多香蕉动力的乐趣！'}
                        </p>
                      </div>
                    </div>
                  ) : selectedModel === 'pro' ? (
                    // Flux Kontext Pro 介绍
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-4">
                        {language === 'en' ? 'About FLUX.1 Kontext Pro' : '关于 FLUX.1 Kontext Pro'}
                      </h3>
                      <div className="prose prose-invert max-w-none space-y-4 text-white/90">
                        <p>
                          {language === 'en'
                            ? 'FLUX.1 Kontext Pro is an advanced in-context image generation model from Black Forest Labs. Unlike traditional text-to-image models, it allows you to prompt with both text and images for precise, context-aware editing.'
                            : 'FLUX.1 Kontext Pro 是Black Forest Labs的高级上下文图像生成模型。与传统的文本到图像模型不同，它允许您使用文本和图像进行提示，实现精确的上下文感知编辑。'}
                        </p>
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-lg font-semibold mb-2">
                            {language === 'en' ? 'Key Features:' : '主要特点：'}
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start">
                              <span className="text-purple-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'In-context image generation using text + image prompts'
                                  : '使用文本+图像提示的上下文图像生成'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-purple-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Character consistency across different scenes'
                                  : '不同场景中的角色一致性'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-purple-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Local editing of specific image elements'
                                  : '特定图像元素的局部编辑'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-purple-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Typography manipulation within images'
                                  : '图像内的文字排版操作'}
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                          <p className="text-sm">
                            {language === 'en'
                              ? 'Pro tip: FLUX.1 Kontext preserves relationships between image elements, allowing precise modifications like "Remove the thing from her face" or "She is now taking a selfie".'
                              : '专业提示：FLUX.1 Kontext 保留图像元素之间的关系，允许精确修改，如"从她脸上移除那个东西"或"她现在在自拍"。'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 pt-4">
                          <Link
                            href="https://bfl.ai/models/flux-kontext"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {language === 'en' ? 'Official Model Page' : '官方模型页面'}
                          </Link>
                          <Link
                            href="https://blackforestlabs.ai/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {language === 'en' ? 'Black Forest Labs' : 'Black Forest Labs'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : selectedModel === 'max' ? (
                    // Flux Kontext Max 介绍
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-4">
                        {language === 'en' ? 'About FLUX.1 Kontext Max' : '关于 FLUX.1 Kontext Max'}
                      </h3>
                      <div className="prose prose-invert max-w-none space-y-4 text-white/90">
                        <p>
                          {language === 'en'
                            ? 'FLUX.1 Kontext Max is the premium variant offering maximum performance for in-context image generation. It delivers the highest quality results with superior contextual understanding and image manipulation capabilities.'
                            : 'FLUX.1 Kontext Max 是提供最大性能的高级变体，用于上下文图像生成。它提供最高质量的结果，具有卓越的上下文理解和图像操作能力。'}
                        </p>
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-lg font-semibold mb-2">
                            {language === 'en' ? 'Key Features:' : '主要特点：'}
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start">
                              <span className="text-pink-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Maximum performance and quality'
                                  : '最大性能和质量'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-pink-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Advanced contextual understanding'
                                  : '高级上下文理解'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-pink-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Preserve style and character details across transformations'
                                  : '在转换过程中保留风格和角色细节'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-pink-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Support for complex iterative editing workflows'
                                  : '支持复杂的迭代编辑工作流'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-pink-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Premium quality for professional applications'
                                  : '专业应用的高级质量'}
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-pink-500/10 border border-pink-400/30 rounded-lg p-4">
                          <p className="text-sm">
                            {language === 'en'
                              ? 'FLUX.1 Kontext Max is ideal for professional workflows requiring the highest quality in-context image generation and editing with consistent character preservation.'
                              : 'FLUX.1 Kontext Max 非常适合需要最高质量上下文图像生成和编辑以及一致角色保留的专业工作流程。'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 pt-4">
                          <Link
                            href="https://bfl.ai/models/flux-kontext"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {language === 'en' ? 'Official Model Page' : '官方模型页面'}
                          </Link>
                          <Link
                            href="https://blackforestlabs.ai/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {language === 'en' ? 'Black Forest Labs' : 'Black Forest Labs'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Gemini 2.5 Flash 介绍
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-4">
                        {language === 'en'
                          ? 'About Nano Banana (Gemini 2.5 Flash Image)'
                          : '关于 Nano Banana (Gemini 2.5 Flash Image)'}
                      </h3>
                      <div className="prose prose-invert max-w-none space-y-4 text-white/90">
                        <p>
                          {language === 'en'
                            ? "Nano Banana is powered by Google's state-of-the-art Gemini 2.5 Flash Image model. It enables blending multiple images, maintaining character consistency, and performing targeted transformations using natural language - all with a playful twist!"
                            : 'Nano Banana 由 Google 最先进的 Gemini 2.5 Flash Image 模型驱动。它能够混合多张图像、保持角色一致性，并使用自然语言执行有针对性的转换 - 一切都带着趣味性！'}
                        </p>
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-lg font-semibold mb-2">
                            {language === 'en' ? 'Key Features:' : '主要特点：'}
                          </h4>
                          <ul className="space-y-2">
                            <li className="flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Blend up to 3 images into a single composition'
                                  : '将最多3张图像混合成一个组合'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Character consistency across different scenes'
                                  : '不同场景中的角色一致性'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Targeted edits: blur backgrounds, remove objects, change poses'
                                  : '定向编辑：模糊背景、移除对象、改变姿势'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? 'Add color to black and white images'
                                  : '为黑白图像添加色彩'}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>
                                {language === 'en'
                                  ? "Leverages Gemini's world knowledge for intelligent creation"
                                  : '利用Gemini的世界知识进行智能创作'}
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
                          <p className="text-sm">
                            {language === 'en'
                              ? '🍌 Nano Banana combines world knowledge with advanced image generation, enabling semantically intelligent creations and narrative sequences that maintain consistency across multiple generations - with a touch of banana magic!'
                              : '🍌 Nano Banana 结合世界知识与先进的图像生成技术，实现语义智能创作和叙事序列，在多次生成中保持一致性 - 还带着香蕉魔法！'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 pt-4">
                          <Link
                            href="https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {language === 'en' ? 'Developer Blog' : '开发者博客'}
                          </Link>
                          <Link
                            href="https://deepmind.google/models/gemini/image/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {language === 'en' ? 'DeepMind Page' : 'DeepMind 页面'}
                          </Link>
                          <Link
                            href="https://ai.google.dev/gemini-api/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {language === 'en' ? 'API Documentation' : 'API 文档'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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

      {/* 积分不足提醒 */}
      <ImageCreditsAlert 
        open={showCreditsAlert} 
        onOpenChange={setShowCreditsAlert}
        requiredCredits={requiredCreditsForAlert}
        currentCredits={creditsInfo?.credits || 0}
      />
      
      {/* 图片查看器 */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-6xl max-h-[90vh] w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewingImage}
                alt="Full size generated image"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-1">
                  <span className="text-sm text-white">
                    {language === 'en' ? 'Generated Image' : '生成的图片'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setViewingImage(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Close' : '关闭'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={downloadImage}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Download' : '下载'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
