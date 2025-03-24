'use client'

import { CreditsAlert } from '@/components/CreditsAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
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
  const [selectedTemplate, setSelectedTemplate] = useState('classic')
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
      // 记录上传开始和原始文件信息
      console.log(`=== 图片上传开始 ===`);
      console.log(`原始文件: ${file.name}, 大小: ${(file.size/1024/1024).toFixed(2)}MB, 类型: ${file.type}`);
      
      // 1. 首先读取原始 EXIF 数据
      console.log(`正在提取EXIF数据...`);
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
      
      // 记录EXIF数据大小
      const exifDataStr = JSON.stringify(exifData);
      console.log(`EXIF数据大小: ${exifDataStr.length} 字符, ${(new TextEncoder().encode(exifDataStr).length/1024).toFixed(2)}KB`);
      
      if (exifData?.gps) {
        console.log(`包含GPS数据: ${JSON.stringify(exifData.gps).substring(0, 200)}${JSON.stringify(exifData.gps).length > 200 ? '...(已截断)' : ''}`);
      }

      // 2. 处理 HEIC 转换
      let processedFile = file
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        console.log(`检测到HEIC格式，开始转换...`);
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
          console.log(`HEIC转换完成，转换后大小: ${(processedFile.size/1024/1024).toFixed(2)}MB`);
        } catch (error) {
          console.error('Error converting HEIC:', error)
          throw new Error('Failed to convert HEIC image')
        }
      }

      // 3. 创建图片预览并应用正确的方向
      console.log(`创建图片预览并校正方向...`);
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

          console.log(`图片尺寸: ${width}x${height}, 方向: ${orientation}`);

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
            
            console.log(`图片方向校正完成，处理后大小: ${(processedFile.size/1024/1024).toFixed(2)}MB`);

            URL.revokeObjectURL(imageUrl)
            resolve(true)
          }, 'image/jpeg', 0.9)
        }
      })

      // 4. 准备元数据 - 简化结构，只保留最必要的信息
      console.log(`准备元数据...`);
      const metadata = {
        // 只保留方向信息和时间信息
        orientation: exifData?.Orientation,
        // GPS信息做最小化处理，只保留坐标
        gps: exifData?.gps?.latitude && exifData?.gps?.longitude ? {
          coordinates: {
            latitude: exifData.gps.latitude,
            longitude: exifData.gps.longitude,
          }
        } : undefined,
        // 只保留日期时间，不包含其他EXIF信息
        uploadTime: exifData?.DateTimeOriginal || undefined,
        // 简化上下文信息，减少传输数据量
        context: {
          // 只保留简化的设备信息
          device: navigator.userAgent.split(' ').slice(-1)[0]?.substring(0, 30),
        },
      }
      
      // 记录元数据大小
      const metadataStr = JSON.stringify(metadata);
      console.log(`准备的元数据大小: ${metadataStr.length} 字符, ${(new TextEncoder().encode(metadataStr).length/1024).toFixed(2)}KB`);
      console.log(`元数据内容: ${metadataStr}`);

      // 5. 上传处理后的文件
      console.log(`开始上传处理后的文件...`);
      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('metadata', JSON.stringify(metadata))
      
      // 记录FormData大小估计
      console.log(`处理后的文件大小: ${(processedFile.size/1024/1024).toFixed(2)}MB`);
      console.log(`FormData总估计大小: ${((processedFile.size + new TextEncoder().encode(JSON.stringify(metadata)).length)/1024/1024).toFixed(2)}MB`);

      console.log(`发送上传请求...`);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        console.error(`上传失败: 状态码 ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`错误详情: ${errorText.substring(0, 1000)}`);
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`上传成功，接收到响应数据大小: ${JSON.stringify(data).length} 字符`);
      console.log(`图片URL长度: ${data.url.length} 字符`);
      
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
      console.log('=== 提交处理开始 ===')

      // 完整的表单验证
      if (!formData.name?.trim()) {
        console.log('姓名为空，终止提交')
        toast({
          title: language === 'en' ? 'Name is required' : '请输入您的名字',
          description: language === 'en' ? 'Please enter your name to continue.' : '请输入您的名字后继续。',
          variant: "destructive"
        })
        setCurrentStep(0) // 跳转到姓名输入步骤
        return
      }
      
      if (!formData.photo) {
        console.log('照片未上传，终止提交')
        toast({
          title: language === 'en' ? 'Photo is required' : '请上传照片',
          description: language === 'en' ? 'Please upload a photo to continue.' : '请上传照片后继续。',
          variant: "destructive"
        })
        setCurrentStep(1) // 跳转到照片上传步骤
        return
      }
      
      if (!formData.loverName?.trim()) {
        console.log('对方姓名为空，终止提交')
        toast({
          title: language === 'en' ? 'Partner name is required' : '请输入对方的名字',
          description: language === 'en' ? 'Please enter your partner\'s name to continue.' : '请输入对方的名字后继续。',
          variant: "destructive"
        })
        setCurrentStep(2) // 跳转到对方姓名输入步骤
        return
      }

      if (!formData.story?.trim()) {
        console.log('故事内容为空，终止提交')
        toast({
          title: language === 'en' ? 'Story is required' : '请输入故事内容',
          description: language === 'en' ? 'Please share your story to continue.' : '请分享您的故事后继续。',
          variant: "destructive"
        })
        triggerShake()
        return
      }

      // 保存表单数据到localStorage，以便登录后恢复
      try {
        setIsSubmitting(true)
        
        console.log('上传照片开始...')
        // 1. 上传照片
        let uploadResult
        try {
          if (!formData.photo) {
            throw new Error('请上传照片')
          }
          
          console.log(`处理的照片: ${formData.photo.name}, 大小: ${(formData.photo.size/1024/1024).toFixed(2)}MB`)
          uploadResult = await uploadPhotoAndPrepareData(formData.photo)
          console.log('上传照片完成')
        } catch (error) {
          console.error('上传照片失败:', error)
          toast({
            title: language === 'en' ? 'Upload Failed' : '上传失败',
            description: language === 'en' ? 'Failed to upload photo' : '上传照片失败',
            variant: "destructive"
          })
          setIsSubmitting(false)
          return
        }

        // 2. 获取照片URL
        const { blobUrl: imageUrl, metadata: imageMetadata } = uploadResult
        
        console.log(`获取到的图片URL长度: ${imageUrl.length} 字符`)
        console.log(`元数据对象大小: ${JSON.stringify(imageMetadata).length} 字符`)

        // 3. 更新元数据
        const updatedMetadata = {
          ...imageMetadata,
          language,
          templateStyle: selectedTemplate,
        }
        
        console.log(`更新后的元数据大小: ${JSON.stringify(updatedMetadata).length} 字符`)

        // 4. 生成请求 ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // 添加计算请求大小的日志
        const requestBody = {
          name: formData.name || '',
          loverName: formData.loverName || '',
          story: formData.story || '',
          blobUrl: uploadResult.blobUrl,
          metadata: {
            ...updatedMetadata,
            name: formData.name || '',
            loverName: formData.loverName || '',
          },
        };
        
        // 计算整个请求体的大小
        const requestJson = JSON.stringify(requestBody);
        const totalSizeInBytes = new TextEncoder().encode(requestJson).length;
        const totalSizeInKB = totalSizeInBytes / 1024;
        const totalSizeInMB = totalSizeInKB / 1024;
        
        // 计算各部分大小
        const nameSizeBytes = new TextEncoder().encode(JSON.stringify(requestBody.name)).length;
        const loverNameSizeBytes = new TextEncoder().encode(JSON.stringify(requestBody.loverName)).length;
        const storySizeBytes = new TextEncoder().encode(JSON.stringify(requestBody.story)).length;
        const blobUrlSizeBytes = new TextEncoder().encode(JSON.stringify(requestBody.blobUrl)).length;
        const metadataSizeBytes = new TextEncoder().encode(JSON.stringify(requestBody.metadata)).length;
        
        // 输出详细的请求大小信息
        console.log('=== 请求体大小分析 ===');
        console.log(`总请求大小: ${totalSizeInBytes} 字节 (${totalSizeInKB.toFixed(2)} KB, ${totalSizeInMB.toFixed(2)} MB)`);
        console.log(`name 大小: ${nameSizeBytes} 字节`);
        console.log(`loverName 大小: ${loverNameSizeBytes} 字节`);
        console.log(`story 大小: ${storySizeBytes} 字节`);
        console.log(`blobUrl 大小: ${blobUrlSizeBytes} 字节`);
        console.log(`metadata 大小: ${metadataSizeBytes} 字节`);
        
        // 判断请求大小是否可能导致问题
        if (totalSizeInMB > 1) {
          console.warn(`警告: 请求大小 ${totalSizeInMB.toFixed(2)} MB 可能导致413错误!`);
          
          // 如果BlobURL特别大，输出更多调试信息
          if (blobUrlSizeBytes > 500000) {
            console.warn(`BlobURL 特别大 (${(blobUrlSizeBytes/1024/1024).toFixed(2)} MB)，可能是问题根源`);
            console.log(`BlobURL前100字符: ${requestBody.blobUrl.substring(0, 100)}...`);
          }
          
          // 如果元数据特别大，输出更详细内容
          if (metadataSizeBytes > 100000) {
            console.warn(`元数据特别大 (${(metadataSizeBytes/1024).toFixed(2)} KB)，可能是问题根源`);
            console.log('元数据详细内容:', requestBody.metadata);
          }
        }

        // 5. 创建信件记录
        console.log('开始发送生成请求...')
        const response = await fetch('/api/generate-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
          body: requestJson, // 使用已经计算过大小的JSON
          credentials: 'include',
        })
        
        console.log(`生成请求响应状态: ${response.status} ${response.statusText}`)

        // 处理可能的错误
        if (!response.ok) {
          console.error(`生成请求失败: ${response.status} ${response.statusText}`);
          // 尝试读取更详细的错误信息
          try {
            const errorText = await response.text();
            console.error(`错误详情: ${errorText.substring(0, 1000)}`);
          } catch (e) {
            console.error('无法获取错误详情:', e);
          }
          
          await handleErrorResponse(response)
          return
        }

        // 获取信件ID并跳转到结果页
        const generateData = await response.json()
        console.log('生成请求成功，获取到信件ID:', generateData.letterId)

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
          id: generateData.letterId,
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

        router.push(`/result/${generateData.letterId}`)
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
      
      // 注意：不再尝试恢复照片数据，因为我们不再在localStorage中保存它
      
      // 更新表单数据
      setFormData(updatedFormData);
      
      // 设置恢复标志
      setIsRestoringAfterLogin(true);
      
      // 清除localStorage中的数据
      localStorage.removeItem('pendingFormData');
      
      // 直接跳转到第四步（故事输入页面）
      setTimeout(() => {
        // 直接跳到第四步（故事页面）
        setCurrentStep(3);
        toast({
          title: language === 'en' ? 'Form data restored' : '表单数据已恢复',
          description: language === 'en'
            ? 'Your form has been restored. Please make sure to upload a photo before generating.'
            : '您的表单数据已恢复。请确保在生成前上传照片。',
          variant: 'default',
        });
        
        // 标记恢复流程完成
        setIsRestoringAfterLogin(false);
      }, 500);
    } catch (error) {
      console.error('Failed to restore form data:', error);
      setIsRestoringAfterLogin(false);
    }
  }, [formData, language, toast]);

  // 登录对话框关闭逻辑
  const handleLoginDialogClose = useCallback(() => {
    setShowLoginDialog(false);
    
    // 检查是否有存储的数据且用户已登录
    const hasPendingData = localStorage.getItem('hasFormDataPending') === 'true';
    if (hasPendingData && session) {
      console.log('Login dialog closed with pending form data, attempting to restore...');
      // 尝试恢复表单数据
      restoreFormDataAfterLogin();
      
      // 清除标记
      localStorage.removeItem('hasFormDataPending');
      
      // 清理URL参数，避免刷新页面时重复处理
      const newUrl = new URL(window.location.href);
      if (newUrl.searchParams.has('returnFrom')) {
        newUrl.searchParams.delete('returnFrom');
        window.history.replaceState({}, document.title, newUrl.toString());
      }
    }
  }, [session, restoreFormDataAfterLogin]);

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

  // 处理错误响应
  const handleErrorResponse = useCallback(async (response: Response) => {
    if (response.status === 401) {
      // 用户未登录，只保存基本表单数据
      try {
        // 只保存基本数据，不包括照片
        const basicData = {
          name: formData.name,
          loverName: formData.loverName,
          story: formData.story
        };
        
        // 保存处理后的表单数据
        localStorage.setItem('pendingFormData', JSON.stringify(basicData));
        console.log('基本表单数据已保存到localStorage (不含照片)');
        
        // 弹出登录框
        setShowLoginDialog(true);
        setIsSubmitting(false);
      } catch (err) {
        console.error('无法保存表单数据:', err);
        // 清除可能部分写入的数据
        localStorage.removeItem('pendingFormData');
        // 弹出登录框
        setShowLoginDialog(true);
        setIsSubmitting(false);
      }
    } else if (response.status === 402) {
      // 积分不足，弹出购买引导
      console.log('检测到402响应，积分不足，准备显示付费引导...');
      
      // 在显示积分警告前确保先重置提交状态
      setIsSubmitting(false);
      
      // 延迟一帧再设置弹窗状态，避免状态更新被批处理优化掉
      setTimeout(() => {
        console.log('设置showCreditsAlert为true');
        setShowCreditsAlert(true);
      }, 0);
      
      // 显示Toast提示用户
      toast({
        title: language === 'en' ? 'Credits Exceeded' : '创作配额不足',
        description: language === 'en' 
          ? 'You need more credits to generate letters.' 
          : '您需要更多点数来生成信件。',
        variant: "default"
      });
    } else {
      // 其他错误
      try {
        const errorData = await response.json();
        toast({
          title: language === 'en' ? 'Error' : '错误',
          description: errorData.message || (language === 'en' ? 'Failed to generate letter' : '生成信件失败'),
          variant: "destructive"
        });
      } catch (e) {
        toast({
          title: language === 'en' ? 'Error' : '错误',
          description: language === 'en' ? 'Failed to generate letter' : '生成信件失败',
          variant: "destructive"
        });
      }
      setIsSubmitting(false);
    }
  }, [formData, language, toast]);

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
          console.log('CreditsAlert onOpenChange:', open);
          setShowCreditsAlert(open);
          
          // 如果关闭了弹窗，且用户需要购买积分，可以导航到定价页面
          if (!open) {
            console.log('积分弹窗被关闭');
          }
        }}
      />

      <LoginDialog
        isOpen={showLoginDialog}
        onClose={handleLoginDialogClose}
      />
    </div>
  )
}
