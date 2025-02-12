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
  const debounceRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentQuestion = useMemo(() => questions[currentStep], [currentStep])

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target
      if (type === 'file') {
        const fileInput = e.target as HTMLInputElement
        const file = fileInput.files?.[0]
        if (file) {
          setFormData(prev => ({
            ...prev,
            [name]: file,
          }))
        }
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
        // 对于文件类型，检查是否是 File 对象
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
        // 使用 exifr 的特定选项
        translateValues: true,
        translateKeys: true,
        reviveValues: true,
        mergeOutput: false,
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

          // 修复类型错误：处理 blob 可能是数组的情况
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

          // 根据 EXIF 方向调整画布尺寸和变换
          let width = img.width
          let height = img.height
          const orientation = exifData?.Orientation || 1

          // 如果方向是 5-8，交换宽高
          if (orientation > 4) {
            [width, height] = [height, width]
          }

          canvas.width = width
          canvas.height = height

          // 根据方向应用适当的变换
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

          // 将画布转换为 Blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              URL.revokeObjectURL(imageUrl)
              throw new Error('Failed to convert canvas to blob')
            }

            // 创建新的处理后的文件
            processedFile = new File([blob], processedFile.name, {
              type: 'image/jpeg',
            })

            URL.revokeObjectURL(imageUrl)
            resolve(true)
          }, 'image/jpeg', 0.9)
        }
      })

      // 4. 上传处理后的文件
      const formData = new FormData()
      formData.append('file', processedFile)

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
          ...data.metadata,
          orientation: exifData?.Orientation,
          gps: exifData?.gps,
          name: formData.get('name') as string || '',
          loverName: formData.get('loverName') as string || '',
        },
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
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

      if (!session?.user?.id) {
        console.log('No user session found')
        toast({
          title: content[language].unauthorized,
          variant: 'destructive',
        })
        return
      }

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

        // 3. 生成请求 ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // 4. 创建信件记录
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
              ...uploadResult.metadata,
              name: formData.name || '',  // 添加用户名字
              loverName: formData.loverName || '',  // 添加收信人名字
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

        // 5. 跳转到结果页
        const letterData = {
          ...formData,
          blobUrl: uploadResult.blobUrl,
          metadata: uploadResult.metadata,
          timestamp: Date.now(),
          isGenerating: true,
          isComplete: false,
          fromHistory: false,
          letter: '',
          id: letterId,
        }

        // 保存状态到 localStorage
        localStorage.setItem('loveLetterData', JSON.stringify(letterData))

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
    [session?.user?.id, language, toast, router, formData, uploadPhotoAndPrepareData, triggerShake]
  )

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
                  <div className="flex items-center border-b-2 border-input py-2">
                    <Input
                      type="file"
                      name={currentQuestion.field}
                      onChange={handleInputChange}
                      accept="image/*,.heic"
                      className="hidden"
                      id="file-upload"
                      required
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-full text-sm font-medium"
                    >
                      Choose File
                    </label>
                    <span className="ml-3 text-sm text-gray-500">
                      {formData[currentQuestion.field] instanceof File
                        ? (formData[currentQuestion.field] as File).name
                        : 'No file chosen'}
                    </span>
                  </div>
                ) : (
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
    </div>
  )
}
