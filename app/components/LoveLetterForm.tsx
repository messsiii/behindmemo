'use client'

import { CreditsAlert } from '@/components/CreditsAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { reverseGeocode } from '@/lib/geocode'
import { cn } from '@/lib/utils'
import exifr from 'exifr'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageUploadPreview } from './ImageUploadPreview'
import { LoginDialog } from './LoginDialog'

const content = {
  en: {
    title: 'Write a Love Letter',
    name: 'Your Name',
    loverName: 'Their Name',
    story: 'Your Story',
    generate: 'Generate',
    placeholder: 'Share your story here...',
    unauthorized: 'Please login to generate letters',
    error: 'Failed to generate letter',
    creditsError: 'Insufficient credits',
    creditsCheck: 'Checking credits...',
    enterHint: 'Press Enter to continue',
  },
  zh: {
    title: '写一封情书',
    name: '你的名字',
    loverName: '对方名字',
    story: '你们的故事',
    generate: '生成',
    placeholder: '在这里分享你们的故事...',
    unauthorized: '请登录后生成',
    error: '生成失败',
    creditsError: '创作配额不足',
    creditsCheck: '正在检查配额...',
    enterHint: '按回车键继续',
  },
} as const

// 定义表单字段类型
type FormField = 'name' | 'loverName' | 'story' | 'photo'

interface FormData {
  name: string
  loverName: string
  story: string
  photo: File
}

/* 保留以下接口用于未来功能扩展 */
// @ts-expect-error - 将来会使用
interface _ExifData {
  latitude?: number
  longitude?: number
  GPSLatitude?: number
  GPSLongitude?: number
  // ... 其他可能的 EXIF 数据字段
}

// @ts-expect-error - 将来会使用
interface _LocationInfo {
  formatted_address: string
  components: {
    country?: string
    state?: string
    city?: string
    district?: string
  }
}

const questions = [
  {
    id: 1,
    question: "What's your name?",
    field: 'name' as FormField, // 添加类型断言
    type: 'text',
    placeholder: 'Enter your name...',
  },
  {
    id: 2,
    question: 'Share a photo of your special moment',
    field: 'photo' as FormField,
    type: 'file',
  },
  {
    id: 3,
    question: "What's your lover's name?",
    field: 'loverName' as FormField,
    type: 'text',
    placeholder: "Enter your lover's name...",
  },
  {
    id: 4,
    question: 'Tell us your love story',
    field: 'story' as FormField,
    type: 'textarea',
    placeholder:
      'Share your beautiful moments together, how you met, or what makes your love special...',
  },
]

export default function LoveLetterForm() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showCreditsAlert, setShowCreditsAlert] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<FormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const debounceRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isRestoringAfterLogin, setIsRestoringAfterLogin] = useState(false)

  const currentQuestion = useMemo(() => questions[currentStep], [currentStep])

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileDevice = /iphone|ipad|ipod|android|mobile/.test(userAgent)
      setIsMobile(isMobileDevice)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target
      if (type === 'file') {
        const fileInput = e.target as HTMLInputElement
        const file = fileInput.files?.[0]
        setFormData(prev => ({
          ...prev,
          [name]: file || null // 确保当没有文件时设置为 null
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }))
      }
    },
    []
  )

  const triggerShake = useCallback(() => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }, [])

  const handleNext = useCallback(() => {
    if (debounceRef.current) return
    if (currentStep < questions.length - 1) {
      const currentField = questions[currentStep].field
      const currentValue = formData[currentField]

      // 检查当前字段是否有值
      if (
        currentValue &&
        // 对于文件类型，检查是否是有效的 File 对象
        ((currentField === 'photo' && currentValue instanceof File) ||
          // 对于其他类型，检查是否有非空字符串
          (currentField !== 'photo' &&
            typeof currentValue === 'string' &&
            currentValue.trim() !== ''))
      ) {
        debounceRef.current = true
        setTimeout(() => {
          debounceRef.current = false
        }, 300)
        setCurrentStep(prev => prev + 1)
      } else {
        triggerShake()
      }
    }
  }, [currentStep, formData, triggerShake])

  const handlePrevious = useCallback(() => {
    if (debounceRef.current) return
    if (currentStep > 0) {
      debounceRef.current = true
      setTimeout(() => {
        debounceRef.current = false
      }, 300)
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const uploadPhotoAndPrepareData = useCallback(async (file: File) => {
    try {
      // 1. 首先读取原始 EXIF 数据
      const exifData = await exifr.parse(file, {
        tiff: true,
        xmp: true,
        gps: true,
        translateValues: true,
        translateKeys: true,
        reviveValues: true,
        mergeOutput: false,
        exif: true,
      })

      // 2. 处理 HEIC 转换
      let processedFile = file
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        try {
          const heic2any = (await import('heic2any')).default
          const blob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
          })

          const convertedBlob = Array.isArray(blob) ? blob[0] : blob
          processedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
            type: 'image/jpeg',
          })
        } catch (error) {
          console.error('Error converting HEIC:', error)
          throw new Error('Failed to convert HEIC image')
        }
      }

      // 3. 创建图片预览并应用正确的方向
      const imageUrl = URL.createObjectURL(processedFile)
      const img = new Image()
      img.src = imageUrl

      await new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            URL.revokeObjectURL(imageUrl)
            throw new Error('Failed to get canvas context')
          }

          let width = img.width
          let height = img.height
          const orientation = exifData?.Orientation || 1

          if (orientation > 4) {
            [width, height] = [height, width]
          }

          canvas.width = width
          canvas.height = height

          ctx.save()
          switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, width, 0); break
            case 3: ctx.transform(-1, 0, 0, -1, width, height); break
            case 4: ctx.transform(1, 0, 0, -1, 0, height); break
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
            case 6: ctx.transform(0, 1, -1, 0, height, 0); break
            case 7: ctx.transform(0, -1, -1, 0, height, width); break
            case 8: ctx.transform(0, -1, 1, 0, 0, width); break
          }

          ctx.drawImage(img, 0, 0)
          ctx.restore()

          canvas.toBlob(async (blob) => {
            if (!blob) {
              URL.revokeObjectURL(imageUrl)
              throw new Error('Failed to convert canvas to blob')
            }

            processedFile = new File([blob], processedFile.name, {
              type: 'image/jpeg',
            })

            URL.revokeObjectURL(imageUrl)
            resolve(true)
          }, 'image/jpeg', 0.9)
        }
      })

      // 4. 准备元数据
      const metadata = {
        orientation: exifData?.Orientation,
        gps: exifData?.gps ? {
          coordinates: {
            latitude: exifData.gps.latitude,
            longitude: exifData.gps.longitude,
          },
          // 不再存储原始GPS区域信息
        } : undefined,
        uploadTime: exifData?.DateTimeOriginal || undefined,
        context: {
          // 限制设备信息长度
          uploadDevice: navigator.userAgent.substring(0, 100),
          screenSize: `${window.screen.width}x${window.screen.height}`,
          // 移除不必要的颜色深度信息
        },
      }

      // 5. 上传处理后的文件
      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('metadata', JSON.stringify(metadata))

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        blobUrl: data.url,
        metadata: {
          ...metadata,
          ...data.metadata,
        },
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }, [])

  // 修改handleSubmit函数中生成成功部分，确保生成成功后清除缓存
  const handleSubmitSuccess = useCallback(() => {
    // 清除临时表单数据
    localStorage.removeItem('pendingFormData')
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      console.log('Submit handler started')

      // 在最开始添加内容校验
      if (!formData.story?.trim()) {
        triggerShake()
        return
      }

      // 保存表单数据到localStorage，以便登录后恢复
      try {
        // 创建可序列化的表单数据
        const serializableFormData: any = {
          name: formData.name,
          loverName: formData.loverName,
          story: formData.story
        }
        
        // 如果有图片，将其转换为DataURL
        if (formData.photo instanceof File) {
          // 创建一个FileReader来将图片转换为DataURL
          const reader = new FileReader()
          
          // 将图片读取操作封装为Promise
          const readFileAsDataURL = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(formData.photo as Blob)
          })
          
          // 等待图片读取完成
          const dataURL = await readFileAsDataURL as string
          
          // 保存图片信息
          serializableFormData.photoInfo = {
            dataURL,
            name: formData.photo.name,
            type: formData.photo.type,
            size: formData.photo.size,
            lastModified: formData.photo.lastModified
          }
        }
        
        // 保存到localStorage
        localStorage.setItem('pendingFormData', JSON.stringify(serializableFormData))
      } catch (error) {
        console.error('Failed to save form data to localStorage:', error)
      }

      // 检查用户是否登录
      if (!session?.user?.id) {
        console.log('No user session found, showing login dialog')
        setShowLoginDialog(true)
        return
      }

      // 用户已登录，继续生成过程
      setIsLoading(true)
      setIsSubmitting(true)
      
      try {
        // 1. 检查配额
        const creditsResponse = await fetch('/api/user/credits')
        console.log('Credits response:', creditsResponse.status)

        if (!creditsResponse.ok) {
          console.error('Failed to check credits:', creditsResponse.statusText)
          throw new Error('Failed to check credits')
        }

        const creditsData = await creditsResponse.json()
        console.log('Credits data:', creditsData)

        // 如果配额不足，显示提示并终止
        if (!creditsData.isVIP && creditsData.credits <= 0) {
          console.log('Insufficient credits, showing alert')
          setShowCreditsAlert(true)
          setIsLoading(false)
          setIsSubmitting(false)
          return
        }

        console.log('Starting generation process...')
        // 2. 处理图片上传
        if (!(formData.photo instanceof File)) {
          throw new Error('Photo is required')
        }

        const uploadResult = await uploadPhotoAndPrepareData(formData.photo)
        console.log('Photo upload result:', uploadResult)

        // 3. 如果有 GPS 坐标，调用地理编码服务
        let locationInfo = null
        if (uploadResult.metadata.gps?.coordinates) {
          const { latitude, longitude } = uploadResult.metadata.gps.coordinates
          locationInfo = await reverseGeocode(latitude, longitude, language)
        }

        // 更新元数据，精简数据结构但保留关键信息
        const updatedMetadata = {
          // 保留基本信息
          orientation: uploadResult.metadata.orientation,
          // 精简GPS信息，只保留必要的地址和坐标
          gps: uploadResult.metadata.gps ? {
            coordinates: uploadResult.metadata.gps.coordinates,
            address: locationInfo?.address || '',
            // 不再包含整个components对象，只保留主要位置信息
            country: locationInfo?.components?.country || '',
            state: locationInfo?.components?.state || '',
            city: locationInfo?.components?.city || '',
            district: locationInfo?.components?.district || '',
          } : undefined,
          // 保留基本时间信息
          uploadTime: uploadResult.metadata.uploadTime,
          // 精简上下文信息
          context: {
            uploadDevice: navigator.userAgent.substring(0, 100), // 限制长度
            screenSize: `${window.screen.width}x${window.screen.height}`,
          },
          // 添加位置信息字段，与minimax.ts中使用相匹配
          location: locationInfo?.address || '',
          // 用户信息会在后续添加
        }

        // 4. 生成请求 ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // 5. 创建信件记录
        const response = await fetch('/api/generate-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
          body: JSON.stringify({
            name: formData.name || '',
            loverName: formData.loverName || '',
            story: formData.story || '',
            blobUrl: uploadResult.blobUrl,
            metadata: {
              ...updatedMetadata,
              name: formData.name || '',
              loverName: formData.loverName || '',
            },
          }),
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Generation failed:', errorData)
          toast({
            title: content[language].error,
            description: errorData.error || `Generation failed with status ${response.status}`,
            variant: 'destructive',
          })
          throw new Error(errorData.error || `Generation failed with status ${response.status}`)
        }

        const { letterId } = await response.json()
        if (!letterId) {
          throw new Error('No letter ID returned')
        }

        // 6. 跳转到结果页
        const letterData = {
          ...formData,
          blobUrl: uploadResult.blobUrl,
          metadata: updatedMetadata,
          timestamp: Date.now(),
          isGenerating: true,
          isComplete: false,
          fromHistory: false,
          letter: '',
          id: letterId,
        }

        // 保存状态到 localStorage
        localStorage.setItem('loveLetterData', JSON.stringify(letterData))

        // 清除临时表单数据
        handleSubmitSuccess()

        // 在路由跳转前停止音频
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }

        router.push(`/result/${letterId}`)
      } catch (error) {
        setIsLoading(false)
        setIsSubmitting(false)
        console.error('Error in submit handler:', error)
        toast({
          title: content[language].error,
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        })
      }
    },
    [
      session, 
      formData, 
      toast, 
      language, 
      router, 
      uploadPhotoAndPrepareData, 
      triggerShake, 
      setIsLoading, 
      setIsSubmitting, 
      setShowCreditsAlert,
      setShowLoginDialog,
      handleSubmitSuccess
    ]
  )
  
  // 登录对话框关闭逻辑
  const handleLoginDialogClose = useCallback(() => {
    setShowLoginDialog(false)
  }, [])

  // 提取恢复表单数据的逻辑为单独函数
  const restoreFormDataAfterLogin = useCallback(() => {
    try {
      // 从localStorage获取之前保存的表单数据
      const savedFormData = localStorage.getItem('pendingFormData');
      if (!savedFormData) {
        console.log('No saved form data found');
        return;
      }
      
      const parsedData = JSON.parse(savedFormData);
      if (!parsedData || (!parsedData.name && !parsedData.story)) {
        console.log('Invalid saved form data');
        return;
      }
      
      console.log('Restoring form data after login');
      
      // 恢复表单数据
      const updatedFormData = { ...formData };
      if (parsedData.name) updatedFormData.name = parsedData.name;
      if (parsedData.loverName) updatedFormData.loverName = parsedData.loverName;
      if (parsedData.story) updatedFormData.story = parsedData.story;
      
      // 恢复图片数据（如果有）
      if (parsedData.photoInfo && parsedData.photoInfo.dataURL) {
        try {
          console.log('Restoring photo from dataURL');
          // 从Base64数据URL创建Blob
          const dataURLParts = parsedData.photoInfo.dataURL.split(',');
          const mime = dataURLParts[0].match(/:(.*?);/)[1];
          const binaryString = atob(dataURLParts[1]);
          const binaryLen = binaryString.length;
          const bytes = new Uint8Array(binaryLen);
          
          for (let i = 0; i < binaryLen; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // 创建Blob
          const blob = new Blob([bytes], { type: mime });
          
          // 从Blob创建File对象
          const restoredFile = new File(
            [blob], 
            parsedData.photoInfo.name || 'restored-image.jpg', 
            { 
              type: parsedData.photoInfo.type || 'image/jpeg',
              lastModified: parsedData.photoInfo.lastModified || Date.now()
            }
          );
          
          // 将恢复的File对象设置到表单数据中
          updatedFormData.photo = restoredFile;
          console.log('Photo successfully restored');
        } catch (err) {
          console.error('Failed to restore photo from dataURL:', err);
        }
      }
      
      // 更新表单数据
      setFormData(updatedFormData);
      
      // 设置恢复标志
      setIsRestoringAfterLogin(true);
      
      // 清除localStorage中的数据
      localStorage.removeItem('pendingFormData');
      
      // 根据是否已恢复照片决定跳转到哪一步
      setTimeout(() => {
        if (updatedFormData.photo instanceof File) {
          // 如果照片已恢复，直接跳到第四步（故事/生成按钮页面）
          setCurrentStep(3);
          toast({
            title: language === 'en' ? 'Form data restored' : '表单数据已恢复',
            description: language === 'en' 
              ? 'Your form has been fully recovered. You can now generate your letter!' 
              : '您的表单已完全恢复。现在可以生成您的信件了！',
            variant: 'default',
          });
          
          // 标记恢复流程完成
          setIsRestoringAfterLogin(false);
        } else {
          // 如果没有恢复照片，跳到第二步（照片上传）
          setCurrentStep(1);
          toast({
            title: language === 'en' ? 'Please upload your photo again' : '请重新上传照片',
            description: language === 'en' 
              ? 'We couldn\'t save your photo during login. Please select it again.' 
              : '登录过程中无法保存您的照片，请重新选择。',
            variant: 'default',
          });
        }
      }, 500);
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
  }, [formData, language, toast, setCurrentStep, setFormData, setIsRestoringAfterLogin]);
  
  // 检测用户是否从登录返回
  useEffect(() => {
    // 检查组件是否已挂载且用户已登录
    if (mounted && session?.user?.id) {
      // 检查是否需要恢复表单数据（同时检查URL参数和localStorage标记）
      const params = new URLSearchParams(window.location.search);
      const hasLoginParam = params.get('returnFrom') === 'login';
      const hasPendingFlag = localStorage.getItem('hasFormDataPending') === 'true';
      const isReturningFromLogin = hasLoginParam || hasPendingFlag;
      
      // 如果是从登录返回，尝试恢复数据并清理URL参数
      if (isReturningFromLogin) {
        console.log('User returned from login, attempting to restore data');
        
        // 清除标记
        localStorage.removeItem('hasFormDataPending');
        
        // 如果有URL参数，清理它
        if (hasLoginParam) {
          // 移除URL参数，避免刷新页面时重复处理
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('returnFrom');
          
          // 使用history.replaceState更新URL而不刷新页面
          window.history.replaceState({}, document.title, newUrl.toString());
        }
        
        // 尝试恢复表单数据
        restoreFormDataAfterLogin();
      } else {
        // 非登录返回场景，清除缓存
        localStorage.removeItem('pendingFormData');
        localStorage.removeItem('hasFormDataPending');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, session]);

  // 初始化音频
  useEffect(() => {
    audioRef.current = new Audio('/heartbeat.mp3')
    audioRef.current.loop = true

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
    }
  }, [])

  // 处理音频播放
  useEffect(() => {
    if (isLoading && audioRef.current) {
      audioRef.current.play().catch(console.error)
    } else if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [isLoading])

  useEffect(() => {
    console.log('showCreditsAlert state changed:', showCreditsAlert)
  }, [showCreditsAlert])

  // 修改键盘事件处理，在移动端不处理
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (isMobile) return // 移动端不处理键盘事件

      // 获取当前焦点元素
      const activeElement = document.activeElement as HTMLElement
      const isFileInput = activeElement?.tagName === 'INPUT' && activeElement.getAttribute('type') === 'file'

      // 如果是文件输入框，阻止所有 Enter 键行为
      if (isFileInput) {
        e.preventDefault()
        return
      }

      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        currentQuestion.type !== 'textarea' &&
        !isSubmitting &&
        !debounceRef.current
      ) {
        e.preventDefault()
        
        // 如果当前是文件上传步骤，确保没有正在进行的上传
        if (currentQuestion.type === 'file') {
          // 检查是否已经选择了文件
          const hasFile = formData[currentQuestion.field] instanceof File
          if (!hasFile) {
            triggerShake()
            return
          }
        }

        handleNext()
      }
    },
    [currentQuestion.type, currentQuestion.field, formData, handleNext, isSubmitting, isMobile, triggerShake]
  )

  // 添加键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
    }
  }, [])

  // 监听照片上传状态，从登录恢复后用户上传照片时自动跳转到后续步骤
  useEffect(() => {
    // 只有当处于恢复模式且当前在照片上传步骤，且有照片数据时才处理
    const hasRestoredPhoto = isRestoringAfterLogin && 
                            currentStep === 1 && 
                            formData.photo instanceof File
    
    if (hasRestoredPhoto) {
      // 照片已上传，直接跳转到最后一步
      toast({
        title: language === 'en' ? 'Photo uploaded successfully!' : '照片上传成功！',
        description: language === 'en' 
          ? 'Taking you to the final step...' 
          : '正在跳转到最后一步...',
        variant: 'default',
      })
      
      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        // 直接跳到第四步（故事/生成页面）
        setCurrentStep(3)
        
        // 提示用户准备生成
        toast({
          title: language === 'en' ? 'Ready to generate' : '准备就绪',
          description: language === 'en' 
            ? 'You can now generate your letter!' 
            : '现在您可以生成您的信件了！',
          variant: 'default',
        })
        
        // 标记恢复完成
        setIsRestoringAfterLogin(false)
      }, 800)
    }
  }, [isRestoringAfterLogin, currentStep, formData.photo, language, toast])

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative" noValidate>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xl text-primary">{currentQuestion.id}</span>
                <motion.h2
                  className="text-3xl font-light"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentQuestion.question}
                </motion.h2>
              </div>

              <div className={cn(isShaking && 'animate-shake')}>
                {currentQuestion.type === 'textarea' ? (
                  <Textarea
                    name={currentQuestion.field}
                    value={
                      typeof formData[currentQuestion.field] === 'string'
                        ? (formData[currentQuestion.field] as string)
                        : ''
                    }
                    onChange={handleInputChange}
                    className="text-lg border-0 border-b-2 rounded-none bg-transparent focus:ring-0 resize-none min-h-[100px] [&:not(:focus)]:hover:border-b-2"
                    placeholder={currentQuestion.placeholder}
                    required
                    title=""
                  />
                ) : currentQuestion.type === 'file' ? (
                  <div className="space-y-4">
                    <ImageUploadPreview
                      onFileSelect={(file) => {
                        handleInputChange({
                          target: {
                            name: currentQuestion.field,
                            type: 'file',
                            files: [file],
                          },
                        } as any)
                      }}
                      onFileRemove={() => {
                        handleInputChange({
                          target: {
                            name: currentQuestion.field,
                            type: 'file',
                            files: [],
                          },
                        } as any)
                      }}
                      selectedFile={formData[currentQuestion.field] instanceof File ? formData[currentQuestion.field] as File : null}
                      className="w-full max-w-2xl mx-auto"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type={currentQuestion.type}
                      name={currentQuestion.field}
                      value={
                        typeof formData[currentQuestion.field] === 'string'
                          ? (formData[currentQuestion.field] as string)
                          : ''
                      }
                      onChange={handleInputChange}
                      className="text-lg border-0 border-b-2 rounded-none bg-transparent focus:ring-0 focus:border-primary [&:not(:focus)]:hover:border-b-2"
                      placeholder={currentQuestion.placeholder}
                      required
                      autoComplete="off"
                      title=""
                    />
                    {/* Enter 提示 - 只在桌面端显示 */}
                    {!isMobile && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="absolute right-0 -bottom-6 text-xs text-muted-foreground/70"
                      >
                        {content[language].enterHint}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {currentStep > 0 && (
                <Button
                  type="button"
                  onClick={handlePrevious}
                  className="rounded-full px-8"
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Previous
                </Button>
              )}
              <div className="relative">
                <Button
                  type={currentStep === questions.length - 1 ? 'submit' : 'button'}
                  onClick={currentStep === questions.length - 1 ? undefined : handleNext}
                  disabled={isSubmitting}
                  className="rounded-full px-8 relative z-10 transition-colors duration-300"
                >
                  {currentStep === questions.length - 1
                    ? isSubmitting
                      ? 'Generating...'
                      : 'Create Love Letter'
                    : 'Next'}
                </Button>
                {isSubmitting && (
                  <div className="absolute inset-0 -m-1">
                    <div className="absolute inset-0 rounded-full bg-primary/60 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full animate-ping bg-primary/50"></div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-[-60px] left-0 right-0">
          <div className="flex justify-center gap-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-12 rounded-full transition-colors duration-300 ${
                  index === currentStep ? 'bg-primary' : 'bg-primary/20'
                }`}
              />
            ))}
          </div>
        </div>
      </form>

      <CreditsAlert
        open={showCreditsAlert}
        onOpenChange={(open: boolean) => {
          console.log('CreditsAlert onOpenChange:', open)
          setShowCreditsAlert(open)
        }}
      />

      <LoginDialog
        isOpen={showLoginDialog}
        onClose={handleLoginDialogClose}
      />
    </div>
  )
}
